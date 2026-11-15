import type { CloudSave, GameId, SaveHead, SaveMetadata, SaveWrite } from "@games/cloud-contract";

export type CloudPhase =
  | "checking"
  | "guest"
  | "local"
  | "saving"
  | "saved"
  | "offline"
  | "conflict"
  | "update-required";
export interface CloudUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}
export interface CloudConflict {
  reason: "import" | "diverged" | "cloud-available" | "account-changed";
  local: { bytes: number; savedAt: number; owner: string | null } | null;
  cloud: SaveHead | null;
  cached: { bytes: number; savedAt: number; owner: string } | null;
}
export interface CloudState {
  gameId: GameId | null;
  user: CloudUser | null;
  phase: CloudPhase;
  localSavedAt: number | null;
  cloudAcknowledgedAt: number | null;
  conflict: CloudConflict | null;
  paused: boolean;
  reloadRequired: boolean;
  message: string | null;
}
export interface PersistenceHost {
  loadData(key: string): Promise<string | null>;
  saveData(key: string, data: string): Promise<void>;
  onPauseChange(callback: (paused: boolean) => void): () => void;
  registerSaveRequest(callback: () => void | Promise<void>): () => void;
}
interface LocalCopy {
  data: string;
  savedAt: number;
  revision: number;
  checksum: string;
  owner: string | null;
  slot: string;
}
interface RuntimeOptions {
  gameId: GameId | null;
  maxSchemaVersion?: number;
  authority?: string;
  storage: Storage;
  fetch: typeof fetch;
  location: { href: string; assign(url: string): void };
  now?: () => number;
}
const KEY = "playables:v1:";
const byteLength = (data: string) => new TextEncoder().encode(data).length;
const payloadVersion = (data: string) => {
  try {
    return Number(JSON.parse(data).version);
  } catch {
    return NaN;
  }
};
function comparable(data: string) {
  try {
    const value = JSON.parse(data);
    delete value.savedAt;
    return JSON.stringify(value);
  } catch {
    return data;
  }
}

