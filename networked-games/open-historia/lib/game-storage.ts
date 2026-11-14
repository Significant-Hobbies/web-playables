import { checksum, normalizePayload, redactConfig } from './cloud-saves/contract';
import { isTimelineMemory } from './timeline-memory';
import type { GameConfig, GameEvent, GameState, Province } from './types';

export interface LogEntry {
  id: string;
  type:
    | 'command'
    | 'info'
    | 'error'
    | 'success'
    | 'capture'
    | 'war'
    | 'diplomacy'
    | 'economy'
    | 'crisis'
    | 'event-summary';
  text: string;
  /** A resolved turn report, preserved with its historical log on rewind. */
  narrative?: boolean;
}

type ProvinceOwnerSnapshot = {
  id: string | number;
  ownerId: string | null;
};

type GameStateSnapshot = Pick<
  GameState,
  | 'turn'
  | 'players'
  | 'selectedProvinceId'
  | 'theme'
  | 'relations'
  | 'chatThreads'
  | 'timeline'
  | 'advisorHistory'
  | 'pendingOrders'
  | 'completedStepIds'
  | 'currentTimelineSnapshotId'
> & { provinceOwners: ProvinceOwnerSnapshot[] };

type PersistedGameState = GameStateSnapshot | GameState;

export interface SavedGame {
  id: string;
  timestamp: number;
  gameState: PersistedGameState;
  gameConfig: GameConfig;
  logs: LogEntry[];
  events: GameEvent[];
  storySoFar?: string;
  completedStepIds?: string[];
  version: string;
  cloudRevision?: number;
  cloudChecksum?: string;
}

const STORAGE_KEY = 'open_historia_saves';
const VERSION = '3.2.0';

const toProvinceKey = (id: string | number) => String(id);

