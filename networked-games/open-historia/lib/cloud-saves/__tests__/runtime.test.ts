import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayablesCloud } from '../../../../../apps/hub/src/cloud/runtime';
import type { CloudSave, SaveWrite } from '../contract';
class MemoryStorage implements Storage {
  data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}
const data = (chapter = 1) => JSON.stringify({ version: 1, savedAt: 123, state: { chapter } });
const cloud = (chapter = 2, revision = 1): CloudSave => ({
  gameId: 'ember-road',
  slotId: 'main',
  revision,
  checksum: `checksum-${revision}`,
  bytes: 100,
  schemaVersion: '1',
  metadata: { title: 'Journey' },
  updatedAt: 10,
  deleted: false,
  source: 'cloud',
  data: data(chapter),
});
const runtimes: PlayablesCloud[] = [];
afterEach(() => {
  for (const runtime of runtimes.splice(0)) runtime.dispose();
});
function setup(options: { signed?: boolean; save?: CloudSave | null; reject?: boolean } = {}) {
  const storage = new MemoryStorage();
  let owner = options.signed === false ? null : 'alice';
  let remote = options.save ?? null;
  const slots = new Map<string, CloudSave>();
  if (remote) slots.set('main', remote);
  const writes: { owner: string | null; body: SaveWrite }[] = [];
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (options.reject) throw new Error('offline');
    const url = new URL(String(input));
    if (url.pathname === '/api/player')
      return owner
        ? Response.json({
            user: { id: owner, name: owner, email: `${owner}@example.test` },
            csrfToken: `csrf-${owner}`,
          })
        : Response.json({}, { status: 401 });
    const slot = url.pathname.split('/').at(-1)!;
    const current = slots.get(slot) || null;
    if (init?.method === 'PUT') {
      const body = JSON.parse(String(init.body));
      writes.push({ owner, body });
      if (body.expectedRevision !== (current?.revision || 0))
        return Response.json({ reason: 'conflict' }, { status: 409 });
      remote = {
        ...cloud(1, (current?.revision || 0) + 1),
        slotId: url.pathname.split('/').at(-1)!,
        data: body.envelope.data,
      };
      slots.set(slot, remote);
      return Response.json({ ok: true, head: remote });
    }
    return current ? Response.json({ save: current }) : Response.json({}, { status: 404 });
  });
  const runtime = new PlayablesCloud({
    gameId: 'ember-road',
    maxSchemaVersion: 1,
    storage,
    fetch: fetcher as typeof fetch,
    location: { href: 'https://idle.aliveville.com/play/ember-road/', assign: vi.fn() },
  });
  runtimes.push(runtime);
  return {
    runtime,
    storage,
    fetcher,
    writes,
    setOwner(value: string | null) {
      owner = value;
    },
    setRemote(value: CloudSave | null) {
      remote = value;
      if (value) slots.set('main', value);
      else slots.delete('main');
    },
    getRemote(slot = 'main') {
      return slots.get(slot);
    },
  };
}
async function boot(f: ReturnType<typeof setup>, local: string | null = data()) {
  if (local) f.storage.setItem('save:game', local);
  expect(await f.runtime.loadData('save:game')).toBe(local);
  await vi.waitFor(() => expect(f.runtime.getState().phase).not.toBe('checking'));
}
describe('optional web account host', () => {
  it('boots local immediately and persists locally while every network operation fails', async () => {
    const f = setup({ reject: true });
    await boot(f);
    await f.runtime.saveData('save:game', data(3));
    expect(f.runtime.exportLocal()?.data).toBe(data(3));
    expect(f.runtime.getState().phase).toBe('offline');
  });
  it('offers the verified cached candidate after resume timeout and preserves all displaced copies', async () => {
    for (const choice of ['cloud', 'local', 'cached'] as const) {
      const f = setup({ save: cloud(2, 2) });
      const key = 'playables:v1:ember-road:alice:save:game';
      f.storage.setItem(
        key,
        JSON.stringify({
          data: data(9),
          owner: 'alice',
          slot: 'main',
          savedAt: 9,
          revision: 1,
          checksum: 'previous',
        })
      );
      f.storage.setItem(
        'playables:v1:resume:ember-road:save:game',
        JSON.stringify({ owner: 'alice' })
      );
      f.fetcher.mockRejectedValueOnce(new Error('identity timeout'));
      await boot(f);
      await vi.waitFor(() => expect(f.runtime.getState().phase).toBe('conflict'));
      expect(f.runtime.getState().conflict?.cached).toMatchObject({ owner: 'alice', savedAt: 9 });
      expect(JSON.parse(f.storage.getItem(key)!).data).toBe(data(9));
      await f.runtime.resolveConflict(choice);
      expect(JSON.parse(f.storage.getItem(key + ':recovery')!).data).toBe(data(9));
      expect(
        JSON.parse(f.storage.getItem('playables:v1:ember-road:guest:save:game:recovery')!).data
      ).toBe(data());
      if (choice === 'cached') {
        expect(f.runtime.exportLocal()?.data).toBe(data(9));
        expect(f.runtime.getState().reloadRequired).toBe(true);
        expect(f.writes).toHaveLength(0);
        const next = new PlayablesCloud({
          gameId: 'ember-road',
          maxSchemaVersion: 1,
          storage: f.storage,
          fetch: f.fetcher as typeof fetch,
          location: { href: 'https://idle.aliveville.com/play/ember-road/', assign: vi.fn() },
        });
        runtimes.push(next);
        expect(await next.loadData('save:game')).toBe(data(9));
        await vi.waitFor(() => expect(next.getState().paused).toBe(false));
        await next.checkpoint();
        expect(f.getRemote()?.data).toBe(data(9));
      }
    }
  });
  it('adopts the verified cloud receipt for identical account bytes after a lost acknowledgement', async () => {
    const f = setup({ save: cloud(3, 8) });
    const key = 'playables:v1:ember-road:alice:save:game';
    f.storage.setItem(
      key,
      JSON.stringify({
        data: data(3),
        owner: 'alice',
        slot: 'main',
        savedAt: 3,
        revision: 7,
        checksum: 'old-receipt',
      })
    );
    f.storage.setItem(
      'playables:v1:resume:ember-road:save:game',
      JSON.stringify({ owner: 'alice' })
    );
    expect(await f.runtime.loadData('save:game')).toBe(data(3));
    await vi.waitFor(() => expect(f.runtime.getState().phase).toBe('saved'));
    expect(f.runtime.getState().conflict).toBeNull();
    expect(JSON.parse(f.storage.getItem(key)!).revision).toBe(8);
    expect(f.writes).toHaveLength(0);
  });
  it('keeps War account scope and arbitrary cloud slot across a validated cross-mode restore and reload', async () => {
    const storage = new MemoryStorage();
    const war = (mode: string, gold: number) =>
      JSON.stringify({ version: 2, campaign: { mode, gold }, battle: {} });
    const guest = war('story', 1);
    const remoteData = war('original', 40);
    const slot = 'journey-copy-arbitrary-uuid';
    const remote = new Map<string, CloudSave>([
      [
        slot,
        { ...cloud(), gameId: 'war-chest', slotId: slot, schemaVersion: '2', data: remoteData },
      ],
    ]);
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === '/api/player')
        return Response.json({
          user: { id: 'alice', name: 'Alice', email: 'alice@example.test' },
          csrfToken: 'csrf',
        });
      const id = url.pathname.split('/').at(-1)!;
      if (init?.method === 'PUT') {
        const body = JSON.parse(String(init.body));
        const prior = remote.get(id);
        if (body.expectedRevision !== (prior?.revision || 0))
          return Response.json({}, { status: 409 });
        const head = {
          ...cloud(),
          gameId: 'war-chest' as const,
          slotId: id,
          schemaVersion: '2',
          data: body.envelope.data,
          revision: (prior?.revision || 0) + 1,
        };
        remote.set(id, head);
        return Response.json({ head });
      }
      return remote.has(id)
        ? Response.json({ save: remote.get(id) })
        : Response.json({}, { status: 404 });
    });
    const make = () => {
      const runtime = new PlayablesCloud({
        gameId: 'war-chest',
        maxSchemaVersion: 2,
        storage,
        fetch: fetcher as typeof fetch,
        location: { href: 'https://idle.aliveville.com/play/war-chest/', assign: vi.fn() },
      });
      runtimes.push(runtime);
      return runtime;
    };
    const first = make();
    first.registerRestoreRequest(async (data) => JSON.parse(data).campaign.mode);
    await first.captureExternal(guest, 'story');
    await vi.waitFor(() => expect(first.getState().phase).toBe('conflict'));
    await first.resolveConflict('local');
    await first.restore(slot);
    await first.resolveConflict('cloud');
    const latest = war('original', 55);
    await first.captureExternal(latest, 'original');
    await first.checkpoint();
    expect(first.getState().user?.id).toBe('alice');
    expect(first.getSlotId()).toBe(slot);
    expect(remote.get(slot)?.data).toBe(latest);
    first.dispose();
    const next = make();
    const applied: string[] = [];
    next.registerRestoreRequest(async (data) => {
      applied.push(data);
      return JSON.parse(data).campaign.mode;
    });
    await next.captureExternal(guest, 'story');
    await vi.waitFor(() => expect(next.getState().phase).toBe('saved'));
    expect(applied.at(-1)).toBe(latest);
    expect(next.getSlotId()).toBe(slot);
    expect(next.exportLocal()?.data).toBe(latest);
    expect(
      JSON.parse(storage.getItem('playables:v1:war-chest:guest:save:war-chest:story')!).data
    ).toBe(guest);
    expect(storage.getItem('playables:v1:war-chest:guest:save:war-chest:original')).toBeNull();
  });
  it('requires explicit import and uses a safe revision; keeps recovery bytes', async () => {
    const f = setup();
    await boot(f);
    expect(f.runtime.getState()).toMatchObject({
      phase: 'conflict',
      paused: true,
      conflict: { reason: 'import' },
    });
    expect(f.writes).toHaveLength(0);
    await f.runtime.resolveConflict('local');
    expect(f.writes).toHaveLength(1);
    expect(f.writes[0].body.expectedRevision).toBe(0);
    expect(f.runtime.getState().phase).toBe('saved');
    expect(f.runtime.exportRecovery()?.data).toBe(data());
  });
  it('never overwrites a divergent cloud run without a choice and restores backed-up local bytes', async () => {
    const f = setup({ save: cloud() });
    await boot(f);
    expect(f.runtime.getState().phase).toBe('conflict');
    expect(f.writes).toHaveLength(0);
    await f.runtime.resolveConflict('cloud');
    expect(f.runtime.getState()).toMatchObject({ reloadRequired: true, paused: true });
    expect(f.runtime.exportLocal()?.data).toBe(data(2));
    expect(f.runtime.exportRecovery()?.data).toBe(data());
    await f.runtime.saveData('save:game', data(9));
    expect(f.runtime.exportLocal()?.data).toBe(data(2));
  });
  it('creates a separate slot for keep-both and does not upload while playing offline', async () => {
    const f = setup({ save: cloud() });
    await boot(f);
    await f.runtime.resolveConflict('keep-both');
    expect(f.writes[0].body.expectedRevision).toBe(0);
    expect(f.runtime.getState().phase).toBe('saved');
    expect(f.getRemote()?.data).toBe(data(2));
    expect(f.runtime.exportRecovery()?.data).toBe(data());
    const g = setup({ save: cloud() });
    await boot(g);
    await g.runtime.resolveConflict('offline');
    await g.runtime.saveData('save:game', data(4));
    await g.runtime.checkpoint();
    expect(g.writes).toHaveLength(0);
    expect(g.runtime.getState().paused).toBe(false);
  });
  it('protects newer cloud and local schema versions from a downgraded client', async () => {
    const newer = {
      ...cloud(),
      schemaVersion: '2',
      data: JSON.stringify({ version: 2, savedAt: 1, state: { chapter: 4 } }),
    };
    const f = setup({ save: newer });
    await boot(f);
    expect(f.runtime.getState()).toMatchObject({ phase: 'update-required', paused: true });
    await f.runtime.checkpoint();
    expect(f.writes).toHaveLength(0);
    const g = setup({ signed: false });
    await boot(g, newer.data);
    await g.runtime.saveData('save:game', data());
    expect(g.runtime.exportLocal()?.data).toBe(newer.data);
  });
  it('keeps account namespaces separate and requires consent before moving A progress to B', async () => {
    const f = setup();
    await boot(f);
    await f.runtime.resolveConflict('local');
    const count = f.writes.length;
    f.setOwner('bob');
    f.setRemote(null);
    await f.runtime.refreshSession();
    expect(f.runtime.getState()).toMatchObject({
      user: { id: 'bob' },
      phase: 'conflict',
      conflict: { reason: 'account-changed', local: { owner: 'alice' } },
    });
    await f.runtime.checkpoint();
    expect(f.writes).toHaveLength(count);
    await f.runtime.resolveConflict('offline');
    await f.runtime.saveData('save:game', data(8));
    expect([...f.storage.data.keys()].some((key) => key.includes(':bob:'))).toBe(false);
  });
  it('ignores an old accounts delayed acknowledgement after switching sessions', async () => {
    const f = setup();
    await boot(f);
    await f.runtime.resolveConflict('local');
    const original = f.fetcher.getMockImplementation()!;
    let release!: (response: Response) => void;
    let held: Response | undefined;
    const deferred = new Promise<Response>((resolve) => {
      release = resolve;
    });
    f.fetcher.mockImplementation(async (input, init) => {
      const response = await original(input, init);
      if (init?.method === 'PUT') {
        held = response;
        return deferred;
      }
      return response;
    });
    await f.runtime.saveData('save:game', data(3));
    const saving = f.runtime.checkpoint();
    await vi.waitFor(() => expect(held).toBeDefined());
    f.setOwner('bob');
    f.setRemote(null);
    await f.runtime.refreshSession();
    expect(f.runtime.getState()).toMatchObject({
      user: { id: 'bob' },
      phase: 'conflict',
      cloudAcknowledgedAt: null,
    });
    release(held!);
    await saving;
    expect(f.runtime.getState()).toMatchObject({
      user: { id: 'bob' },
      phase: 'conflict',
      cloudAcknowledgedAt: null,
    });
  });
  it('resumes the explicitly selected account bytes after a fresh host instance without another conflict', async () => {
    const f = setup({ save: cloud() });
    await boot(f);
    await f.runtime.resolveConflict('cloud');
    f.runtime.dispose();
    const next = new PlayablesCloud({
      gameId: 'ember-road',
      maxSchemaVersion: 1,
      storage: f.storage,
      fetch: f.fetcher as typeof fetch,
      location: { href: 'https://idle.aliveville.com/play/ember-road/', assign: vi.fn() },
    });
    runtimes.push(next);
    expect(await next.loadData('save:game')).toBe(data(2));
    await vi.waitFor(() => expect(next.getState().phase).toBe('saved'));
    expect(next.getState().conflict).toBeNull();
    next.dispose();
    f.setOwner('bob');
    const other = new PlayablesCloud({
      gameId: 'ember-road',
      maxSchemaVersion: 1,
      storage: f.storage,
      fetch: f.fetcher as typeof fetch,
      location: { href: 'https://idle.aliveville.com/play/ember-road/', assign: vi.fn() },
    });
    runtimes.push(other);
    expect(await other.loadData('save:game')).toBe(data());
    expect(other.exportLocal()?.data).not.toBe(data(2));
  });
  it('composes pause subscriptions and takes a fresh requested checkpoint before account choices', async () => {
    const f = setup();
    const saves = vi.fn(async () => {
      await f.runtime.saveData('save:game', data(5));
    });
    await boot(f);
    f.runtime.registerSaveRequest(saves);
    const pauses: boolean[] = [];
    f.runtime.onPauseChange((value) => pauses.push(value));
    await f.runtime.resolveConflict('local');
    expect(saves).toHaveBeenCalled();
    expect(JSON.parse(f.writes[0].body.envelope.data).state.chapter).toBe(5);
    expect(pauses).toEqual([true, false]);
  });
});

