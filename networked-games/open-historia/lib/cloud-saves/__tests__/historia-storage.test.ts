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
  it('deletes a visible authenticated guest-only save after online404 or offline local-only confirmation', async () => {
    for (const offline of [false, true]) {
      vi.resetModules();
      vi.stubGlobal('localStorage', new MemoryStorage());
      const client = await import('../../game-storage');
      client.localSaveGame(state(3), config, [], 'guest-only');
      const original = localStorage.getItem('open_historia_saves');
      client.setAuthenticated(true, 'alice');
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          if (offline) throw new Error('offline');
          return Response.json({}, { status: 404 });
        })
      );
      await client.deleteGame('guest-only');
      expect(JSON.parse(localStorage.getItem('open_historia_saves')!)).toEqual([]);
      expect(localStorage.getItem('open_historia_saves:recovery')).toBe(original);
      expect(localStorage.getItem('open_historia_saves:account:alice')).toBeNull();
      if (offline)
        expect(client.getCampaignCloudStatus().message).toContain('Cloud saves were not changed');
    }
  });
  it('preserves a same-id guest when a remote head exists, even if conditional cloud deletion fails', async () => {
    const client = await import('../../game-storage');
    client.localSaveGame(state(9), config, [], 'same-id');
    const guest = localStorage.getItem('open_historia_saves');
    client.setAuthenticated(true, 'alice');
    let fail = true;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string, init?: RequestInit) => {
        if (path === '/api/player')
          return Response.json({ user: { id: 'alice' }, csrfToken: 'csrf' });
        if (init?.method === 'DELETE') return Response.json({}, { status: fail ? 503 : 200 });
        return Response.json({
          save: { id: 'same-id', cloudRevision: 4, cloudChecksum: 'd'.repeat(64) },
        });
      })
    );
    await expect(client.deleteGame('same-id')).rejects.toThrow();
    expect(localStorage.getItem('open_historia_saves')).toBe(guest);
    fail = false;
    await client.deleteGame('same-id');
    expect(localStorage.getItem('open_historia_saves')).toBe(guest);
    expect(localStorage.getItem('open_historia_saves:account:alice')).toBeNull();
  });
  it('does not overwrite previous recovery on missing-id local or authenticated404 deletion', async () => {
    const client = await import('../../game-storage');
    client.localSaveGame(state(), config, [], 'kept');
    const collection = localStorage.getItem('open_historia_saves')!;
    const previous = '[{"id":"previous-recovery"}]';
    localStorage.setItem('open_historia_saves:recovery', previous);
    client.localDeleteGame('missing');
    expect(localStorage.getItem('open_historia_saves')).toBe(collection);
    expect(localStorage.getItem('open_historia_saves:recovery')).toBe(previous);
    client.setAuthenticated(true, 'alice');
    localStorage.setItem('open_historia_saves:account:alice', collection);
    localStorage.setItem('open_historia_saves:account:alice:recovery', previous);
    const guestRecovery = localStorage.getItem('open_historia_saves:recovery');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({}, { status: 404 }))
    );
    await client.deleteGame('missing');
    expect(localStorage.getItem('open_historia_saves:account:alice')).toBe(collection);
    expect(localStorage.getItem('open_historia_saves:account:alice:recovery')).toBe(previous);
    expect(localStorage.getItem('open_historia_saves:recovery')).toBe(guestRecovery);
  });
  it('deletes the account cache before account play mode without touching a same-id guest', async () => {
    const client = await import('../../game-storage');
    client.localSaveGame(state(9), config, [], 'same-id');
    const guest = localStorage.getItem('open_historia_saves');
    const account = JSON.parse(guest!);
    account[0].cloudRevision = 4;
    account[0].cloudChecksum = 'd'.repeat(64);
    localStorage.setItem('open_historia_saves:account:alice', JSON.stringify(account));
    client.setAuthenticated(true, 'alice');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string, init?: RequestInit) => {
        if (path === '/api/player')
          return Response.json({ user: { id: 'alice' }, csrfToken: 'csrf' });
        if (init?.method === 'DELETE') return Response.json({});
        if (path === '/api/saves') return Response.json({ saves: [] });
        return Response.json({
          save: { id: 'same-id', cloudRevision: 4, cloudChecksum: 'd'.repeat(64) },
        });
      })
    );
    await client.deleteGame('same-id');
    expect(localStorage.getItem('open_historia_saves')).toBe(guest);
    client.startAccountCampaign();
    expect(await client.listSavedGames()).toEqual([]);
  });
  it('can delete an account-local-only copy offline without deleting a guest or claiming remote deletion', async () => {
    const client = await import('../../game-storage');
    client.localSaveGame(state(), config, [], 'local-only');
    const guest = localStorage.getItem('open_historia_saves');
    localStorage.setItem('open_historia_saves:account:alice', guest!);
    client.setAuthenticated(true, 'alice');
    const request = vi.fn(async () => {
      throw new Error('offline');
    });
    vi.stubGlobal('fetch', request);
    await client.deleteGame('local-only');
    expect(request).not.toHaveBeenCalled();
    expect(localStorage.getItem('open_historia_saves')).toBe(guest);
    expect(JSON.parse(localStorage.getItem('open_historia_saves:account:alice')!)).toEqual([]);
    expect(client.getCampaignCloudStatus().message).toContain('Cloud saves were not changed');
  });
  it('deletes after fresh login using a freshly read conditional head and preserves local bytes on cloud failure', async () => {
    const client = await import('../../game-storage');
    client.setAuthenticated(true, 'alice');
    client.startAccountCampaign();
    client.localSaveGame(state(4), config, [], 'delete-me');
    const existing = JSON.parse(localStorage.getItem('open_historia_saves:account:alice')!);
    existing[0].cloudRevision = 7;
    existing[0].cloudChecksum = 'c'.repeat(64);
    localStorage.setItem('open_historia_saves:account:alice', JSON.stringify(existing));
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
