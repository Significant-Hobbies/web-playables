import { and, desc, eq, inArray } from 'drizzle-orm';
import type { Context } from 'hono';
import { Hono } from 'hono';

import { createAuth } from '../../../lib/auth';
import { createDb } from '../../../lib/db';
import { savedGame } from '../../../lib/db/schema';
import type { WorkerEnv } from '../../../lib/worker-env';

function stripApiKey(configJson: string): string {
  try {
    const config = JSON.parse(configJson);
    config.apiKey = '';
    return JSON.stringify(config);
  } catch {
    return configJson;
  }
}

async function requireSession(c: Context<{ Bindings: WorkerEnv }>) {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return null;
  }
  return session;
}

const saves = new Hono<{ Bindings: WorkerEnv }>();

saves.get('/', async (c) => {
  const session = await requireSession(c);
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const db = createDb(c.env);
  const rows = await db
    .select({
      id: savedGame.id,
      name: savedGame.name,
      timestamp: savedGame.timestamp,
      version: savedGame.version,
      storySoFar: savedGame.storySoFar,
      scenario: savedGame.scenario,
      playerNationId: savedGame.playerNationId,
      provider: savedGame.provider,
      model: savedGame.model,
      difficulty: savedGame.difficulty,
      turn: savedGame.turn,
      createdAt: savedGame.createdAt,
      updatedAt: savedGame.updatedAt,
    })
    .from(savedGame)
    .where(eq(savedGame.userId, session.user.id))
    .orderBy(desc(savedGame.timestamp));

  return c.json({ saves: rows });
});

saves.post('/', async (c) => {
  const session = await requireSession(c);
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();
  const { id, name, timestamp, version, gameState, gameConfig, logs, events, storySoFar } = body;

  if (!id || !gameState || !gameConfig) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const gameConfigJson = stripApiKey(
    typeof gameConfig === 'string' ? gameConfig : JSON.stringify(gameConfig)
  );
  const gameStateJson = typeof gameState === 'string' ? gameState : JSON.stringify(gameState);
  const logsJson = typeof logs === 'string' ? logs : JSON.stringify(logs || []);
  const eventsJson = typeof events === 'string' ? events : JSON.stringify(events || []);

  let parsedConfig: Record<string, unknown> = {};
  try {
    parsedConfig = JSON.parse(gameConfigJson);
  } catch {
    /* ignore */
  }

  let parsedState: Record<string, unknown> = {};
  try {
    parsedState = JSON.parse(gameStateJson);
  } catch {
    /* ignore */
  }

  const now = Date.now();
  const db = createDb(c.env);

  const existing = await db
    .select({ userId: savedGame.userId })
    .from(savedGame)
    .where(eq(savedGame.id, id))
    .limit(1);

  if (existing.length > 0 && existing[0].userId !== session.user.id) {
    return c.json({ error: 'Save id already belongs to another account' }, 409);
  }

  const row = {
    id,
    userId: session.user.id,
    name: name || null,
    timestamp: timestamp || now,
    version: version || '2.0.0',
    gameStateJson,
    gameConfigJson,
    logsJson,
    eventsJson,
    storySoFar: storySoFar || null,
    scenario: (parsedConfig.scenario as string) || null,
    playerNationId: (parsedConfig.playerNationId as string) || null,
    provider: (parsedConfig.provider as string) || null,
    model: (parsedConfig.model as string) || null,
    difficulty: (parsedConfig.difficulty as string) || null,
    turn: (parsedState.turn as number) || null,
    createdAt: now,
    updatedAt: now,
  };

  await db
    .insert(savedGame)
    .values(row)
    .onConflictDoUpdate({
      target: savedGame.id,
      set: {
        name: row.name,
        timestamp: row.timestamp,
        version: row.version,
        gameStateJson: row.gameStateJson,
        gameConfigJson: row.gameConfigJson,
        logsJson: row.logsJson,
        eventsJson: row.eventsJson,
        storySoFar: row.storySoFar,
        scenario: row.scenario,
        playerNationId: row.playerNationId,
        provider: row.provider,
        model: row.model,
        difficulty: row.difficulty,
        turn: row.turn,
        updatedAt: now,
      },
    });

  return c.json({ ok: true, id });
});