describe('account panel and recovery operations', () => {
  it('pauses game motion without blocking an explicit checkpoint, and preserves a conflict pause on close', async () => {
    const f = setup();
    await boot(f);
    await f.runtime.resolveConflict('local');
    f.runtime.setPanelOpen(true);
    expect(f.runtime.getState().paused).toBe(true);
    await f.runtime.saveData('save:game', data(4));
    await f.runtime.checkpoint();
    expect(f.writes).toHaveLength(2);
    expect(JSON.parse(f.writes[1].body.envelope.data).state.chapter).toBe(4);
    expect(f.runtime.getState().paused).toBe(true);
    f.runtime.setPanelOpen(false);
    expect(f.runtime.getState().paused).toBe(false);
    f.setRemote(cloud(8, 9));
    await f.runtime.restore('main');
    f.runtime.setPanelOpen(true);
    f.runtime.setPanelOpen(false);
    expect(f.runtime.getState()).toMatchObject({ phase: 'conflict', paused: true });
  });
  it('rejects an old account choice if the account changes while its fresh checkpoint is pending', async () => {
    const f = setup();
    await boot(f);
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let snapshots = 0;
    f.runtime.registerSaveRequest(async () => {
      if (++snapshots === 1) await pending;
    });
    const choice = f.runtime.resolveConflict('local');
    await vi.waitFor(() => expect(snapshots).toBe(1));
    f.setOwner('bob');
    await f.runtime.refreshSession();
    release();
    await expect(choice).rejects.toThrow('Account changed');
    expect(f.writes).toHaveLength(0);
    expect(f.runtime.getState().user?.id).toBe('bob');
  });
  it('restores a historical checkpoint through a new conditional cloud revision and retains local recovery', async () => {
    const f = setup();
    await boot(f);
    await f.runtime.resolveConflict('local');
    const old = f.getRemote()!;
    f.setRemote(cloud(4, 2));
    const original = f.fetcher.getMockImplementation()!;
    f.fetcher.mockImplementation(async (input, init) => {
      const path = new URL(String(input)).pathname;
      if (path.endsWith('/history')) return Response.json({ history: [old] });
      if (path.endsWith('/restore')) {
        expect(JSON.parse(String(init?.body))).toMatchObject({ revision: 1, expectedRevision: 2 });
        f.setRemote({ ...old, revision: 3 });
        return Response.json({ ok: true });
      }
      return original(input, init);
    });
    await f.runtime.restoreVersion('main', 1);
    expect(f.runtime.getState()).toMatchObject({ reloadRequired: true, paused: true });
    expect(f.runtime.exportLocal()?.data).toBe(old.data);
    expect(f.runtime.exportRecovery()?.data).toBe(data());
  });
  it('does not publish a history version that needs a newer game', async () => {
    const f = setup();
    await boot(f);
    await f.runtime.resolveConflict('local');
    const original = f.fetcher.getMockImplementation()!;
    const restore = vi.fn();
    f.fetcher.mockImplementation(async (input, init) => {
      const path = new URL(String(input)).pathname;
      if (path.endsWith('/history'))
        return Response.json({ history: [{ ...cloud(), schemaVersion: '2' }] });
      if (path.endsWith('/restore')) restore();
      return original(input, init);
    });
    await expect(f.runtime.restoreVersion('main', 1)).rejects.toThrow('Update the game');
    expect(restore).not.toHaveBeenCalled();
  });
});
