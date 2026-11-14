import { Hono } from 'hono';
import {
  normalizePayload,
  parseWrite,
  record,
  validCampaignId,
  type CloudSave,
  type SaveHead,
} from '../../../lib/cloud-saves/contract';
import { SaveRepository } from '../../../lib/cloud-saves/repository';
import {
  accountSessionMiddleware,
  readBoundedJson,
  type AccountEnv,
} from '../../../lib/cloud-saves/security';

const saves = new Hono<AccountEnv>();
saves.use('*', accountSessionMiddleware());
function summary(save: SaveHead) {
  return {
    id: save.slotId,
    name: save.metadata.title,
    timestamp: save.updatedAt,
    version: save.schemaVersion,
    ...save.metadata,
    cloudRevision: save.revision,
    cloudChecksum: save.checksum,
  };
}
function payload(save: CloudSave) {
  return { ...JSON.parse(save.data), cloudRevision: save.revision, cloudChecksum: save.checksum };
}
saves.get('/', async (c) => {
  const rows = await new SaveRepository(c.env.DB).list(
    c.get('accountSession').user.id,
    'open-historia'
  );
  return c.json({ saves: rows.map(summary) });
});
saves.post('/', async (c) => {
  const body = await readBoundedJson(c.req.raw);
  if (!record(body) || !validCampaignId(body.id)) return c.json({ error: 'Invalid save id' }, 400);
  if (!Number.isSafeInteger(body.expectedRevision))
    return c.json(
      {
        error: 'Refresh this game before cloud saving. Your local campaign is kept.',
        code: 'client_upgrade_required',
      },
      428
    );
  const {
    expectedRevision: _revision,
    expectedChecksum: _checksum,
    writeId: _write,
    cloudRevision: _cloudRevision,
    cloudChecksum: _cloudChecksum,
    ...savedPayload
  } = body;
  const data = normalizePayload('open-historia', JSON.stringify(savedPayload));
  if (!data) return c.json({ error: 'Invalid campaign save' }, 400);
  const config = record(body.gameConfig) ? body.gameConfig : {};
  const state = record(body.gameState) ? body.gameState : {};
  const input = parseWrite('open-historia', {
    expectedRevision: body.expectedRevision,
    expectedChecksum: body.expectedChecksum,
    writeId: body.writeId,
    envelope: {
      schemaVersion: typeof body.version === 'string' ? body.version : '3.2.0',
      data,
      metadata: {
        title:
          typeof body.name === 'string'
            ? body.name
            : typeof config.scenario === 'string'
              ? config.scenario.slice(0, 100)
              : 'Saved campaign',
        ...(typeof config.scenario === 'string' ? { scenario: config.scenario.slice(0, 500) } : {}),
        ...(typeof state.turn === 'number' ? { turn: state.turn } : {}),
        ...(typeof config.playerNationId === 'string'
          ? { playerNationId: config.playerNationId }
          : {}),
        ...(typeof config.provider === 'string' ? { provider: config.provider } : {}),
        ...(typeof config.model === 'string' ? { model: config.model } : {}),
        ...(typeof config.difficulty === 'string' ? { difficulty: config.difficulty } : {}),
      },
    },
  });
  if (!input) return c.json({ error: 'Invalid campaign save' }, 400);
  const repository = new SaveRepository(c.env.DB);
  const user = c.get('accountSession').user.id;
  if (!(await repository.allowWrite(user)))
    return c.json({ error: 'Save rate limit reached' }, 429, { 'Retry-After': '60' });
  const result = await repository.write(user, 'open-historia', body.id, input);
  if (!result.ok)
    return c.json(
      {
        ...result,
        error: 'Cloud progress changed. Keep both versions or load the cloud campaign.',
      },
      result.reason === 'quota' ? 413 : 409
    );
  return c.json({
    ok: true,
    id: body.id,
    cloudRevision: result.head.revision,
    cloudChecksum: result.head.checksum,
    duplicate: result.duplicate,
  });
});
saves.post('/upload', async (c) => {
  const body = await readBoundedJson(c.req.raw);
  if (!record(body) || !Array.isArray(body.saves) || body.saves.length > 30)
    return c.json({ error: 'Upload up to 30 campaign saves at a time' }, 400);
  const repository = new SaveRepository(c.env.DB);
  const user = c.get('accountSession').user.id;
  let uploaded = 0;
  let alreadyPresent = 0;
  const conflicts: { id: string; current: SaveHead | null }[] = [];
  for (const save of body.saves) {
    if (!record(save) || !validCampaignId(save.id))
      return c.json({ error: 'Invalid campaign save' }, 400);
    const { cloudRevision: _revision, cloudChecksum: _checksum, ...savedPayload } = save;
    const data = normalizePayload('open-historia', JSON.stringify(savedPayload));
    const input = parseWrite('open-historia', {
      expectedRevision: 0,
      createOnly: true,
      writeId: `import-${crypto.randomUUID()}`,
      envelope: {
        schemaVersion: typeof save.version === 'string' ? save.version : '3.2.0',
        data,
        metadata: {
          title: typeof save.name === 'string' ? save.name.slice(0, 100) : 'Imported campaign',
        },
      },
    });
    if (!input) return c.json({ error: 'Invalid campaign save; existing saves were kept' }, 400);
    if (!(await repository.allowWrite(user)))
      return c.json({ error: 'Save rate limit reached', uploaded, conflicts }, 429, {
        'Retry-After': '60',
      });
    const result = await repository.write(user, 'open-historia', save.id, input);
    if (!result.ok) conflicts.push({ id: save.id, current: result.current });
    else if (result.duplicate) alreadyPresent++;
    else uploaded++;
  }
  return c.json({ ok: true, uploaded, alreadyPresent, conflicts });
});
saves.get('/:id', async (c) => {
  if (!validCampaignId(c.req.param('id'))) return c.json({ error: 'Not found' }, 404);
  const save = await new SaveRepository(c.env.DB).read(
    c.get('accountSession').user.id,
    'open-historia',
    c.req.param('id')
  );
  return save ? c.json({ save: payload(save) }) : c.json({ error: 'Not found' }, 404);
});
saves.delete('/:id', async (c) => {
  const slot = c.req.param('id');
  if (!validCampaignId(slot)) return c.json({ error: 'Not found' }, 404);
  const body = await readBoundedJson(c.req.raw, 16384);
  if (!record(body) || !Number.isSafeInteger(body.expectedRevision))
    return c.json(
      { error: 'Refresh this game before changing cloud saves', code: 'client_upgrade_required' },
      428
    );
  const repository = new SaveRepository(c.env.DB);
  const user = c.get('accountSession').user.id;
  const current = await repository.read(user, 'open-historia', slot);
  if (!current) return c.json({ error: 'Not found' }, 404);
  const input = parseWrite('open-historia', {
    ...body,
    envelope: {
      data: current.data,
      schemaVersion: current.schemaVersion,
      metadata: current.metadata,
    },
  });
  if (!input) return c.json({ error: 'Invalid delete request' }, 400);
  if (!(await repository.allowWrite(user)))
    return c.json({ error: 'Save rate limit reached' }, 429, { 'Retry-After': '60' });
  const result = await repository.write(user, 'open-historia', slot, input, true);
  return result.ok
    ? c.json({ ok: true })
    : c.json({ ...result, error: 'Cloud progress changed; local save kept' }, 409);
});
saves.onError((error, c) => {
  if (error instanceof RangeError)
    return c.json({ error: 'Campaign is too large; local save kept' }, 413);
  if (error instanceof SyntaxError) return c.json({ error: 'Malformed save request' }, 400);
  console.error('Campaign cloud save failed:', 'storage-or-response');
  return c.json({ error: 'Cloud saving is unavailable; local save kept' }, 503);
});
export default saves;
