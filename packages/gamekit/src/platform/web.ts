import type { Platform, Unsubscribe } from "./types";

/** Browser/iframe implementation: localStorage saves, visibility-based pause. */
export class WebPlatform implements Platform {
  readonly env = "web";
  readonly allowsMuteUi = true;
  readonly #key: string;
  readonly #host = typeof window !== "undefined" ? window.playablesPersistenceHost : undefined;

  constructor(storageKey: string) {
    this.#key = storageKey;
  }

  firstFrameReady(): void {}
  gameReady(): void {}

  async loadData(): Promise<string | null> {
    if (this.#host) return this.#host.loadData(this.#key);
    try {
      return localStorage.getItem(this.#key);
    } catch {
      // Storage can be unavailable in sandboxed iframes; play without saves.
      return null;
    }
  }

  async saveData(data: string): Promise<void> {
    if (this.#host) return this.#host.saveData(this.#key, data);
    try {
      localStorage.setItem(this.#key, data);
    } catch {
      // Same sandboxed-iframe caveat: swallow rather than crash the game.
    }
  }

  audioEnabled(): boolean {
    return true;
  }

  onAudioEnabledChange(): Unsubscribe {
    return () => {};
  }

  onSaveRequest(cb: () => void | Promise<void>): Unsubscribe {
    return this.#host?.registerSaveRequest(cb) ?? (() => {});
  }

  onOverlayChange(cb: (open: boolean) => void): Unsubscribe {
    return this.#host?.onOverlayChange?.(cb) ?? (() => {});
  }

  onPauseChange(cb: (paused: boolean) => void): Unsubscribe {
    let hostPaused = false;
    const handler = () => cb(hostPaused || document.visibilityState === "hidden");
    const unsubscribe = this.#host?.onPauseChange((paused) => {
      hostPaused = paused;
      handler();
    });
    document.addEventListener("visibilitychange", handler);
    return () => {
      unsubscribe?.();
      document.removeEventListener("visibilitychange", handler);
    };
  }
}

/** Optional host injection exists only in assembled Pages web builds. YT never reads it. */
declare global {
  interface Window {
    playablesPersistenceHost?: {
      loadData(key: string): Promise<string | null>;
      saveData(key: string, data: string): Promise<void>;
      onPauseChange(callback: (paused: boolean) => void): Unsubscribe;
      registerSaveRequest(callback: () => void | Promise<void>): Unsubscribe;
      onOverlayChange?(callback: (open: boolean) => void): Unsubscribe;
    };
  }
}
