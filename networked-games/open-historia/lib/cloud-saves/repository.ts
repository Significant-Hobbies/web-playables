import {
  checksum,
  CHUNK_BYTES,
  HISTORY_LIMIT,
  MAX_RETAINED_BYTES,
  MAX_SAVE_BYTES,
  MAX_SLOTS,
  MAX_SLOT_RECORDS,
  normalizePayload,
  parseMetadata,
  type CloudSave,
  type GameId,
  type SaveHead,
  type SaveMetadata,
  type SaveWrite,
  type WriteResult,
} from './contract';

type HeadRow = {
  game_id: GameId;
  slot_id: string;
  revision: number;
  write_id: string;
  checksum: string;
  byte_count: number;
  schema_version: string;
  metadata_json: string;
  deleted: number;
  updated_at: number;
  created_at: number;
};
type LegacyRow = {
  id: string;
  name: string | null;
  timestamp: number;
  version: string;
  game_state_json: string;
  game_config_json: string;
  logs_json: string;
  events_json: string;
  story_so_far: string | null;
  scenario: string | null;
  player_nation_id: string | null;
  provider: string | null;
  model: string | null;
  difficulty: string | null;
  turn: number | null;
  updated_at: number | null;
};

function head(row: HeadRow): SaveHead {
  const metadata = parseMetadata(JSON.parse(row.metadata_json));
  if (!metadata) throw new Error('Invalid stored save metadata');
  return {
    gameId: row.game_id,
    slotId: row.slot_id,
    revision: row.revision,
    checksum: row.checksum,
    bytes: row.byte_count,
    schemaVersion: row.schema_version,
    metadata,
    updatedAt: row.updated_at,
    deleted: row.deleted === 1,
    source: 'cloud',
  };
}
function legacyMetadata(row: LegacyRow): SaveMetadata {
  return {
    title: (row.name || row.scenario || 'Saved campaign').slice(0, 100),
    ...(row.turn !== null ? { turn: row.turn } : {}),
    ...(row.scenario ? { scenario: row.scenario.slice(0, 500) } : {}),
    ...(row.player_nation_id ? { playerNationId: row.player_nation_id } : {}),
    ...(row.provider ? { provider: row.provider } : {}),
    ...(row.model ? { model: row.model } : {}),
    ...(row.difficulty ? { difficulty: row.difficulty } : {}),
  };
}
function legacyHead(row: LegacyRow): SaveHead {
  return {
    gameId: 'open-historia',
    slotId: row.id,
    revision: 0,
    checksum: '',
    bytes: 0,
    schemaVersion: row.version,
    metadata: legacyMetadata(row),
    updatedAt: row.updated_at || row.timestamp,
    deleted: false,
    source: 'legacy',
  };
}

