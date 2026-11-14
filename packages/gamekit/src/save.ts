import type { Platform } from "./platform/types";

/** Conservative guard: YT's exit-flush limit is 64 KiB (overall MUST is 3 MB). */
export const MAX_SAVE_BYTES = 64 * 1024;

export interface SaveEnvelope<T> {
  version: number;
  savedAt: number;
  state: T;
}

/** Upgrades a state object from schema `version` to `version + 1`. */
export type Migration = (state: unknown) => unknown;

export interface SaveManagerOptions<T> {
  platform: Platform;
  /** Current schema version. */
  version: number;
  /** migrations[v] upgrades v → v+1; must exist for every v below `version`. */
  migrations?: Record<number, Migration>;
  initial: () => T;
}

export interface LoadResult<T> {
  state: T;
  /** null when there was no (usable) save — no offline progress to grant. */
  savedAt: number | null;
}

export interface SaveManager<T> {
  load(): Promise<LoadResult<T>>;
  save(state: T): Promise<void>;
}

/**
 * Versioned persistence over a Platform. Enforces the YT-certification rules:
 * load always precedes save, old-version saves migrate forward instead of
 * erroring, and payloads stay under the size guard.
 */
export function createSaveManager<T>(opts: SaveManagerOptions<T>): SaveManager<T> {
  const { platform, version, initial } = opts;
  const migrations = opts.migrations ?? {};
  let loaded = false;
  let latest: T | null = null;
  let snapshotRequestsAllowed = false;

  const fresh = (allowSnapshot = false): LoadResult<T> => {
    snapshotRequestsAllowed = allowSnapshot;
    latest = initial();
    return { state: latest, savedAt: null };
  };

  const manager: SaveManager<T> = {
    async load() {
      loaded = true;
      const raw = await platform.loadData();
      if (raw === null) return fresh(true);

      let envelope: SaveEnvelope<unknown>;
      try {
        envelope = JSON.parse(raw) as SaveEnvelope<unknown>;
      } catch {
        return fresh();
      }
      if (
        typeof envelope !== "object" ||
        envelope === null ||
        typeof envelope.version !== "number" ||
        typeof envelope.savedAt !== "number"
      ) {
        return fresh();
      }

      let { version: saveVersion, state } = envelope;
      while (saveVersion < version) {
        const migrate = migrations[saveVersion];
        if (!migrate) return fresh();
        state = migrate(state);
        saveVersion += 1;
      }
      // A save from a NEWER build (downgrade) can't be trusted; start fresh
      // rather than corrupt it. The old save survives until the next save().
      if (saveVersion > version) return fresh();

      snapshotRequestsAllowed = true;
      latest = state as T;
      return { state: state as T, savedAt: envelope.savedAt };
    },

    async save(state: T) {
      if (!loaded) {
        throw new Error("save() called before load() — always load first (YT cert rule)");
      }
      const envelope: SaveEnvelope<T> = { version, savedAt: Date.now(), state };
      const raw = JSON.stringify(envelope);
      const bytes = new TextEncoder().encode(raw).length;
      if (bytes > MAX_SAVE_BYTES) {
        throw new Error(`save is ${bytes} bytes, over the ${MAX_SAVE_BYTES} byte guard`);
      }
      await platform.saveData(raw);
      latest = state;
    },
  };
  platform.onSaveRequest?.(async () => {
    if (loaded && snapshotRequestsAllowed && latest !== null) await manager.save(latest);
  });
  return manager;
}
