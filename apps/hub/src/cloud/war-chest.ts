import type { PlayablesCloud } from "./runtime";

/** Validated Godot snapshots, never IDBFS internals or mutable IndexedDB interception. */
export function connectWarChest(cloud: PlayablesCloud) {
  let applying = false;
  let capture: (() => void) | null = null;
  const pendingCaptures: { resolve: () => void; reject: (error: Error) => void }[] = [];
  const previousReady = window.warChestCloudReady;
  window.warChestCloudReady = () => {
    previousReady?.();
    capture = () => window.warChestCapture?.();
    capture();
  };
  window.warChestCloudSnapshot = (data, slot) => {
    if (applying) return;
    void cloud
      .captureExternal(data, slot)
      .then(() => {
        for (const pending of pendingCaptures.splice(0)) pending.resolve();
      })
      .catch(() => {
        for (const pending of pendingCaptures.splice(0))
          pending.reject(new Error("Local checkpoint did not persist"));
      });
  };
  cloud.registerSaveRequest(
    () =>
      new Promise<void>((resolve, reject) => {
        if (!capture) {
          resolve();
          return;
        }
        const pending = { resolve, reject };
        pendingCaptures.push(pending);
        capture();
        setTimeout(() => {
          const index = pendingCaptures.indexOf(pending);
          if (index >= 0) {
            pendingCaptures.splice(index, 1);
            reject(new Error("Game checkpoint timed out"));
          }
        }, 2000);
      }),
  );
  cloud.onPauseChange((paused) => window.warChestCloudPause?.(paused));
  cloud.registerRestoreRequest(async (data, owner, slot) => {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(owner));
    const storageId =
      Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("") +
      "-" +
      slot;
    await new Promise<void>((resolve, reject) => {
      if (!window.warChestImport) {
        reject(new Error("Game is still loading"));
        return;
      }
      applying = true;
      const timeout = setTimeout(() => {
        applying = false;
        reject(new Error("Game restore timed out; local recovery is kept"));
      }, 5000);
      window.warChestImported = (ok) => {
        clearTimeout(timeout);
        applying = false;
        ok ? resolve() : reject(new Error("Game rejected this save; recovery is kept"));
      };
      window.warChestImport(data, storageId);
    });
  });
}
declare global {
  interface Window {
    warChestCloudReady?: () => void;
    warChestCloudSnapshot?: (data: string, slot: "story" | "original") => void;
    warChestCapture?: () => void;
    warChestCloudPause?: (paused: boolean) => void;
    warChestImport?: (data: string, storageId: string) => void;
    warChestImported?: (ok: boolean) => void;
  }
}