saves.post('/upload', async (c) => {
  const session = await requireSession(c);
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();
  const { saves: uploadSaves } = body;

  if (!Array.isArray(uploadSaves) || uploadSaves.length === 0) {
    return c.json({ error: 'No saves provided' }, 400);
  }

  let uploaded = 0;
  const db = createDb(c.env);

  // Batch the per-save ownership lookups into a single query. `savedGame.id` is
  // the primary key, so each id maps to at most one existing owner — equivalent
  // to the previous per-save SELECT but collapsing N reads into one.
  const candidateIds = Array.from(
    new Set(
      uploadSaves.filter((s) => s.id && s.gameState && s.gameConfig).map((s) => s.id as string)
    )
  );
  const existingOwners = new Map<string, string>();
  if (candidateIds.length > 0) {
    const ownerRows = await db
      .select({ id: savedGame.id, userId: savedGame.userId })
      .from(savedGame)
      .where(inArray(savedGame.id, candidateIds));
    for (const ownerRow of ownerRows) {
      existingOwners.set(ownerRow.id, ownerRow.userId);
    }
  }

  for (const save of uploadSaves) {
    if (!save.id || !save.gameState || !save.gameConfig) continue;

    const gameConfigJson = stripApiKey(
      typeof save.gameConfig === 'string' ? save.gameConfig : JSON.stringify(save.gameConfig)
    );
    const gameStateJson =
      typeof save.gameState === 'string' ? save.gameState : JSON.stringify(save.gameState);
    const logsJson = typeof save.logs === 'string' ? save.logs : JSON.stringify(save.logs || []);
    const eventsJson =
      typeof save.events === 'string' ? save.events : JSON.stringify(save.events || []);

    let parsedConfig: Record<string, unknown> = {};
    try {
      parsedConfig = JSON.parse(gameConfigJson);
    } catch {
      /* ignore */
    }

    let parsedState: Record<string, unknown> = {};
    try {
      parsedState = JSON.parse(gameStateJson);
    } catch {
      /* ignore */
    }

    const now = Date.now();

    const existingOwner = existingOwners.get(save.id);
    if (existingOwner !== undefined && existingOwner !== session.user.id) {
      console.error(`Skipped upload for save ${save.id}: id belongs to another user`);
      continue;
    }

    const row = {
      id: save.id,
      userId: session.user.id,
      name: save.name || null,
      timestamp: save.timestamp || now,
      version: save.version || '2.0.0',
      gameStateJson,
      gameConfigJson,
      logsJson,
      eventsJson,
      storySoFar: save.storySoFar || null,
      scenario: (parsedConfig.scenario as string) || null,
      playerNationId: (parsedConfig.playerNationId as string) || null,
      provider: (parsedConfig.provider as string) || null,
      model: (parsedConfig.model as string) || null,
      difficulty: (parsedConfig.difficulty as string) || null,
      turn: (parsedState.turn as number) || null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await db
        .insert(savedGame)
        .values(row)
        .onConflictDoUpdate({
          target: savedGame.id,
          set: {
            timestamp: row.timestamp,
            version: row.version,
            gameStateJson: row.gameStateJson,
            gameConfigJson: row.gameConfigJson,
            logsJson: row.logsJson,
            eventsJson: row.eventsJson,
            storySoFar: row.storySoFar,
            scenario: row.scenario,
            playerNationId: row.playerNationId,
            provider: row.provider,
            model: row.model,
            difficulty: row.difficulty,
            turn: row.turn,
            updatedAt: now,
          },
        });
      uploaded++;
    } catch (err) {
      console.error(`Failed to upload save ${save.id}:`, err);
    }
  }

  return c.json({ ok: true, uploaded });
});

saves.get('/:id', async (c) => {
  const session = await requireSession(c);
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const id = c.req.param('id');
  const db = createDb(c.env);

  const rows = await db
    .select()
    .from(savedGame)
    .where(and(eq(savedGame.id, id), eq(savedGame.userId, session.user.id)))
    .limit(1);

  if (rows.length === 0) {
    return c.json({ error: 'Not found' }, 404);
  }

  const row = rows[0];
  return c.json({
    save: {
      id: row.id,
      timestamp: row.timestamp,
      version: row.version,
      gameState: JSON.parse(row.gameStateJson),
      gameConfig: JSON.parse(row.gameConfigJson),
      logs: JSON.parse(row.logsJson),
      events: JSON.parse(row.eventsJson),
      storySoFar: row.storySoFar,
    },
  });
});

saves.delete('/:id', async (c) => {
  const session = await requireSession(c);
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const id = c.req.param('id');
  const db = createDb(c.env);

  await db
    .delete(savedGame)
    .where(and(eq(savedGame.id, id), eq(savedGame.userId, session.user.id)));

  return c.json({ ok: true });
});

export default saves;
