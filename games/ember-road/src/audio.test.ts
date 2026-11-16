import { afterEach, describe, expect, it, vi } from "vitest";
import { GameAudio } from "./audio.ts";
import { initialExperience } from "./experience.ts";
import { type GameEvent, initialState } from "./model.ts";

afterEach(() => vi.unstubAllGlobals());

describe("combat burst audio", () => {
  it("plays one critical for a relay burst, recovers after 90ms and respects pause and voice limits", async () => {
    const gain = () => ({
      gain: { value: 0, cancelScheduledValues() {}, setValueAtTime() {}, setTargetAtTime() {} },
      connect() {},
    });
    let starts = 0;
    const context = {
      state: "running",
      currentTime: 0,
      sampleRate: 1000,
      destination: {},
      createGain: gain,
      createDynamicsCompressor: () => ({
        threshold: {},
        knee: {},
        ratio: {},
        attack: {},
        release: {},
        connect() {},
      }),
      createBuffer: (_channels: number, length: number) => ({
        getChannelData: () => new Float32Array(length),
      }),
      createBufferSource: () => ({
        playbackRate: { value: 1 },
        connect() {},
        disconnect() {},
        start() {
          starts++;
        },
      }),
      async resume() {},
      async suspend() {},
    };
    vi.stubGlobal(
      "AudioContext",
      vi.fn(function audioContextFixture() {
        return context;
      }),
    );
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("No music in audio fixture")));
    const preferences = initialExperience().audio;
    const audio = new GameAudio(preferences, () => {});
    await audio.unlock();
    const state = initialState();
    const relay: GameEvent[] = [0, 1, 2].map((index) => ({
      type: "hit",
      side: "enemy",
      actor: "hero",
      target: `enemy-${index}`,
      damage: 5,
      critical: false,
      effect: "storm-relay",
    }));
    audio.handle(relay, state);
    expect(starts).toBe(1);
    context.currentTime = 0.08;
    audio.handle(relay, state);
    expect(starts).toBe(1);
    context.currentTime = 0.1;
    audio.handle(relay, state);
    expect(starts).toBe(2);
    audio.update(preferences, { paused: true, permitted: true, inspecting: false, battle: true });
    context.currentTime = 0.2;
    audio.handle(relay, state);
    expect(starts).toBe(2);
    audio.update(preferences, { paused: false, permitted: true, inspecting: false, battle: true });
    for (let index = 0; index < 12; index++) {
      context.currentTime += 0.1;
      audio.handle(relay, state);
    }
    expect(starts).toBe(8);
  });
});
