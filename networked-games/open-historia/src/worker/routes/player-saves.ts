import { Hono } from 'hono';
import {
  GAME_IDS,
  isGameId,
  parseWrite,
  record,
  validGameSlot,
} from '../../../lib/cloud-saves/contract';
import { SaveRepository } from '../../../lib/cloud-saves/repository';
import {
  accountSessionMiddleware,
  csrfToken,
  readBoundedJson,
  type AccountEnv,
  type AccountSession,
} from '../../../lib/cloud-saves/security';

export function createPlayerRoutes(
  resolve?: (context: import('hono').Context<AccountEnv>) => Promise<AccountSession | null>
) {
  const routes = new Hono<AccountEnv>();
  routes.use('*', accountSessionMiddleware(resolve));
  routes.get('/', async (c) => {
    const session = c.get('accountSession');
    return c.json({
      user: session.user,
      csrfToken: await csrfToken(session, c.env.BETTER_AUTH_SECRET),
      games: GAME_IDS,
      googleConfigured: Boolean(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET),
    });
  });
  routes.use('/games/:gameId/*', async (c, next) => {
    if (!isGameId(c.req.param('gameId'))) return c.json({ error: 'Unknown game' }, 404);
    await next();
  });
  routes.get('/games/:gameId/saves', async (c) => {
    const game = c.req.param('gameId');
    if (!isGameId(game)) return c.json({ error: 'Unknown game' }, 404);
    const saves = await new SaveRepository(c.env.DB).list(c.get('accountSession').user.id, game);
    const offset = Number(c.req.query('offset') || 0);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000)
      return c.json({ error: 'Invalid page' }, 400);
    return c.json({
      saves: saves.slice(offset, offset + 50),
      nextOffset: saves.length > offset + 50 ? offset + 50 : null,
    });
  });
  routes.get('/games/:gameId/saves/:slotId', async (c) => {
    const game = c.req.param('gameId');
    const slot = c.req.param('slotId');
    if (!isGameId(game) || !validGameSlot(game, slot)) return c.json({ error: 'Not found' }, 404);
    const save = await new SaveRepository(c.env.DB).read(
      c.get('accountSession').user.id,
      game,
      slot
    );
    return save ? c.json({ save }) : c.json({ error: 'Not found' }, 404);
  });
  routes.get('/games/:gameId/saves/:slotId/history', async (c) => {
    const game = c.req.param('gameId');
    const slot = c.req.param('slotId');
    if (!isGameId(game) || !validGameSlot(game, slot)) return c.json({ error: 'Not found' }, 404);
    return c.json({
      history: await new SaveRepository(c.env.DB).history(
        c.get('accountSession').user.id,
        game,
        slot
      ),
    });
  });
  routes.put('/games/:gameId/saves/:slotId', async (c) => {
    const game = c.req.param('gameId');
    const slot = c.req.param('slotId');
    if (!isGameId(game) || !validGameSlot(game, slot)) return c.json({ error: 'Not found' }, 404);
    const input = parseWrite(game, await readBoundedJson(c.req.raw));
    if (!input) return c.json({ error: 'Invalid save envelope' }, 400);
    const repository = new SaveRepository(c.env.DB);
    const user = c.get('accountSession').user.id;
    if (!(await repository.allowWrite(user)))
      return c.json({ error: 'Save rate limit reached' }, 429, { 'Retry-After': '60' });
    const result = await repository.write(user, game, slot, input);
    if (!result.ok)
      return c.json(
        result,
        result.reason === 'quota' ? 413 : result.reason === 'write-id-reused' ? 400 : 409
      );
    return c.json(result);
  });
  routes.post('/games/:gameId/saves/:slotId/restore', async (c) => {
    const game = c.req.param('gameId');
    const slot = c.req.param('slotId');
    if (!isGameId(game) || !validGameSlot(game, slot)) return c.json({ error: 'Not found' }, 404);
    const body = await readBoundedJson(c.req.raw, 16384);
    if (!record(body) || !Number.isSafeInteger(body.revision) || (body.revision as number) < 0)
      return c.json({ error: 'Invalid revision' }, 400);
    const repository = new SaveRepository(c.env.DB);
    const user = c.get('accountSession').user.id;
    const old = await repository.readRevision(user, game, slot, body.revision as number);
    if (!old) return c.json({ error: 'Not found' }, 404);
    const input = parseWrite(game, {
      ...body,
      envelope: {
        data: old.data,
        schemaVersion: old.schemaVersion,
        metadata: old.metadata,
      },
    });
    if (!input) return c.json({ error: 'Invalid restore request' }, 400);
    if (!(await repository.allowWrite(user)))
      return c.json({ error: 'Save rate limit reached' }, 429, { 'Retry-After': '60' });
    const result = await repository.write(user, game, slot, input);
    return result.ok ? c.json(result) : c.json(result, 409);
  });
  routes.delete('/games/:gameId/saves/:slotId', async (c) => {
    const game = c.req.param('gameId');
    const slot = c.req.param('slotId');
    if (!isGameId(game) || !validGameSlot(game, slot)) return c.json({ error: 'Not found' }, 404);
    const repository = new SaveRepository(c.env.DB);
    const user = c.get('accountSession').user.id;
    const current = await repository.read(user, game, slot);
    if (!current) return c.json({ error: 'Not found' }, 404);
    const body = await readBoundedJson(c.req.raw, 16384);
    const input = parseWrite(game, {
      ...(record(body) ? body : {}),
      envelope: {
        data: current.data,
        schemaVersion: current.schemaVersion,
        metadata: current.metadata,
      },
    });
    if (!input) return c.json({ error: 'Invalid delete request' }, 400);
    if (!(await repository.allowWrite(user)))
      return c.json({ error: 'Save rate limit reached' }, 429, { 'Retry-After': '60' });
    const result = await repository.write(user, game, slot, input, true);
    return result.ok ? c.json(result) : c.json(result, 409);
  });
  routes.onError((error, c) => {
    if (error instanceof RangeError)
      return c.json({ error: 'Save is too large; local progress is kept' }, 413);
    if (error instanceof SyntaxError) return c.json({ error: 'Malformed save request' }, 400);
    console.error('Cloud save failed:', 'storage-or-response');
    return c.json({ error: 'Cloud saving is unavailable; local progress is kept' }, 503);
  });
  return routes;
}
export default createPlayerRoutes();