const createSaveId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `save_${crypto.randomUUID()}`;
  }
  return `save_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const isLegacyGameState = (state: PersistedGameState): state is GameState => {
  return Array.isArray((state as GameState).provinces);
};

const SAVE_MIGRATIONS: Record<string, (save: SavedGame) => SavedGame> = {
  '2.0.0': (save) => ({ ...save, version: VERSION }),
  '3.0.0': (save) => ({ ...save, version: VERSION }),
  '3.1.0': (save) => ({ ...save, version: VERSION }),
};

function migrateSave(save: SavedGame): SavedGame {
  let current = save;
  while (current.version !== VERSION) {
    const migrate = SAVE_MIGRATIONS[current.version];
    if (!migrate) break;
    current = migrate(current);
  }
  return current;
}

const toSnapshot = (gameState: GameState, completedStepIds?: string[]): GameStateSnapshot => ({
  currentTimelineSnapshotId: gameState.currentTimelineSnapshotId,
  turn: gameState.turn,
  players: gameState.players,
  selectedProvinceId: gameState.selectedProvinceId,
  theme: gameState.theme,
  relations: gameState.relations || [],
  chatThreads: gameState.chatThreads || [],
  timeline: gameState.timeline || [],
  advisorHistory: gameState.advisorHistory || [],
  pendingOrders: gameState.pendingOrders || [],
  completedStepIds: gameState.completedStepIds ?? completedStepIds ?? [],
  provinceOwners: gameState.provinces.map((province) => ({
    id: province.id,
    ownerId: province.ownerId,
  })),
});

// ---------------------------------------------------------------------------
// Auth state (set from page.tsx when session changes)
// ---------------------------------------------------------------------------

let _authenticated = false;
let _accountId: string | null = null;
let _playingOwner: string | null = null;
let _generation = 0;
let _csrf = '';
const bases = new Map<string, { revision: number; checksum: string }>();
export interface CampaignCloudStatus {
  phase: 'local' | 'saved' | 'offline' | 'conflict';
  id?: string;
  message?: string;
}
let cloudStatus: CampaignCloudStatus = { phase: 'local' };
export function getCampaignCloudStatus() {
  return { ...cloudStatus };
}
function status(next: CampaignCloudStatus) {
  cloudStatus = next;
  if (typeof window !== 'undefined')
    window.dispatchEvent(new CustomEvent('playables:historia-cloud-state', { detail: next }));
}
function storageKey(owner = _playingOwner) {
  return owner ? `${STORAGE_KEY}:account:${owner}` : STORAGE_KEY;
}
function backupLocal(owner = _playingOwner) {
  const raw = localStorage.getItem(storageKey(owner));
  if (raw !== null) {
    const key = `${storageKey(owner)}:recovery`;
    localStorage.setItem(key, raw);
    if (localStorage.getItem(key) !== raw)
      throw new Error('Local campaign recovery did not persist');
  }
}
export function setAuthenticated(value: boolean, accountId?: string) {
  const next = value && accountId ? accountId : null;
  if (next !== _accountId) {
    backupLocal();
    _generation++;
    _csrf = '';
    bases.clear();
  }
  _accountId = next;
  _authenticated = value && Boolean(next);
}
/** Only an explicit new-campaign action or cloud load assigns its future progress to this account. */
export function startAccountCampaign() {
  backupLocal();
  _playingOwner = _accountId;
}
export function guestSavedGames(): SavedGame[] {
  const previous = _playingOwner;
  try {
    _playingOwner = null;
    return localListSavedGames();
  } finally {
    _playingOwner = previous;
  }
}

export function isAuthenticated(): boolean {
  return _authenticated;
}

// ---------------------------------------------------------------------------
// Restore (synchronous, unchanged)
// ---------------------------------------------------------------------------

export function restoreSavedGameState(savedGame: SavedGame, baseProvinces: Province[]): GameState {
  savedGame = migrateSave(savedGame);
  const persistedState = savedGame.gameState;
  if (isLegacyGameState(persistedState)) {
    return persistedState;
  }

  const ownership = new Map<string, string | null>();
  persistedState.provinceOwners.forEach((entry) => {
    ownership.set(toProvinceKey(entry.id), entry.ownerId);
  });

  const provinces = baseProvinces.map((province) => {
    const nextOwner = ownership.get(toProvinceKey(province.id));
    return {
      ...province,
      ownerId: nextOwner === undefined ? province.ownerId : nextOwner,
    };
  });

  return {
    currentTimelineSnapshotId: persistedState.currentTimelineSnapshotId,
    turn: persistedState.turn,
    players: persistedState.players,
    provinces,
    selectedProvinceId: persistedState.selectedProvinceId,
    theme: persistedState.theme,
    relations: persistedState.relations || [],
    chatThreads: persistedState.chatThreads || [],
    timeline: (persistedState.timeline || []).map((snapshot) => ({
      ...snapshot,
      memory: isTimelineMemory(snapshot.memory) ? snapshot.memory : undefined,
    })),
    advisorHistory: persistedState.advisorHistory || [],
    pendingOrders: persistedState.pendingOrders || [],
    completedStepIds: persistedState.completedStepIds || savedGame.completedStepIds || [],
  };
}

// ---------------------------------------------------------------------------
// localStorage quota monitoring
// ---------------------------------------------------------------------------

export function getStorageUsage(): {
  usedBytes: number;
  estimatedMaxBytes: number;
  percentUsed: number;
} {
  const raw = localStorage.getItem(storageKey()) || '';
  const usedBytes = JSON.stringify(raw).length * 2; // UTF-16
  const estimatedMaxBytes = 5 * 1024 * 1024; // 5MB
  const percentUsed = (usedBytes / estimatedMaxBytes) * 100;
  return { usedBytes, estimatedMaxBytes, percentUsed };
}

// ---------------------------------------------------------------------------
// localStorage backend (renamed from original)
// ---------------------------------------------------------------------------

export function localSaveGame(
  gameState: GameState,
  gameConfig: GameConfig,
  logs: LogEntry[],
  saveName?: string,
  events: GameEvent[] = [],
  storySoFar?: string,
  completedStepIds?: string[]
): string {
  try {
    const saves = localListSavedGames(true);
    const id = saveName || createSaveId();
    const filtered = saves.filter((save) => save.id !== id);

    const previous = saves.find((save) => save.id === id);
    const newSave: SavedGame = {
      cloudRevision: previous?.cloudRevision,
      cloudChecksum: previous?.cloudChecksum,
      id,
      timestamp: Date.now(),
      gameState: toSnapshot(gameState, completedStepIds),
      gameConfig,
      logs: logs.slice(-50),
      events: events.slice(-100),
      storySoFar,
      completedStepIds,
      version: VERSION,
    };

    filtered.push(newSave);
    localStorage.setItem(storageKey(), JSON.stringify(filtered));

    const usage = getStorageUsage();
    if (usage.percentUsed > 80) {
      console.warn(
        `localStorage usage at ${usage.percentUsed.toFixed(1)}%. Consider deleting old saves.`
      );
    }

    return id;
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      throw new Error('Storage quota exceeded. Please delete some saves.');
    }
    throw error;
  }
}

export function localLoadGame(id: string): SavedGame | null {
  try {
    const saves = localListSavedGames();
    return saves.find((save) => save.id === id) || null;
  } catch (error) {
    console.error('Failed to load game:', error);
    return null;
  }
}

export function localListSavedGames(strict = false): SavedGame[] {
  try {
    const data = localStorage.getItem(storageKey());
    if (!data) return [];

    const parsed = JSON.parse(data) as Partial<SavedGame>[];
    if (
      !Array.isArray(parsed) ||
      (strict &&
        parsed.some(
          (save) => !save || typeof save.id !== 'string' || !save.gameState || !save.gameConfig
        ))
    )
      throw new Error('Saved games data is unreadable; existing data was preserved.');
    const saves: SavedGame[] = parsed
      .filter((save): save is Partial<SavedGame> => {
        return !!save && typeof save.id === 'string' && !!save.gameState && !!save.gameConfig;
      })
      .map((save) =>
        migrateSave({
          ...save,
          id: save.id as string,
          timestamp: typeof save.timestamp === 'number' ? save.timestamp : Date.now(),
          gameState: save.gameState as PersistedGameState,
          gameConfig: save.gameConfig as GameConfig,
          logs: Array.isArray(save.logs) ? (save.logs as LogEntry[]) : [],
          events: Array.isArray(save.events) ? (save.events as GameEvent[]) : [],
          storySoFar: typeof save.storySoFar === 'string' ? save.storySoFar : undefined,
          completedStepIds: Array.isArray(save.completedStepIds)
            ? (save.completedStepIds as string[])
            : undefined,
          version: typeof save.version === 'string' ? save.version : '1.0.0',
        })
      );

    saves.sort((a, b) => b.timestamp - a.timestamp);

    const uniqueById: SavedGame[] = [];
    const seen = new Set<string>();
    saves.forEach((save) => {
      if (seen.has(save.id)) return;
      seen.add(save.id);
      uniqueById.push(save);
    });

    return uniqueById;
  } catch (error) {
    if (strict) throw new Error('Saved games data is unreadable; existing data was preserved.');
    console.error('Failed to list saves:', error);
    return [];
  }
}

export function localDeleteGame(id: string): void {
  try {
    const saves = localListSavedGames(true);
    const filtered = saves.filter((save) => save.id !== id);
    localStorage.setItem(storageKey(), JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete game:', error);
  }
}

/**
 * Validate + import a parsed JSON export into local storage. Accepts
 * either the wrapped export shape ({format, save}) or a bare SavedGame.
 * Strips any apiKey from the imported config — never trust a file off
 * disk to have done that itself. Returns the saved id, or throws with
 * a user-readable message on bad shape.
 */
export function importSavedGame(parsed: unknown): string {
  const obj = parsed as Record<string, unknown> | null;
  if (!obj || typeof obj !== 'object') {
    throw new Error('Save file is empty or not JSON.');
  }
  // Unwrap the {format, save} export wrapper if present.
  const candidate =
    obj.format === 'open-historia-save' && obj.save && typeof obj.save === 'object'
      ? (obj.save as Record<string, unknown>)
      : obj;

  if (typeof candidate.id !== 'string' || !candidate.gameState || !candidate.gameConfig) {
    throw new Error('File is not a valid Open Historia save.');
  }

  const sanitizedConfig = redactConfig(candidate.gameConfig) as Record<string, unknown>;

  const save: SavedGame = {
    id: candidate.id,
    timestamp: typeof candidate.timestamp === 'number' ? candidate.timestamp : Date.now(),
    version: typeof candidate.version === 'string' ? candidate.version : VERSION,
    gameState: candidate.gameState as GameState,
    gameConfig: sanitizedConfig as unknown as GameConfig,
    logs: Array.isArray(candidate.logs) ? (candidate.logs as LogEntry[]).slice(-50) : [],
    events: Array.isArray(candidate.events) ? (candidate.events as GameEvent[]).slice(-100) : [],
    storySoFar: typeof candidate.storySoFar === 'string' ? candidate.storySoFar : undefined,
    completedStepIds: Array.isArray(candidate.completedStepIds)
      ? (candidate.completedStepIds as string[])
      : undefined,
  };

  backupLocal();
  const saves = localListSavedGames().filter((s) => s.id !== save.id);
  saves.push(save);
  localStorage.setItem(storageKey(), JSON.stringify(saves));
  return save.id;
}

// ---------------------------------------------------------------------------
// Cloud backend (calls API routes)
// ---------------------------------------------------------------------------

async function cloudRequest(path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(path, {
      ...init,
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}
async function writeHeaders() {
  const generation = _generation;
  if (!_csrf) {
    const response = await cloudRequest('/api/player');
    if (!response.ok) throw new Error('Sign in again to save to cloud');
    const session = (await response.json()) as { user: { id: string }; csrfToken: string };
    if (generation !== _generation || session.user.id !== _accountId)
      throw new Error('Account changed; local campaign kept');
    _csrf = session.csrfToken;
  }
  return { 'Content-Type': 'application/json', 'X-CSRF-Token': _csrf };
}
async function writeCampaign(
  save: SavedGame,
  base?: { revision: number; checksum: string }
): Promise<string> {
  const generation = _generation;
  const account = _accountId;
  if (!account || _playingOwner !== account)
    throw new Error('Import this guest journey explicitly before cloud saving');
  const currentBase =
    base ||
    bases.get(save.id) ||
    (save.cloudRevision !== undefined && save.cloudChecksum
      ? { revision: save.cloudRevision, checksum: save.cloudChecksum }
      : undefined);
  const headers = await writeHeaders();
  if (generation !== _generation) throw new Error('Account changed');
  const { cloudRevision: _revision, cloudChecksum: _checksum, ...payload } = save;
  const res = await cloudRequest('/api/saves', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...payload,
      gameConfig: redactConfig(save.gameConfig),
      expectedRevision: currentBase?.revision || 0,
      expectedChecksum: currentBase?.checksum,
      writeId: crypto.randomUUID(),
    }),
  });
  if (generation !== _generation) throw new Error('Account changed; local campaign kept');
  if (!res.ok) {
    status({
      phase: res.status === 409 ? 'conflict' : 'offline',
      id: save.id,
      message:
        res.status === 409
          ? 'Cloud campaign changed on another device. Choose cloud, local, or keep both.'
          : 'Cloud save unavailable; local campaign kept.',
    });
    throw new Error(`Cloud save failed: ${res.status}`);
  }
  const result = (await res.json()) as { cloudRevision: number; cloudChecksum: string };
  bases.set(save.id, { revision: result.cloudRevision, checksum: result.cloudChecksum });
  const local = localListSavedGames(true);
  const index = local.findIndex((item) => item.id === save.id);
  if (index >= 0) {
    local[index] = {
      ...local[index],
      cloudRevision: result.cloudRevision,
      cloudChecksum: result.cloudChecksum,
    };
    localStorage.setItem(storageKey(), JSON.stringify(local));
  }
  status({ phase: 'saved', id: save.id });
  return save.id;
}
async function cloudSaveGame(
  _gameState: GameState,
  _gameConfig: GameConfig,
  _logs: LogEntry[],
  saveName?: string,
  _events: GameEvent[] = [],
  _storySoFar?: string,
  _completedStepIds?: string[]
): Promise<string> {
  const local = saveName ? localLoadGame(saveName) : null;
  if (!local) throw new Error('Local checkpoint is missing');
  return writeCampaign(local);
}

async function cloudLoadGame(id: string, replaceLocal = false): Promise<SavedGame | null> {
  const generation = _generation;
  const account = _accountId;
  const res = await cloudRequest(`/api/saves/${encodeURIComponent(id)}`);
  if (generation !== _generation) return null;
  if (!res.ok) return null;
  const data = (await res.json()) as { save?: SavedGame };
  const save = data.save;
  if (!save || !account) return null;
  if (save.version && save.version.localeCompare(VERSION, undefined, { numeric: true }) > 0)
    throw new Error('Update the game to use this newer campaign');
  const cachedRaw = localStorage.getItem(storageKey(account));
  let cached: SavedGame | undefined;
  if (cachedRaw) {
    const collection = JSON.parse(cachedRaw) as SavedGame[];
    cached = collection.find((item) => item.id === id);
  }
  if (cached && !replaceLocal) {
    const { cloudRevision: _revision, cloudChecksum: _checksum, ...cachedPayload } = cached;
    const normalized = normalizePayload('open-historia', JSON.stringify(cachedPayload));
    const acknowledged =
      normalized && cached.cloudChecksum && (await checksum(normalized)) === cached.cloudChecksum;
    if (!acknowledged) {
      _playingOwner = account;
      status({
        phase: 'conflict',
        id,
        message:
          'Local campaign has progress not acknowledged by cloud. Choose which version to continue.',
      });
      return cached;
    }
  }
  backupLocal();
  _playingOwner = account;
  backupLocal();
  if (save.cloudRevision !== undefined && save.cloudChecksum)
    bases.set(id, { revision: save.cloudRevision, checksum: save.cloudChecksum });
  const local = localListSavedGames(true).filter((item) => item.id !== save.id);
  local.push(save);
  localStorage.setItem(storageKey(), JSON.stringify(local));
  status({ phase: 'saved', id: save.id });

  // Re-inject apiKey from localStorage
  if (save.gameConfig && typeof save.gameConfig === 'object') {
    const provider = save.gameConfig.provider;
    if (provider && provider !== 'local') {
      const storageKey = `oh_key_${provider}`;
      try {
        const { decryptKey } = await import('@/lib/crypto');
        const encrypted = localStorage.getItem(storageKey);
        if (encrypted) {
          const decrypted = decryptKey(encrypted);
          if (decrypted) {
            save.gameConfig.apiKey = decrypted;
          }
        }
      } catch {
        // Can't re-inject key, user will need to re-enter
      }
    }
  }

  return migrateSave({
    ...save,
    id: save.id,
    timestamp: save.timestamp,
    gameState: save.gameState,
    gameConfig: save.gameConfig,
    logs: save.logs || [],
    events: save.events || [],
    storySoFar: save.storySoFar,
    completedStepIds: save.completedStepIds,
    version: save.version || '2.0.0',
  });
}

async function cloudListSavedGames(): Promise<SavedGame[]> {
  const generation = _generation;
  const res = await cloudRequest('/api/saves');
  if (generation !== _generation) return [];
  if (!res.ok) return [];
  const data = (await res.json()) as { saves?: Record<string, unknown>[] };
  // The listing endpoint returns metadata only (no full JSON blobs)
  // Convert to SavedGame-compatible shape for display
  return (data.saves || []).map(
    (s: Record<string, unknown>) =>
      ({
        id: s.id as string,
        timestamp: s.timestamp as number,
        gameState: { turn: s.turn as number } as PersistedGameState,
        gameConfig: {
          scenario: s.scenario,
          playerNationId: s.playerNationId,
          provider: s.provider,
          model: s.model,
          difficulty: s.difficulty,
        } as unknown as GameConfig,
        logs: [],
        events: [],
        storySoFar: s.storySoFar as string | undefined,
        completedStepIds: Array.isArray(s.completedStepIds) ? s.completedStepIds : undefined,
        version: (s.version as string) || '2.0.0',
      }) as SavedGame
  );
}

async function cloudDeleteGame(id: string): Promise<void> {
  const base = bases.get(id);
  if (!base) throw new Error('Load the cloud campaign before deleting it');
  const generation = _generation;
  const headers = await writeHeaders();
  if (generation !== _generation) throw new Error('Account changed');
  const response = await cloudRequest(`/api/saves/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({
      expectedRevision: base.revision,
      expectedChecksum: base.checksum,
      writeId: crypto.randomUUID(),
    }),
  });
  if (!response.ok) throw new Error('Cloud campaign changed; preserved');
}