/** Web-only account coordinator. Local persistence succeeds independently of every network operation. */
export class PlayablesCloud implements PersistenceHost {
  readonly #options: RuntimeOptions;
  readonly #listeners = new Set<(state: CloudState) => void>();
  readonly #pauseListeners = new Set<(paused: boolean) => void>();
  readonly #saveRequests = new Set<() => void | Promise<void>>();
  #state: CloudState;
  #generation = 0;
  #csrf = "";
  #storageKey: string | null = null;
  #owner: string | null = null;
  #copy: LocalCopy | null = null;
  #cloud: CloudSave | null = null;
  #cached: LocalCopy | null = null;
  #cachedKey: string | null = null;
  #pending: SaveWrite | null = null;
  #inFlight: number | null = null;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #lastAttempt = 0;
  #offlineChoice = false;
  #started = false;
  #panelOpen = false;
  #runtimePaused = false;
  #recoveryKey: string | null = null;
  #restoreRequest:
    | ((data: string, owner: string, slot: string) => Promise<"story" | "original">)
    | null = null;
  constructor(options: RuntimeOptions) {
    this.#options = options;
    this.#state = {
      gameId: options.gameId,
      user: null,
      phase: "checking",
      localSavedAt: null,
      cloudAcknowledgedAt: null,
      conflict: null,
      paused: false,
      reloadRequired: false,
      message: null,
    };
  }
  getState = (): CloudState => structuredClone(this.#state);
  getSlotId = () => this.#copy?.slot ?? null;
  setPanelOpen(open: boolean) {
    this.#panelOpen = open;
    this.#update({});
  }
  subscribe = (callback: (state: CloudState) => void) => {
    this.#listeners.add(callback);
    callback(this.getState());
    return () => {
      this.#listeners.delete(callback);
    };
  };
  #update(patch: Partial<CloudState>) {
    const wasPaused = this.#state.paused;
    if (patch.paused !== undefined) this.#runtimePaused = patch.paused;
    this.#state = { ...this.#state, ...patch, paused: this.#runtimePaused || this.#panelOpen };
    if (wasPaused !== this.#state.paused)
      for (const callback of this.#pauseListeners) callback(this.#state.paused);
    for (const callback of this.#listeners) callback(this.getState());
  }
  onPauseChange(callback: (paused: boolean) => void) {
    this.#pauseListeners.add(callback);
    callback(this.#state.paused);
    return () => {
      this.#pauseListeners.delete(callback);
    };
  }
  registerSaveRequest(callback: () => void | Promise<void>) {
    this.#saveRequests.add(callback);
    return () => {
      this.#saveRequests.delete(callback);
    };
  }
  registerRestoreRequest(
    callback: (data: string, owner: string, slot: string) => Promise<"story" | "original">,
  ) {
    this.#restoreRequest = callback;
    return () => {
      this.#restoreRequest = null;
    };
  }
  async captureExternal(data: string, slot: "story" | "original") {
    const key = `save:war-chest:${slot}`;
    if (this.#storageKey !== key) {
      const initial = !this.#started;
      if (!initial) this.#options.storage.removeItem(this.#resumeKey());
      ++this.#generation;
      this.#storageKey = key;
      this.#owner = null;
      this.#cloud = null;
      this.#pending = null;
      this.#persist({ data, slot, owner: null, revision: 0, checksum: "", savedAt: this.#now() });
      this.#started = true;
      if (initial && this.#options.storage.getItem(this.#resumeKey())) {
        this.#update({ paused: true });
        await this.#resume();
        const resumed = this.#copy as LocalCopy | null;
        if (this.#owner && resumed && this.#restoreRequest)
          await this.#applyRestore(resumed.data, this.#owner, resumed.slot);
        this.#update({ paused: false });
      }
      void this.refreshSession();
      return;
    }
    await this.saveData(key, data);
  }
  async #requestSnapshot() {
    for (const callback of this.#saveRequests) await callback();
  }
  #now() {
    return (this.#options.now || Date.now)();
  }
  #key(owner = this.#owner, storageKey = this.#storageKey) {
    return `${KEY}${this.#options.gameId}:${owner || "guest"}:${storageKey}`;
  }
  #read(owner: string | null, storageKey = this.#storageKey): LocalCopy | null {
    const raw = this.#options.storage.getItem(this.#key(owner, storageKey));
    if (raw) {
      try {
        const copy = JSON.parse(raw);
        if (typeof copy.data === "string" && copy.owner === owner) return copy;
      } catch {
        /* retain malformed source for recovery */
      }
    }
    if (owner === null && this.#storageKey) {
      const legacy = this.#options.storage.getItem(this.#storageKey);
      if (legacy)
        return {
          data: legacy,
          savedAt: this.#now(),
          revision: 0,
          checksum: "",
          owner: null,
          slot: "main",
        };
    }
    return null;
  }
  #persist(copy: LocalCopy) {
    const key = this.#key(copy.owner);
    const raw = JSON.stringify(copy);
    this.#options.storage.setItem(key, raw);
    if (this.#options.storage.getItem(key) !== raw) throw new Error("Local save did not persist");
    this.#copy = copy;
    this.#update({ localSavedAt: copy.savedAt });
  }
  #backup(copy = this.#copy, storageKey = this.#storageKey) {
    if (!copy) return;
    const key = `${this.#key(copy.owner, storageKey)}:recovery`;
    this.#recoveryKey = key;
    const raw = JSON.stringify({ createdAt: this.#now(), ...copy });
    this.#options.storage.setItem(key, raw);
    if (this.#options.storage.getItem(key) !== raw)
      throw new Error("Recovery copy did not persist");
  }
  #resumeKey() {
    return this.#options.gameId === "war-chest"
      ? `${KEY}resume:war-chest`
      : `${KEY}resume:${this.#options.gameId}:${this.#storageKey}`;
  }
  #rememberOwner() {
    if (this.#owner)
      this.#options.storage.setItem(
        this.#resumeKey(),
        JSON.stringify({ owner: this.#owner, storageKey: this.#storageKey }),
      );
  }
  async #resume() {
    const raw = this.#options.storage.getItem(this.#resumeKey());
    if (!raw) return;
    let owner: string;
    let storageKey = this.#storageKey;
    try {
      const hint = JSON.parse(raw);
      owner = hint.owner;
      if (
        this.#options.gameId === "war-chest" &&
        ["save:war-chest:story", "save:war-chest:original"].includes(hint.storageKey)
      )
        storageKey = hint.storageKey;
      if (typeof owner !== "string") return;
    } catch {
      return;
    }
    const generation = this.#generation;
    try {
      const response = await this.#fetch("/api/player", {}, 1500);
      if (generation !== this.#generation) return;
      if (!response.ok) {
        if (response.status === 401) this.#options.storage.removeItem(this.#resumeKey());
        return;
      }
      const session = (await response.json()) as { user: CloudUser; csrfToken: string };
      if (generation !== this.#generation) return;
      if (session.user?.id !== owner) {
        this.#options.storage.removeItem(this.#resumeKey());
        return;
      }
      const copy = this.#read(owner, storageKey);
      if (!copy) return;
      this.#storageKey = storageKey;
      this.#owner = owner;
      this.#csrf = session.csrfToken;
      this.#copy = copy;
      this.#update({ user: session.user, phase: "local", localSavedAt: copy.savedAt });
    } catch {
      this.#update({
        phase: "offline",
        message:
          "Account check is unavailable. Your guest and account journeys are kept separately.",
      });
    }
  }
  async loadData(key: string): Promise<string | null> {
    if (this.#storageKey && this.#storageKey !== key)
      throw new Error("One game storage key per host");
    this.#storageKey = key;
    try {
      if (!this.#started) await this.#resume();
      this.#copy = this.#read(this.#owner);
    } catch {
      this.#copy = null;
      this.#update({
        phase: "offline",
        message: "Browser storage is unavailable. Export your journey before closing this tab.",
      });
    }
    this.#update({ localSavedAt: this.#copy?.savedAt || null });
    // Anonymous boot is immediate; a prior account choice gets only the bounded identity check above.
    if (!this.#started) {
      this.#started = true;
      queueMicrotask(() => {
        void this.refreshSession();
      });
    }
    return this.#copy?.data || null;
  }
  async saveData(key: string, data: string): Promise<void> {
    if (!this.#storageKey) await this.loadData(key);
    if (this.#storageKey !== key) throw new Error("Unexpected game storage key");
    if (this.#state.reloadRequired) return;
    const prior = this.#copy;
    // A downgraded client must not replace a newer local/cloud snapshot with a fresh run.
    if (prior && payloadVersion(prior.data) > (this.#options.maxSchemaVersion ?? Infinity)) {
      this.#update({
        phase: "update-required",
        paused: true,
        message: "Update the game to use this newer save.",
      });
      return;
    }
    this.#persist({
      data,
      savedAt: this.#now(),
      revision: prior?.revision || 0,
      checksum: prior?.checksum || "",
      owner: this.#owner,
      slot: prior?.slot || "main",
    });
    if (this.#state.conflict) {
      this.#update({ conflict: { ...this.#state.conflict, local: this.#localSummary() } });
      return;
    }
    if (this.#state.user && this.#owner === this.#state.user.id && !this.#offlineChoice) {
      this.#update({ phase: "local" });
      this.#schedule();
    }
  }
  #schedule() {
    if (this.#timer) return;
    this.#timer = setTimeout(
      () => {
        this.#timer = null;
        void this.#flush();
      },
      Math.max(0, 12000 - (this.#now() - this.#lastAttempt)),
    );
  }
  #url(path: string) {
    return `${this.#options.authority || "https://historia.aliveville.com"}${path}`;
  }
  async #fetch(path: string, init: RequestInit = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await this.#options.fetch(this.#url(path), {
        ...init,
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(init.method && init.method !== "GET" ? { "X-CSRF-Token": this.#csrf } : {}),
          ...init.headers,
        },
      });
    } finally {
      clearTimeout(timer);
    }
  }
  #slotPath(slot = this.#copy?.slot || "main") {
    return `/api/player/games/${this.#options.gameId}/saves/${encodeURIComponent(slot)}`;
  }
  async refreshSession() {
    const generation = ++this.#generation;
    this.#pending = null;
    this.#cloud = null;
    this.#cached = null;
    this.#cachedKey = null;
    this.#csrf = "";
    this.#offlineChoice = false;
    try {
      const response = await this.#fetch("/api/player");
      if (generation !== this.#generation) return;
      if (response.status === 401) {
        if (this.#owner !== null) {
          this.#update({
            user: null,
            phase: "guest",
            paused: true,
            reloadRequired: true,
            message: "Signed out. Reload to return to your guest journey.",
          });
          return;
        }
        this.#update({ user: null, phase: "guest", paused: false, conflict: null, message: null });
        return;
      }
      if (!response.ok) throw new Error("account unavailable");
      const session = (await response.json()) as { user: CloudUser; csrfToken: string };
      if (generation !== this.#generation) return;
      if (!session.user?.id || !session.csrfToken) throw new Error("invalid account response");
      this.#csrf = session.csrfToken;
      this.#update({
        user: session.user,
        paused: Boolean(this.#storageKey),
        message: null,
        ...(this.#state.user?.id !== session.user.id ? { cloudAcknowledgedAt: null } : {}),
      });
      if (!this.#storageKey) {
        this.#update({ phase: "saved", paused: false });
        return;
      }
      await this.#requestSnapshot();
      if (generation !== this.#generation) return;
      let candidateKey = this.#storageKey;
      if (this.#options.gameId === "war-chest") {
        const raw = this.#options.storage.getItem(this.#resumeKey());
        if (raw) {
          try {
            const hint = JSON.parse(raw);
            if (
              hint.owner === session.user.id &&
              ["save:war-chest:story", "save:war-chest:original"].includes(hint.storageKey)
            )
              candidateKey = hint.storageKey;
          } catch {
            /* retain invalid hint */
          }
        }
      }
      const cached = this.#read(session.user.id, candidateKey);
      this.#cached = cached;
      this.#cachedKey = candidateKey;
      const slot = this.#owner === session.user.id ? this.#copy?.slot : cached?.slot;
      const cloudResponse = await this.#fetch(this.#slotPath(slot || this.#copy?.slot || "main"));
      if (generation !== this.#generation) return;
      if (!cloudResponse.ok && cloudResponse.status !== 404) throw new Error("cloud unavailable");
      const cloud =
        cloudResponse.status === 404
          ? null
          : ((await cloudResponse.json()) as { save: CloudSave }).save;
      if (generation !== this.#generation) return;
      this.#cloud = cloud;
      if (cloud && Number(cloud.schemaVersion) > (this.#options.maxSchemaVersion ?? Infinity)) {
        this.#update({
          phase: "update-required",
          paused: true,
          conflict: null,
          message: "This cloud save needs a newer game version. Your local journey is kept.",
        });
        return;
      }
      const local = this.#owner === session.user.id ? this.#copy : cached;
      // Identical verified account bytes can adopt a server receipt lost during tab exit.
      if (
        local &&
        cloud &&
        this.#owner === session.user.id &&
        comparable(local.data) === comparable(cloud.data)
      ) {
        this.#persist({ ...local, revision: cloud.revision, checksum: cloud.checksum });
        this.#update({
          phase: "saved",
          paused: false,
          conflict: null,
          cloudAcknowledgedAt: cloud.updatedAt,
        });
        return;
      }
      // An unchanged acknowledged base permits publishing pending local progress.
      if (
        local &&
        cloud &&
        local.checksum === cloud.checksum &&
        local.revision === cloud.revision
      ) {
        if (this.#owner === session.user.id) {
          this.#update({
            phase: comparable(local.data) === comparable(cloud.data) ? "saved" : "local",
            paused: false,
            conflict: null,
            cloudAcknowledgedAt: cloud.updatedAt,
          });
          if (this.#state.phase === "local") this.#schedule();
          return;
        }
      }
      if (!this.#copy && !cloud && !cached) {
        this.#owner = session.user.id;
        this.#rememberOwner();
        this.#update({ phase: "local", paused: false, conflict: null });
        return;
      }
      this.#conflict(
        this.#owner && this.#owner !== session.user.id
          ? "account-changed"
          : cloud
            ? this.#copy
              ? "diverged"
              : "cloud-available"
            : "import",
        cloud,
      );
    } catch {
      if (generation === this.#generation)
        this.#update({
          phase: "offline",
          paused: false,
          message: "Cloud is unavailable. Local progress is kept.",
        });
    }
  }
  #localSummary() {
    return this.#copy
      ? { bytes: byteLength(this.#copy.data), savedAt: this.#copy.savedAt, owner: this.#copy.owner }
      : null;
  }
  #conflict(reason: CloudConflict["reason"], cloud: CloudSave | null) {
    if (cloud && Number(cloud.schemaVersion) > (this.#options.maxSchemaVersion ?? Infinity)) {
      this.#cloud = cloud;
      this.#update({
        phase: "update-required",
        paused: true,
        conflict: null,
        message: "This cloud journey needs a newer game. Your local copy is kept.",
      });
      return;
    }
    this.#cloud = cloud;
    const metadata = cloud ? (({ data: _data, ...head }) => head)(cloud) : null;
    this.#update({
      phase: "conflict",
      paused: true,
      conflict: {
        reason,
        local: this.#localSummary(),
        cloud: metadata,
        cached:
          this.#cached?.owner && this.#cached.data !== this.#copy?.data
            ? {
                bytes: byteLength(this.#cached.data),
                savedAt: this.#cached.savedAt,
                owner: this.#cached.owner,
              }
            : null,
      },
      message: "Choose which journey to continue. Both versions are preserved until you choose.",
    });
  }
  async signIn() {
    await this.#requestSnapshot();
    this.#backup();
    let response: Response;
    try {
      response = await this.#fetch("/api/auth/sign-in/social", {
        method: "POST",
        body: JSON.stringify({ provider: "google", callbackURL: this.#options.location.href }),
      });
    } catch {
      this.#update({
        message: "Google sign-in could not connect. Local progress is kept; try again.",
      });
      return;
    }
    if (!response.ok) {
      this.#update({ message: "Google sign-in is unavailable. Local progress is kept." });
      return;
    }
    const result = (await response.json()) as { url?: string };
    if (result.url) {
      const target = new URL(result.url);
      if (target.protocol === "https:" && target.hostname === "accounts.google.com")
        this.#options.location.assign(target.href);
      else throw new Error("Unexpected sign-in destination");
    }
  }
  async signOut() {
    const before = this.#generation;
    await this.#requestSnapshot();
    if (before !== this.#generation)
      throw new Error("Account changed. Refresh before signing out.");
    this.#backup();
    const generation = ++this.#generation;
    this.#csrf = "";
    this.#pending = null;
    this.#cloud = null;
    const response = await this.#fetch("/api/auth/sign-out", { method: "POST", body: "{}" });
    if (generation !== this.#generation) return;
    if (!response.ok) {
      await this.refreshSession();
      return;
    }
    this.#options.storage.removeItem(this.#resumeKey());
    this.#update({
      user: null,
      phase: "guest",
      paused: true,
      conflict: null,
      reloadRequired: true,
      message: "Signed out. Reload to continue your guest journey.",
    });
  }
  async checkpoint() {
    await this.#requestSnapshot();
    await this.#flush();
  }
  async #flush() {
    const user = this.#state.user;
    if (
      !user ||
      this.#owner !== user.id ||
      !this.#copy ||
      this.#offlineChoice ||
      this.#runtimePaused ||
      this.#state.conflict ||
      this.#inFlight === this.#generation
    )
      return;
    const generation = this.#generation;
    const copy = this.#copy;
    if (this.#cloud && comparable(copy.data) === comparable(this.#cloud.data)) {
      this.#update({ phase: "saved" });
      return;
    }
    this.#inFlight = generation;
    this.#lastAttempt = this.#now();
    this.#update({ phase: "saving" });
    try {
      const metadata = this.#metadata(copy.data);
      const pending = this.#pending || {
        expectedRevision: copy.revision,
        expectedChecksum: copy.checksum || undefined,
        writeId: crypto.randomUUID(),
        envelope: { schemaVersion: String(payloadVersion(copy.data)), data: copy.data, metadata },
      };
      this.#pending = pending;
      const response = await this.#fetch(this.#slotPath(copy.slot), {
        method: "PUT",
        body: JSON.stringify(pending),
      });
      if (generation !== this.#generation) return;
      if (response.status === 401) {
        this.#pending = null;
        this.#update({
          phase: "offline",
          paused: true,
          message: "Your session expired. Sign in again; local progress is kept.",
        });
        return;
      }
      if (response.status === 409) {
        this.#pending = null;
        const latest = await this.#fetch(this.#slotPath(copy.slot));
        if (generation !== this.#generation) return;
        this.#conflict(
          "diverged",
          latest.ok ? ((await latest.json()) as { save: CloudSave }).save : null,
        );
        return;
      }
      if (!response.ok) {
        this.#update({
          phase: "offline",
          message:
            response.status === 413
              ? "Cloud storage is full. Local progress and recovery copies are kept."
              : "Cloud save failed. Local progress is kept.",
        });
        return;
      }
      const result = (await response.json()) as { head: SaveHead };
      if (generation !== this.#generation) return;
      this.#pending = null;
      this.#cloud = { ...result.head, data: pending.envelope.data };
      if (this.#copy?.owner === user.id) {
        this.#persist({
          ...this.#copy,
          revision: result.head.revision,
          checksum: result.head.checksum,
        });
      }
      this.#update({
        phase: this.#copy?.data === pending.envelope.data ? "saved" : "local",
        cloudAcknowledgedAt: this.#now(),
        message: null,
      });
    } catch {
      if (generation === this.#generation)
        this.#update({ phase: "offline", message: "Cloud save failed. Local progress is kept." });
    } finally {
      if (this.#inFlight === generation) this.#inFlight = null;
      if (generation === this.#generation && this.#state.phase === "local") this.#schedule();
    }
  }
  #metadata(data: string): SaveMetadata {
    try {
      const value = JSON.parse(data);
      return {
        title:
          this.#options.gameId === "idle-startup"
            ? value.state?.companyName || "My company"
            : this.#options.gameId === "war-chest"
              ? "War Chest campaign"
              : "Ember Road journey",
        ...(typeof value.state?.chapter === "number" ? { chapter: value.state.chapter } : {}),
      };
    } catch {
      return { title: "Saved journey" };
    }
  }
  async #applyRestore(data: string, owner: string, slot: string) {
    const generation = this.#generation;
    const mode = await this.#restoreRequest?.(data, owner, slot);
    if (generation !== this.#generation)
      throw new Error("Account changed during restore; recovery is kept.");
    if (this.#options.gameId === "war-chest" && (mode === "story" || mode === "original"))
      this.#storageKey = `save:war-chest:${mode}`;
  }
  #protectTarget(owner: string, data: string) {
    const existing = this.#read(owner);
    if (existing && existing.data !== data) this.#backup(existing);
  }
  async resolveConflict(choice: "cloud" | "local" | "cached" | "keep-both" | "offline") {
    if (!this.#state.conflict || !this.#state.user) return;
    const generation = this.#generation;
    await this.#requestSnapshot();
    if (generation !== this.#generation)
      throw new Error("Account changed. Review the journeys again.");
    this.#backup();
    if (this.#cached && this.#cached.data !== this.#copy?.data)
      this.#backup(this.#cached, this.#cachedKey);
    if (choice === "offline") {
      this.#offlineChoice = true;
      this.#update({
        phase: "offline",
        paused: false,
        conflict: null,
        message: "Playing locally. Cloud versions are kept.",
      });
      return;
    }
    const user = this.#state.user;
    const cloud = this.#cloud;
    if (choice === "cloud") {
      if (!cloud) throw new Error("No cloud save to restore");
      this.#pending = null;
      if (this.#restoreRequest) await this.#applyRestore(cloud.data, user.id, cloud.slotId);
      if (generation !== this.#generation)
        throw new Error("Account changed during restore. Recovery is kept.");
      this.#protectTarget(user.id, cloud.data);
      this.#owner = user.id;
      this.#persist({
        data: cloud.data,
        savedAt: this.#now(),
        revision: cloud.revision,
        checksum: cloud.checksum,
        owner: user.id,
        slot: cloud.slotId,
      });
      this.#rememberOwner();
      if (this.#restoreRequest) {
        this.#update({
          phase: "saved",
          paused: false,
          conflict: null,
          reloadRequired: false,
          message: "Cloud journey restored.",
        });
      } else
        this.#update({
          phase: "saved",
          paused: true,
          conflict: null,
          reloadRequired: true,
          message: "Cloud journey restored locally. Reload to play it.",
        });
      return;
    }
    const source = choice === "cached" ? this.#cached : this.#copy;
    if (!source) throw new Error("No local save to import");
    const slot =
      choice === "keep-both" ? `journey-${crypto.randomUUID()}` : cloud?.slotId || source.slot;
    if (this.#restoreRequest) await this.#applyRestore(source.data, user.id, slot);
    if (generation !== this.#generation)
      throw new Error("Account changed during restore. Recovery is kept.");
    this.#protectTarget(user.id, source.data);
    this.#owner = user.id;
    // Local explicitly replaces only the revision shown by this conflict. CAS still protects a subsequent device write.
    this.#persist({
      ...source,
      owner: user.id,
      slot,
      revision: choice === "keep-both" ? 0 : cloud?.revision || 0,
      checksum: choice === "keep-both" ? "" : cloud?.checksum || "",
    });
    this.#rememberOwner();
    this.#pending = null;
    if (choice === "cached" && !this.#restoreRequest) {
      this.#update({
        conflict: null,
        paused: true,
        reloadRequired: true,
        phase: "local",
        message: "Cached account journey restored. Reload to continue it.",
      });
      return;
    }
    this.#update({ conflict: null, paused: false, phase: "local", message: null });
    await this.#flush();
  }
  exportLocal(): { filename: string; data: string } | null {
    if (!this.#copy) return null;
    return {
      filename: `${this.#options.gameId}-${this.#copy.slot}-${this.#now()}.json`,
      data: this.#copy.data,
    };
  }
  exportRecovery(): { filename: string; data: string } | null {
    const raw = this.#options.storage.getItem(this.#recoveryKey || `${this.#key()}:recovery`);
    if (!raw) return null;
    const copy = JSON.parse(raw) as LocalCopy;
    return { filename: `${this.#options.gameId}-recovery-${copy.savedAt}.json`, data: copy.data };
  }
  async list(): Promise<SaveHead[]> {
    if (!this.#state.user || !this.#options.gameId) return [];
    const generation = this.#generation;
    const response = await this.#fetch(`/api/player/games/${this.#options.gameId}/saves`);
    if (generation !== this.#generation || !response.ok) return [];
    return ((await response.json()) as { saves: SaveHead[] }).saves;
  }
  async history(slot = this.#copy?.slot || "main"): Promise<SaveHead[]> {
    if (!this.#state.user) return [];
    const generation = this.#generation;
    const response = await this.#fetch(`${this.#slotPath(slot)}/history`);
    if (generation !== this.#generation || !response.ok) return [];
    return ((await response.json()) as { history: SaveHead[] }).history;
  }
  async restore(slot: string) {
    const generation = this.#generation;
    const response = await this.#fetch(this.#slotPath(slot));
    if (generation !== this.#generation || !response.ok) return;
    const cloud = ((await response.json()) as { save: CloudSave }).save;
    if (generation !== this.#generation) return;
    if (Number(cloud.schemaVersion) > (this.#options.maxSchemaVersion ?? Infinity)) {
      this.#update({
        phase: "update-required",
        paused: true,
        message: "Update the game to load this save.",
      });
      return;
    }
    this.#conflict("cloud-available", cloud);
  }
  async restoreVersion(slot: string, revision: number) {
    const generation = this.#generation;
    await this.#requestSnapshot();
    if (generation !== this.#generation) throw new Error("Account changed; recovery is kept.");
    this.#backup();
    const versionsResponse = await this.#fetch(`${this.#slotPath(slot)}/history`);
    if (generation !== this.#generation) throw new Error("Account changed; recovery is kept.");
    if (!versionsResponse.ok) throw new Error("Version history is unavailable.");
    const versions = (await versionsResponse.json()) as { history: SaveHead[] };
    if (generation !== this.#generation) throw new Error("Account changed; recovery is kept.");
    const selected = versions.history.find((item) => item.revision === revision && !item.deleted);
    if (!selected) throw new Error("This version is no longer available. Refresh the history.");
    if (Number(selected.schemaVersion) > (this.#options.maxSchemaVersion ?? Infinity))
      throw new Error("Update the game before restoring this newer save.");
    const current = await this.#fetch(this.#slotPath(slot));
    if (generation !== this.#generation) throw new Error("Account changed; recovery is kept.");
    if (!current.ok) throw new Error("Cloud journey is unavailable. Refresh and try again.");
    const { save } = (await current.json()) as { save: CloudSave };
    if (generation !== this.#generation) throw new Error("Account changed; recovery is kept.");
    const response = await this.#fetch(`${this.#slotPath(slot)}/restore`, {
      method: "POST",
      body: JSON.stringify({
        revision,
        expectedRevision: save.revision,
        expectedChecksum: save.checksum,
        writeId: crypto.randomUUID(),
      }),
    });
    if (generation !== this.#generation) throw new Error("Account changed; recovery is kept.");
    if (!response.ok)
      throw new Error(
        response.status === 409
          ? "Another device saved again. Refresh before restoring."
          : "This version could not be restored. Your current journey is kept.",
      );
    await this.restore(slot);
    if (generation === this.#generation && this.#state.conflict?.cloud)
      await this.resolveConflict("cloud");
  }
  dispose() {
    ++this.#generation;
    if (this.#timer) clearTimeout(this.#timer);
    this.#listeners.clear();
    this.#pauseListeners.clear();
    this.#saveRequests.clear();
  }
}
