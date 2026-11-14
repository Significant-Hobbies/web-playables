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