// ---------------------------------------------------------------------------
// Unified async exports (dual-backend dispatch)
// ---------------------------------------------------------------------------

export async function saveGame(
  gameState: GameState,
  gameConfig: GameConfig,
  logs: LogEntry[],
  saveName?: string,
  events: GameEvent[] = [],
  storySoFar?: string,
  completedStepIds?: string[]
): Promise<string> {
  // Always write to localStorage
  const id = localSaveGame(
    gameState,
    gameConfig,
    logs,
    saveName,
    events,
    storySoFar,
    completedStepIds
  );

  const unresolved = cloudStatus.phase === 'conflict' && cloudStatus.id === id;
  if (!unresolved) status({ phase: 'local', id });
  // Guest or another account's active journey requires an explicit import.
  if (_authenticated && _playingOwner === _accountId && !unresolved) {
    try {
      await cloudSaveGame(
        gameState,
        gameConfig,
        logs,
        saveName || id,
        events,
        storySoFar,
        completedStepIds
      );
    } catch {
      if (cloudStatus.phase !== 'conflict')
        status({ phase: 'offline', id, message: 'Cloud save failed; local campaign kept.' });
    }
  }

  return id;
}

export async function loadGame(id: string): Promise<SavedGame | null> {
  if (_authenticated) {
    try {
      const cloudSave = await cloudLoadGame(id);
      if (cloudSave) return cloudSave;
    } catch (err) {
      console.error('Cloud load failed, falling back to localStorage:', err);
    }
  }
  return localLoadGame(id);
}

