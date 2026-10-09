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

export function setAuthenticated(value: boolean) {
  _authenticated = value;
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
  const raw = localStorage.getItem(STORAGE_KEY) || '';
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

    const newSave: SavedGame = {
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

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
    const data = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
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

  const sanitizedConfig = {
    ...(candidate.gameConfig as Record<string, unknown>),
    apiKey: '',
  };

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

  const saves = localListSavedGames().filter((s) => s.id !== save.id);
  saves.push(save);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
  return save.id;
}

// ---------------------------------------------------------------------------
// Cloud backend (calls API routes)
// ---------------------------------------------------------------------------

async function cloudSaveGame(
  gameState: GameState,
  gameConfig: GameConfig,
  logs: LogEntry[],
  saveName?: string,
  events: GameEvent[] = [],
  storySoFar?: string,
  completedStepIds?: string[]
): Promise<string> {
  const id = saveName || createSaveId();
  const res = await fetch('/api/saves', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      timestamp: Date.now(),
      version: VERSION,
      gameState: toSnapshot(gameState, completedStepIds),
      gameConfig, // apiKey stripped server-side
      logs: logs.slice(-50),
      events: events.slice(-100),
      storySoFar,
      completedStepIds,
    }),
  });
  if (!res.ok) throw new Error(`Cloud save failed: ${res.status}`);
  return id;
}

async function cloudLoadGame(id: string): Promise<SavedGame | null> {
  const res = await fetch(`/api/saves/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { save?: SavedGame };
  const save = data.save;
  if (!save) return null;

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
  const res = await fetch('/api/saves');
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
  await fetch(`/api/saves/${encodeURIComponent(id)}`, { method: 'DELETE' });
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

  // Also write to cloud if authenticated
  if (_authenticated) {
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
    } catch (err) {
      console.error('Cloud save failed, localStorage fallback used:', err);
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

export async function uploadLocalSavesToCloud(): Promise<number> {
  const localSaves = localListSavedGames();
  if (localSaves.length === 0) return 0;

  const res = await fetch('/api/saves/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ saves: localSaves }),
  });

  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const data = (await res.json()) as { uploaded?: number };
  return data.uploaded || 0;
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
