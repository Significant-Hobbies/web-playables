import { afterEach, describe, expect, it } from 'vitest';
import { sqliteD1 } from './sqlite-d1';
import { SaveRepository } from '../repository';
import {
  checksum,
  HISTORY_LIMIT,
  MAX_RETAINED_BYTES,
  MAX_SLOTS,
  parseWrite,
  type SaveWrite,
} from '../contract';
const databases: ReturnType<typeof sqliteD1>[] = [];
function setup(options: Parameters<typeof sqliteD1>[0] = {}) {
  const fixture = sqliteD1(options);
  databases.push(fixture);
  return { ...fixture, repository: new SaveRepository(fixture.db) };
}
afterEach(() => {
  for (const f of databases.splice(0)) f.sqlite.close();
});
function input(revision = 0, text = 'first', writeId = crypto.randomUUID()): SaveWrite {
  return parseWrite('ember-road', {
    expectedRevision: revision,
    writeId,
    envelope: {
      schemaVersion: '1',
      metadata: { title: 'Journey' },
      data: JSON.stringify({ version: 1, savedAt: 123, state: { text } }),
    },
  })!;
}
describe('transactional player snapshots', () => {
  it('round trips multi-chunk UTF-8 bytes with checksum and isolates every owner read', async () => {
    const { repository } = setup();
    const value = input(0, '🗡️'.repeat(120000));
    const result = await repository.write('alice', 'ember-road', 'main', value);
    expect(result.ok).toBe(true);
    expect((await repository.read('alice', 'ember-road', 'main'))?.data).toBe(value.envelope.data);
    expect(await repository.read('bob', 'ember-road', 'main')).toBeNull();
    expect(await repository.history('bob', 'ember-road', 'main')).toEqual([]);
    expect(await repository.list('bob', 'ember-road')).toEqual([]);
    expect((await repository.write('bob', 'ember-road', 'main', input())).ok).toBe(true);
  });
  it('allows one writer per revision and makes retries idempotent without orphan chunks', async () => {
    const { repository, sqlite } = setup();
    const a = input(0, 'a'),
      b = input(0, 'b');
    // Reads may race; D1 batches serialize the actual conditional mutation.
    const results = await Promise.all([
      repository.write('alice', 'ember-road', 'main', a),
      repository.write('alice', 'ember-road', 'main', b),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.reason === 'conflict')).toHaveLength(1);
    const winner = results[0].ok ? a : b;
    const retry = await repository.write('alice', 'ember-road', 'main', winner);
    expect(retry).toMatchObject({ ok: true, duplicate: true });
    expect(
      await repository.write('alice', 'ember-road', 'main', input(0, 'different', winner.writeId))
    ).toMatchObject({ ok: false, reason: 'write-id-reused' });
    expect(sqlite.prepare('SELECT COUNT(*) n FROM account_game_version').get()?.n).toBe(1);
    expect(sqlite.prepare('SELECT COUNT(*) n FROM account_game_chunk').get()?.n).toBe(1);
  });
  it('rolls back the head and version when a chunk write fails', async () => {
    const { repository, sqlite } = setup();
    await repository.write('alice', 'ember-road', 'main', input());
    sqlite.exec(
      "CREATE TRIGGER fail_chunk BEFORE INSERT ON account_game_chunk WHEN NEW.revision=2 BEGIN SELECT RAISE(ABORT,'injected failure'); END"
    );
    await expect(repository.write('alice', 'ember-road', 'main', input(1, 'new'))).rejects.toThrow(
      'injected failure'
    );
    expect((await repository.read('alice', 'ember-road', 'main'))?.revision).toBe(1);
    expect(await repository.history('alice', 'ember-road', 'main')).toHaveLength(1);
  });
  it('bounds history and retained slot ids while allowing safe tombstone reuse', async () => {
    const { repository } = setup();
    for (let i = 0; i < HISTORY_LIMIT + 2; i++)
      expect((await repository.write('alice', 'ember-road', 'main', input(i, String(i)))).ok).toBe(
        true
      );
    expect(await repository.history('alice', 'ember-road', 'main')).toHaveLength(HISTORY_LIMIT);
    expect(await repository.write('alice', 'ember-road', 'main', input(1, 'stale'))).toMatchObject({
      ok: false,
      reason: 'conflict',
    });
    const current = await repository.read('alice', 'ember-road', 'main');
    expect(current?.revision).toBe(HISTORY_LIMIT + 2);
    expect(
      (await repository.write('alice', 'ember-road', 'main', input(current!.revision), true)).ok
    ).toBe(true);
    expect(await repository.read('alice', 'ember-road', 'main')).toBeNull();
    for (let i = 0; i < MAX_SLOTS - 1; i++)
      expect((await repository.write('alice', 'ember-road', `slot-${i}`, input())).ok).toBe(true);
    expect(
      (await repository.write('alice', 'ember-road', 'main', input(HISTORY_LIMIT + 3))).ok
    ).toBe(true);
    expect(await repository.write('alice', 'ember-road', 'one-too-many', input())).toMatchObject({
      ok: false,
      reason: 'quota',
    });
  });
  it('enforces retained byte quota inside the conditional transaction without changing the head', async () => {
    const { repository, sqlite } = setup();
    await repository.write('alice', 'ember-road', 'main', input());
    // Metadata fixture reaches the quota without allocating 128 MiB: production chunks are tested above.
    sqlite.prepare('UPDATE account_game_version SET byte_count=?').run(MAX_RETAINED_BYTES);
    const before = sqlite.prepare('SELECT * FROM account_game_slot').get();
    expect(await repository.write('alice', 'ember-road', 'main', input(1, 'b'))).toMatchObject({
      ok: false,
      reason: 'quota',
    });
    expect(sqlite.prepare('SELECT * FROM account_game_slot').get()).toEqual(before);
    expect(await repository.history('alice', 'ember-road', 'main')).toHaveLength(1);
  });
  it('serializes aggregate quota across two different slots racing from the same retained-byte base', async () => {
    let enabled = false;
    let arrivals = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { repository, sqlite } = setup({
      beforeBatch: async () => {
        if (!enabled) return;
        if (++arrivals === 2) release();
        await gate;
      },
    });
    await repository.write('alice', 'ember-road', 'base', input());
    const value = input();
    const size = new TextEncoder().encode(value.envelope.data).length;
    sqlite.prepare('UPDATE account_game_version SET byte_count=?').run(MAX_RETAINED_BYTES - size);
    enabled = true;
    const results = await Promise.all([
      repository.write('alice', 'ember-road', 'left', value),
      repository.write('alice', 'ember-road', 'right', input()),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok && result.reason === 'quota')).toHaveLength(1);
    expect(sqlite.prepare('SELECT SUM(byte_count) n FROM account_game_version').get()?.n).toBe(
      MAX_RETAINED_BYTES
    );
  });
  it('rehearses additive migration over an existing legacy campaign without changing its bytes', async () => {
    const original = '{"turn":8,"unknownFutureField":{"preserve":[1,2,3]}}';
    const fixture = sqliteD1({
      beforeMigration(sqlite) {
        sqlite.exec(
          "INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt) VALUES('alice','Alice','alice@example.test',1,1,1)"
        );
        sqlite
          .prepare(
            'INSERT INTO saved_game(id,user_id,timestamp,version,game_state_json,game_config_json) VALUES(?,?,?,?,?,?)'
          )
          .run('prior-campaign', 'alice', 1, '3.2.0', original, '{"provider":"local"}');
      },
    });
    databases.push(fixture);
    expect(
      fixture.sqlite.prepare('SELECT game_state_json,cloud_revision FROM saved_game').get()
    ).toMatchObject({ game_state_json: original, cloud_revision: 0 });
    const repository = new SaveRepository(fixture.db);
    expect((await repository.read('alice', 'open-historia', 'prior-campaign'))?.source).toBe(
      'legacy'
    );
  });
  it('preserves existing Historia rows, unknown game fields, and requires the read checksum to adopt them', async () => {
    const { repository, sqlite } = setup();
    sqlite
      .prepare(
        `INSERT INTO saved_game(id,user_id,timestamp,version,game_state_json,game_config_json,logs_json,events_json,cloud_revision) VALUES(?,?,?,?,?,?,?,?,1)`
      )
      .run(
        'legacy',
        'alice',
        100,
        '3.2.0',
        JSON.stringify({ turn: 8, futureField: { keep: true } }),
        JSON.stringify({
          scenario: 'Rome',
          apiKey: 'private',
          nested: { token: 'private', keep: 1 },
        }),
        '[]',
        '[]'
      );
    const legacy = await repository.read('alice', 'open-historia', 'legacy');
    expect(legacy).toMatchObject({ revision: 0, source: 'legacy' });
    expect(JSON.parse(legacy!.data)).toMatchObject({
      gameState: { futureField: { keep: true } },
      gameConfig: { nested: { keep: 1 } },
    });
    expect(legacy!.data).not.toContain('private');
    const value = {
      ...input(),
      envelope: { schemaVersion: '3.2.0', data: legacy!.data, metadata: { title: 'Rome' } },
    };
    expect(await repository.write('alice', 'open-historia', 'legacy', value)).toMatchObject({
      ok: false,
      reason: 'conflict',
    });
    expect(
      await repository.write('alice', 'open-historia', 'legacy', { ...value, createOnly: true })
    ).toMatchObject({ ok: true, duplicate: true });
    expect(
      (
        await repository.write('alice', 'open-historia', 'legacy', {
          ...value,
          expectedChecksum: legacy!.checksum,
        })
      ).ok
    ).toBe(true);
    expect(
      sqlite.prepare('SELECT game_config_json FROM saved_game WHERE id=?').get('legacy')
        ?.game_config_json
    ).toContain('private');
    expect(await repository.read('bob', 'open-historia', 'legacy')).toBeNull();
  });
  it('never overwrites imports and restores an old version by a new revision', async () => {
    const { repository } = setup();
    const a = input();
    await repository.write('alice', 'ember-road', 'main', a);
    await repository.write('alice', 'ember-road', 'main', input(1, 'second'));
    expect(
      await repository.write('alice', 'ember-road', 'main', {
        ...input(0, 'import'),
        createOnly: true,
      })
    ).toMatchObject({ ok: false, reason: 'conflict' });
    const old = await repository.readRevision('alice', 'ember-road', 'main', 1);
    expect(old?.checksum).toBe(await checksum(a.envelope.data));
    await repository.write('alice', 'ember-road', 'main', {
      ...input(2),
      envelope: { schemaVersion: old!.schemaVersion, data: old!.data, metadata: old!.metadata },
    });
    expect((await repository.read('alice', 'ember-road', 'main'))?.data).toBe(old!.data);
    expect(await repository.history('alice', 'ember-road', 'main')).toHaveLength(3);
  });
  it('fences a rolled-back legacy writer without modifying preserved campaigns', () => {
    const { sqlite } = setup();
    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO saved_game(id,user_id,timestamp,game_state_json,game_config_json) VALUES('old','alice',1,'{}','{}')`
        )
        .run()
    ).toThrow('must upgrade');
    sqlite.exec(
      `INSERT INTO saved_game(id,user_id,timestamp,game_state_json,game_config_json,cloud_revision) VALUES('old','alice',1,'{}','{}',1)`
    );
    expect(() =>
      sqlite.exec(`UPDATE saved_game SET game_state_json='{"turn":99}' WHERE id='old'`)
    ).toThrow('must upgrade');
    expect(sqlite.prepare('SELECT game_state_json FROM saved_game').get()?.game_state_json).toBe(
      '{}'
    );
  });
  it('limits write requests and prunes only the calling users old rate rows', async () => {
    const { repository, sqlite } = setup();
    for (let i = 0; i < 60; i++) expect(await repository.allowWrite('alice')).toBe(true);
    expect(await repository.allowWrite('alice')).toBe(false);
    expect(await repository.allowWrite('bob')).toBe(true);
    sqlite.exec("INSERT INTO account_save_budget VALUES('alice',0,1),('bob',0,1)");
    await repository.allowWrite('alice');
    expect(
      sqlite.prepare('SELECT COUNT(*) n FROM account_save_budget WHERE minute=0').get()?.n
    ).toBe(1);
  });
});