export async function listSavedGames(): Promise<SavedGame[]> {
  const localSaves = localListSavedGames();

  if (_authenticated) {
    try {
      const cloudSaves = await cloudListSavedGames();
      // Merge: cloud saves take precedence, then add local-only saves
      const cloudIds = new Set(cloudSaves.map((s) => s.id));
      const localOnly = localSaves.filter((s) => !cloudIds.has(s.id));
      const merged = [...cloudSaves, ...localOnly];
      merged.sort((a, b) => b.timestamp - a.timestamp);
      return merged;
    } catch (err) {
      console.error('Cloud list failed, using localStorage only:', err);
    }
  }

  return localSaves;
}

export async function deleteGame(id: string): Promise<void> {
  localDeleteGame(id);

  if (_authenticated) {
    try {
      await cloudDeleteGame(id);
    } catch (err) {
      console.error('Cloud delete failed:', err);
    }
  }
}

export function getLatestSave(): SavedGame | null {
  const saves = localListSavedGames();
  return saves.length > 0 ? saves[0] : null;
}

// ---------------------------------------------------------------------------
// Upload localStorage saves to cloud (migration)
// ---------------------------------------------------------------------------

export async function uploadLocalSavesToCloud(): Promise<{
  uploaded: number;
  alreadyPresent: number;
  conflicts: { id: string }[];
}> {
  const localSaves = guestSavedGames();
  if (!localSaves.length) return { uploaded: 0, alreadyPresent: 0, conflicts: [] };
  backupLocal(null);
  const generation = _generation;
  const headers = await writeHeaders();
  if (generation !== _generation) throw new Error('Account changed');
  const res = await cloudRequest('/api/saves/upload', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      saves: localSaves.map((save) => ({ ...save, gameConfig: redactConfig(save.gameConfig) })),
    }),
  });
  if (generation !== _generation) throw new Error('Account changed; guest copies kept');
  if (!res.ok) throw new Error(`Upload failed: ${res.status}; guest copies kept`);
  return (await res.json()) as {
    uploaded: number;
    alreadyPresent: number;
    conflicts: { id: string }[];
  };
}

