import { describe, expect, it } from "vitest";
import type { Platform } from "../src/platform/types";
import { createSaveManager, MAX_SAVE_BYTES } from "../src/save";

function fakePlatform(initialRaw: string | null = null): Platform & { raw: string | null } {
  return {
    env: "web",
    allowsMuteUi: true,
    raw: initialRaw,
    firstFrameReady() {},
    gameReady() {},
    async loadData() {
      return this.raw;
    },
    async saveData(data: string) {
      this.raw = data;
    },
    audioEnabled: () => true,
    onAudioEnabledChange: () => () => {},
    onPauseChange: () => () => {},
  };
}

interface StateV3 {
  cash: number;
  investors: number;
}

const manager = (platform: Platform) =>
  createSaveManager<StateV3>({
    platform,
    version: 3,
    initial: () => ({ cash: 0, investors: 0 }),
    migrations: {
      // v1 {money} -> v2 {cash}
      1: (s) => ({ cash: (s as { money: number }).money }),
      // v2 -> v3 adds investors
      2: (s) => ({ ...(s as { cash: number }), investors: 0 }),
    },
  });

describe("createSaveManager", () => {
  it("requests the live replacement model rather than the last saved object", async () => {
    const platform = fakePlatform();
    let request: (() => void | Promise<void>) | undefined;
    platform.onSaveRequest = (callback) => {
      request = callback;
      return () => {};
    };
    let state = { cash: 0, investors: 0 };
    const saves = createSaveManager({
      platform,
      version: 3,
      initial: () => state,
      getState: () => state,
    });
    await saves.load();
    state = { cash: 55, investors: 2 };
    if (!request) throw new Error("Snapshot hook was not registered");
    await request();
    if (!platform.raw) throw new Error("Snapshot was not persisted");
    expect(JSON.parse(platform.raw).state).toEqual(state);
  });
  it("returns initial state with null savedAt when no save exists", async () => {
    const result = await manager(fakePlatform()).load();
    expect(result.state).toEqual({ cash: 0, investors: 0 });
    expect(result.savedAt).toBeNull();
  });

  it("round-trips state through save and load", async () => {
    const platform = fakePlatform();
    const m = manager(platform);
    await m.load();
    await m.save({ cash: 123.45, investors: 2 });
    const result = await manager(platform).load();
    expect(result.state).toEqual({ cash: 123.45, investors: 2 });
    expect(result.savedAt).toBeGreaterThan(0);
  });

  it("migrates old saves forward through the chain (v1 -> v3)", async () => {
    const platform = fakePlatform(
      JSON.stringify({ version: 1, savedAt: 1000, state: { money: 50 } }),
    );
    const result = await manager(platform).load();
    expect(result.state).toEqual({ cash: 50, investors: 0 });
    expect(result.savedAt).toBe(1000);
  });

  it("falls back to fresh state on corrupt JSON and bad envelopes", async () => {
    for (const raw of ["not json{", JSON.stringify({ nope: true }), JSON.stringify(null)]) {
      const result = await manager(fakePlatform(raw)).load();
      expect(result.savedAt).toBeNull();
    }
  });

  it("starts fresh on saves from a newer version (downgrade)", async () => {
    const platform = fakePlatform(
      JSON.stringify({ version: 9, savedAt: 1000, state: { cash: 5, investors: 1 } }),
    );
    const result = await manager(platform).load();
    expect(result.savedAt).toBeNull();
  });

  it("throws if save is called before load (YT cert: load before save)", async () => {
    const m = manager(fakePlatform());
    await expect(m.save({ cash: 1, investors: 0 })).rejects.toThrow(/before load/);
  });

  it("rejects saves over the size guard", async () => {
    const platform = fakePlatform();
    const m = createSaveManager<{ blob: string }>({
      platform,
      version: 1,
      initial: () => ({ blob: "" }),
    });
    await m.load();
    await expect(m.save({ blob: "x".repeat(MAX_SAVE_BYTES) })).rejects.toThrow(/byte guard/);
  });
});
