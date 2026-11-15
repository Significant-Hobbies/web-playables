import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameConfig, GameState } from '../../types';
class MemoryStorage {
  data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}
const state = (turn = 1) =>
  ({
    turn,
    players: [],
    provinces: [],
    selectedProvinceId: null,
    theme: 'classic',
    completedStepIds: [],
  }) as unknown as GameState;
const config = {
  year: 1492,
  scenario: 'Test campaign',
  playerNationId: '1',
  apiKey: 'local-only-key',
  provider: 'local',
  model: 'auto',
  difficulty: 'Realistic',
} as GameConfig;
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('localStorage', new MemoryStorage());
});
afterEach(() => vi.unstubAllGlobals());
describe('Historia account compatibility', () => {
  it('deletes after fresh login using a freshly read conditional head and preserves local bytes on cloud failure', async () => {
    const client = await import('../../game-storage');
    client.setAuthenticated(true, 'alice');
    client.startAccountCampaign();
    client.localSaveGame(state(4), config, [], 'delete-me');
    let fail = true;
    let deleted: Record<string, unknown> | null = null;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string, init?: RequestInit) => {
        if (path === '/api/player')
          return Response.json({ user: { id: 'alice' }, csrfToken: 'csrf' });
        if (init?.method === 'DELETE') {
          deleted = JSON.parse(String(init.body));
          return Response.json({}, { status: fail ? 409 : 200 });
        }
        return Response.json({
          save: { id: 'delete-me', cloudRevision: 7, cloudChecksum: 'c'.repeat(64) },
        });
      })
    );
    await expect(client.deleteGame('delete-me')).rejects.toThrow('local campaign kept');
    expect(client.localLoadGame('delete-me')).not.toBeNull();
    expect(deleted).toMatchObject({ expectedRevision: 7, expectedChecksum: 'c'.repeat(64) });
    fail = false;
    await client.deleteGame('delete-me');
    expect(client.localLoadGame('delete-me')).toBeNull();
  });
  it('discards delayed account-A JSON responses instead of returning them or A fallbacks under B', async () => {
    const client = await import('../../game-storage');
    client.setAuthenticated(true, 'alice');
    client.startAccountCampaign();
    client.localSaveGame(state(8), config, [], 'campaign');
    let release!: (value: unknown) => void;
    const body = new Promise<unknown>((resolve) => {
      release = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: () => body }))
    );
    const loading = client.loadGame('campaign');
    await Promise.resolve();
    await Promise.resolve();
    client.setAuthenticated(true, 'bob');
    release({
      save: {
        id: 'campaign',
        version: '3.2.0',
        gameState: state(1),
        gameConfig: config,
        logs: [],
        events: [],
      },
    });
    expect(await loading).toBeNull();
    expect(localStorage.getItem('open_historia_saves:account:bob')).toBeNull();
    let releaseList!: (value: unknown) => void;
    const listBody = new Promise<unknown>((resolve) => {
      releaseList = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: () => listBody }))
    );
    const listing = client.listSavedGames();
    await Promise.resolve();
    client.setAuthenticated(true, 'carol');
    releaseList({ saves: [{ id: 'bob-cloud', timestamp: 1, version: '3.2.0' }] });
    expect(await listing).toEqual([]);
  });
  it('requires guest import and never writes account A progress under account B', async () => {
    const requests: { owner: string; body: Record<string, unknown> }[] = [];
    let owner = 'alice';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string, init?: RequestInit) => {
        if (path === '/api/player')
          return Response.json({ user: { id: owner }, csrfToken: 'fixture-csrf' });
        requests.push({ owner, body: JSON.parse(String(init?.body)) });
        return Response.json({ cloudRevision: 1, cloudChecksum: 'f'.repeat(64) });
      })
    );
    const client = await import('../../game-storage');
    client.localSaveGame(state(), config, [], 'guest');
    client.setAuthenticated(true, 'alice');
    await client.saveGame(state(2), config, [], 'guest');
    expect(requests).toHaveLength(0);
    client.startAccountCampaign();
    await client.saveGame(state(3), config, [], 'alice-campaign');
    expect(requests).toHaveLength(1);
    expect(requests[0].body.expectedRevision).toBe(0);
    expect(JSON.stringify(requests[0])).not.toContain('local-only-key');
    owner = 'bob';
    client.setAuthenticated(true, 'bob');
    await client.saveGame(state(4), config, [], 'alice-campaign');
    expect(requests).toHaveLength(1);
    expect(localStorage.getItem('open_historia_saves:account:alice')).toContain('alice-campaign');
    expect(localStorage.getItem('open_historia_saves:account:bob')).toBeNull();
    expect(localStorage.getItem('open_historia_saves')).toContain('guest');
  });
  it('uses the exact loaded revision, preserves a conflicting local campaign, and requires explicit cloud replacement', async () => {
    let posted: { expectedRevision?: number; expectedChecksum?: string } = {};
    let writes = 0;
    const remote = {
      id: 'campaign',
      timestamp: 1,
      version: '3.2.0',
      gameState: { ...state(1), provinceOwners: [] },
      gameConfig: { ...config, apiKey: '' },
      logs: [],
      events: [],
      cloudRevision: 7,
      cloudChecksum: 'b'.repeat(64),
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string, init?: RequestInit) => {
        if (path === '/api/player')
          return Response.json({ user: { id: 'alice' }, csrfToken: 'fixture-csrf' });
        if (init?.method === 'POST') {
          writes++;
          posted = JSON.parse(String(init.body));
          return Response.json({ reason: 'conflict' }, { status: 409 });
        }
        return Response.json({ save: remote });
      })
    );
    const client = await import('../../game-storage');
    client.setAuthenticated(true, 'alice');
    await client.loadGame('campaign');
    await client.saveGame(state(8), config, [], 'campaign');
    expect(posted.expectedRevision).toBe(7);
    expect(posted.expectedChecksum).toBe(remote.cloudChecksum);
    expect(client.getCampaignCloudStatus().phase).toBe('conflict');
    await client.saveGame(state(9), config, [], 'campaign');
    expect(writes).toBe(1);
    expect((await client.loadGame('campaign'))?.gameState.turn).toBe(9);
    expect(client.getCampaignCloudStatus().phase).toBe('conflict');
    expect((await client.resolveCampaignConflict('campaign', 'cloud'))?.gameState.turn).toBe(1);
    expect(client.getCampaignCloudStatus().phase).toBe('saved');
    await client.loadGame('campaign');
    expect(localStorage.getItem('open_historia_saves:account:alice:recovery')).toContain(
      '"turn":9'
    );
  });
});