export class SaveRepository {
  constructor(private readonly db: D1Database) {}
  private store() {
    return this.db.withSession('first-primary');
  }
  private async findHead(user: string, game: GameId, slot: string): Promise<HeadRow | null> {
    return this.store()
      .prepare('SELECT * FROM account_game_slot WHERE user_id=? AND game_id=? AND slot_id=?')
      .bind(user, game, slot)
      .first<HeadRow>();
  }
  private async legacy(user: string, slot: string): Promise<CloudSave | null> {
    const row = await this.store()
      .prepare('SELECT * FROM saved_game WHERE user_id=? AND id=?')
      .bind(user, slot)
      .first<LegacyRow>();
    if (!row) return null;
    let data: string | null;
    try {
      data = normalizePayload(
        'open-historia',
        JSON.stringify({
          id: row.id,
          timestamp: row.timestamp,
          version: row.version,
          gameState: JSON.parse(row.game_state_json),
          gameConfig: JSON.parse(row.game_config_json),
          logs: JSON.parse(row.logs_json),
          events: JSON.parse(row.events_json),
          storySoFar: row.story_so_far,
        })
      );
    } catch {
      throw new Error('Legacy save is preserved but needs recovery');
    }
    if (data === null) throw new Error('Legacy save is preserved but exceeds the cloud format');
    return {
      ...legacyHead(row),
      data,
      bytes: new TextEncoder().encode(data).length,
      checksum: await checksum(data),
    };
  }
  async read(user: string, game: GameId, slot: string): Promise<CloudSave | null> {
    const row = await this.findHead(user, game, slot);
    if (row) return row.deleted ? null : this.readRevision(user, game, slot, row.revision);
    return game === 'open-historia' ? this.legacy(user, slot) : null;
  }
  async readRevision(
    user: string,
    game: GameId,
    slot: string,
    revision: number
  ): Promise<CloudSave | null> {
    if (revision === 0) return game === 'open-historia' ? this.legacy(user, slot) : null;
    const store = this.store();
    const row = await store
      .prepare(
        'SELECT *, created_at AS updated_at FROM account_game_version WHERE user_id=? AND game_id=? AND slot_id=? AND revision=?'
      )
      .bind(user, game, slot, revision)
      .first<HeadRow>();
    if (!row || row.deleted) return null;
    const result = await store
      .prepare(
        'SELECT part, body FROM account_game_chunk WHERE user_id=? AND game_id=? AND slot_id=? AND revision=? ORDER BY part'
      )
      .bind(user, game, slot, revision)
      .all<{ part: number; body: ArrayBuffer | number[] | Uint8Array }>();
    const parts = result.results;
    const bytes = new Uint8Array(row.byte_count);
    let offset = 0;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.part !== i) throw new Error('Stored save chunks are incomplete');
      const value = part.body instanceof Uint8Array ? part.body : new Uint8Array(part.body);
      if (offset + value.length > bytes.length)
        throw new Error('Stored save byte count is invalid');
      bytes.set(value, offset);
      offset += value.length;
    }
    const data = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (offset !== row.byte_count || (await checksum(data)) !== row.checksum)
      throw new Error('Stored save checksum does not match');
    return { ...head(row), data };
  }
  async list(user: string, game: GameId): Promise<SaveHead[]> {
    const store = this.store();
    const rows = await store
      .prepare(
        'SELECT * FROM account_game_slot WHERE user_id=? AND game_id=? ORDER BY updated_at DESC LIMIT 1000'
      )
      .bind(user, game)
      .all<HeadRow>();
    const allIds = new Set(rows.results.map((row) => row.slot_id));
    const saves = rows.results.filter((row) => !row.deleted).map(head);
    if (game === 'open-historia') {
      const legacy = await store
        .prepare(
          'SELECT id,name,timestamp,version,scenario,player_nation_id,provider,model,difficulty,turn,updated_at FROM saved_game WHERE user_id=? ORDER BY timestamp DESC LIMIT 1000'
        )
        .bind(user)
        .all<LegacyRow>();
      saves.push(...legacy.results.filter((row) => !allIds.has(row.id)).map(legacyHead));
    }
    return saves.sort((a, b) => b.updatedAt - a.updatedAt || a.slotId.localeCompare(b.slotId));
  }
  async history(user: string, game: GameId, slot: string): Promise<SaveHead[]> {
    const rows = await this.store()
      .prepare(
        'SELECT *,created_at AS updated_at FROM account_game_version WHERE user_id=? AND game_id=? AND slot_id=? ORDER BY revision DESC LIMIT ?'
      )
      .bind(user, game, slot, HISTORY_LIMIT)
      .all<HeadRow>();
    return rows.results.map(head);
  }
  async write(
    user: string,
    game: GameId,
    slot: string,
    input: SaveWrite,
    deleted = false
  ): Promise<WriteResult> {
    const store = this.store();
    const data = input.envelope.data;
    const digest = await checksum(data);
    const prior = await store
      .prepare(
        'SELECT *,created_at AS updated_at FROM account_game_version WHERE user_id=? AND game_id=? AND slot_id=? AND write_id=?'
      )
      .bind(user, game, slot, input.writeId)
      .first<HeadRow>();
    if (prior)
      return prior.checksum === digest && Boolean(prior.deleted) === deleted
        ? { ok: true, head: head(prior), duplicate: true }
        : { ok: false, reason: 'write-id-reused', current: head(prior) };
    const existing = await this.findHead(user, game, slot);
    const legacy = !existing && game === 'open-historia' ? await this.legacy(user, slot) : null;
    if (input.createOnly && (existing || legacy)) {
      const current = existing ? head(existing) : legacy;
      return current && !current.deleted && current.checksum === digest
        ? { ok: true, head: current, duplicate: true }
        : { ok: false, reason: 'conflict', current };
    }
    if (legacy && input.expectedChecksum !== legacy.checksum)
      return { ok: false, reason: 'conflict', current: legacy };
    if (!existing && input.expectedRevision !== 0)
      return { ok: false, reason: 'conflict', current: legacy };
    if (!existing && !legacy) {
      const count = await store
        .prepare(
          'SELECT COUNT(*) AS n FROM account_game_slot WHERE user_id=? AND game_id=? AND deleted=0'
        )
        .bind(user, game)
        .first<{ n: number }>();
      if ((count?.n ?? 0) >= MAX_SLOTS) return { ok: false, reason: 'quota', current: null };
    }
    const bytes = new TextEncoder().encode(deleted ? '' : data);
    if (bytes.length > MAX_SAVE_BYTES) throw new Error('Save payload exceeds its budget');
    const now = Date.now();
    const revision = input.expectedRevision + 1;
    const metadataJson = JSON.stringify(input.envelope.metadata);
    const statements: D1PreparedStatement[] = [
      store
        .prepare(`
      INSERT INTO account_game_slot(user_id,game_id,slot_id,revision,write_id,checksum,byte_count,schema_version,metadata_json,deleted,created_at,updated_at)
      SELECT ?,?,?,?,?,?,?,?,?,?,?,?
      WHERE (?=0 OR EXISTS(SELECT 1 FROM account_game_slot WHERE user_id=? AND game_id=? AND slot_id=? AND revision=?))
      AND (?=1 OR EXISTS(SELECT 1 FROM account_game_slot WHERE user_id=? AND game_id=? AND slot_id=? AND deleted=0)
        OR (?='open-historia' AND EXISTS(SELECT 1 FROM saved_game WHERE user_id=? AND id=?))
        OR (SELECT COUNT(*) FROM account_game_slot WHERE user_id=? AND game_id=? AND deleted=0)<?)
      -- Tombstones are never pruned: retaining their fencing revision prevents
      -- an old expectedRevision=0 client resurrecting a deliberately deleted slot.
      -- MAX_SLOT_RECORDS bounds this metadata; active-slot deletion still frees MAX_SLOTS.
      AND (EXISTS(SELECT 1 FROM account_game_slot WHERE user_id=? AND game_id=? AND slot_id=?)
        OR (?='open-historia' AND EXISTS(SELECT 1 FROM saved_game WHERE user_id=? AND id=?))
        OR (SELECT COUNT(*) FROM account_game_slot WHERE user_id=?)<?)
      AND COALESCE((SELECT SUM(byte_count) FROM account_game_version WHERE user_id=?
        AND NOT(game_id=? AND slot_id=? AND revision<=?)),0)
        + COALESCE((SELECT SUM(LENGTH(CAST(game_state_json AS BLOB))+LENGTH(CAST(game_config_json AS BLOB))
          +LENGTH(CAST(logs_json AS BLOB))+LENGTH(CAST(events_json AS BLOB))+LENGTH(CAST(COALESCE(story_so_far,'') AS BLOB)))
          FROM saved_game WHERE user_id=?),0)+?<=?
      ON CONFLICT(user_id,game_id,slot_id) DO UPDATE SET
      revision=excluded.revision,write_id=excluded.write_id,checksum=excluded.checksum,byte_count=excluded.byte_count,
      schema_version=excluded.schema_version,metadata_json=excluded.metadata_json,deleted=excluded.deleted,updated_at=excluded.updated_at
      WHERE account_game_slot.revision=?
      RETURNING *`)
        .bind(
          user,
          game,
          slot,
          revision,
          input.writeId,
          digest,
          bytes.length,
          input.envelope.schemaVersion,
          metadataJson,
          deleted ? 1 : 0,
          now,
          now,
          input.expectedRevision,
          user,
          game,
          slot,
          input.expectedRevision,
          deleted ? 1 : 0,
          user,
          game,
          slot,
          game,
          user,
          slot,
          user,
          game,
          MAX_SLOTS,
          user,
          game,
          slot,
          game,
          user,
          slot,
          user,
          MAX_SLOT_RECORDS,
          user,
          game,
          slot,
          revision - HISTORY_LIMIT,
          user,
          bytes.length,
          MAX_RETAINED_BYTES,
          input.expectedRevision
        ),
      store
        .prepare(`INSERT OR IGNORE INTO account_game_version(user_id,game_id,slot_id,revision,write_id,checksum,byte_count,schema_version,metadata_json,deleted,created_at)
        SELECT user_id,game_id,slot_id,revision,write_id,checksum,byte_count,schema_version,metadata_json,deleted,updated_at
        FROM account_game_slot WHERE user_id=? AND game_id=? AND slot_id=? AND revision=? AND write_id=? AND checksum=?`)
        .bind(user, game, slot, revision, input.writeId, digest),
    ];
    for (let offset = 0, part = 0; offset < bytes.length; offset += CHUNK_BYTES, part++) {
      statements.push(
        store
          .prepare(`INSERT OR IGNORE INTO account_game_chunk(user_id,game_id,slot_id,revision,part,body)
        SELECT user_id,game_id,slot_id,revision,?,? FROM account_game_slot
        WHERE user_id=? AND game_id=? AND slot_id=? AND revision=? AND write_id=? AND checksum=?`)
          .bind(
            part,
            bytes.slice(offset, offset + CHUNK_BYTES).buffer,
            user,
            game,
            slot,
            revision,
            input.writeId,
            digest
          )
      );
    }
    statements.push(
      store
        .prepare(`DELETE FROM account_game_version WHERE user_id=? AND game_id=? AND slot_id=?
      AND EXISTS(SELECT 1 FROM account_game_slot WHERE user_id=? AND game_id=? AND slot_id=? AND revision=? AND write_id=? AND checksum=?)
      AND revision NOT IN (SELECT revision FROM account_game_version WHERE user_id=? AND game_id=? AND slot_id=? ORDER BY revision DESC LIMIT ?)`)
        .bind(
          user,
          game,
          slot,
          user,
          game,
          slot,
          revision,
          input.writeId,
          digest,
          user,
          game,
          slot,
          HISTORY_LIMIT
        )
    );
    const results = await store.batch<HeadRow>(statements);
    const committed = results[0].results?.[0];
    if (committed) return { ok: true, head: head(committed), duplicate: false };
    const replay = await store
      .prepare(
        'SELECT *,created_at AS updated_at FROM account_game_version WHERE user_id=? AND game_id=? AND slot_id=? AND write_id=?'
      )
      .bind(user, game, slot, input.writeId)
      .first<HeadRow>();
    if (replay && replay.checksum === digest && Boolean(replay.deleted) === deleted)
      return { ok: true, head: head(replay), duplicate: true };
    const current = await this.findHead(user, game, slot);
    return {
      ok: false,
      reason: replay
        ? 'write-id-reused'
        : current && current.revision !== input.expectedRevision
          ? 'conflict'
          : 'quota',
      current: current ? head(current) : legacy,
    };
  }
  async allowWrite(user: string): Promise<boolean> {
    const minute = Math.floor(Date.now() / 60000);
    const store = this.store();
    const results = await store.batch([
      store
        .prepare(`DELETE FROM account_save_budget WHERE user_id=? AND minute<?`)
        .bind(user, minute - 2),
      store
        .prepare(`INSERT INTO account_save_budget(user_id,minute,writes) VALUES(?,?,1)
      ON CONFLICT(user_id,minute) DO UPDATE SET writes=writes+1 WHERE writes<60 RETURNING writes`)
        .bind(user, minute),
    ]);
    return results[1].results.length > 0;
  }
}