/** Called by account UI only after the player explicitly chooses the local conflict copy. */
export async function resolveCampaignConflict(
  id: string,
  choice: 'local' | 'keep-both' | 'cloud'
): Promise<SavedGame | null> {
  if (choice === 'cloud') return cloudLoadGame(id, true);
  const save = localLoadGame(id);
  if (!save) throw new Error('Local campaign is missing');
  backupLocal();
  if (choice === 'keep-both') {
    const copy = {
      ...save,
      id: createSaveId(),
      cloudRevision: undefined,
      cloudChecksum: undefined,
    };
    const local = localListSavedGames(true);
    local.push(copy);
    localStorage.setItem(storageKey(), JSON.stringify(local));
    await writeCampaign(copy, { revision: 0, checksum: '' });
    return copy;
  }
  const generation = _generation;
  const response = await cloudRequest(
    `/api/player/games/open-historia/saves/${encodeURIComponent(id)}`
  );
  if (generation !== _generation) throw new Error('Account changed');
  if (!response.ok && response.status !== 404)
    throw new Error('Cloud unavailable; local campaign kept');
  const current = response.ok
    ? (
        (await response.json()) as {
          save: { revision: number; checksum: string; schemaVersion: string };
        }
      ).save
    : null;
  if (current && current.schemaVersion.localeCompare(VERSION, undefined, { numeric: true }) > 0)
    throw new Error('Update the game before replacing this newer campaign');
  await writeCampaign(save, {
    revision: current?.revision || 0,
    checksum: current?.checksum || '',
  });
  return save;
}

// ---------------------------------------------------------------------------
// Auto-save (debounced, async)
// ---------------------------------------------------------------------------

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

export function autoSave(
  gameState: GameState,
  gameConfig: GameConfig,
  logs: LogEntry[],
  events: GameEvent[],
  delay: number = 2000,
  saveName: string = 'autosave',
  storySoFar?: string,
  completedStepIds?: string[]
): void {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  autoSaveTimer = setTimeout(() => {
    saveGame(gameState, gameConfig, logs, saveName, events, storySoFar, completedStepIds).catch(
      (err) => {
        console.error('Auto-save failed:', err);
      }
    );
  }, delay);
}
