import { describe, expect, it } from "vitest";
import { eventCue } from "./audio";
import {
  experienceOf,
  initialExperience,
  isFirstJourney,
  prepareExperience,
  sliderGain,
  validExperience,
} from "./experience";
import { beginBattle, initialState, startRun, validState } from "./model";

describe("saved game experience", () => {
  it("loads old version-three journeys without metadata and adds only presentation state", () => {
    const state = initialState();
    delete state.meta.experience;
    state.meta.gold = 123;
    state.meta.earnedGold = 200;
    startRun(state);
    state.phase = beginBattle(state);
    state.run.perks.edge = 1;
    const before = structuredClone(state);
    expect(validState(state)).toBe(true);
    const experience = prepareExperience(state);
    expect(experience.introSeen).toBe(false);
    expect(isFirstJourney(state)).toBe(false);
    const next = structuredClone(state);
    delete next.meta.experience;
    expect(next).toEqual(before);
    experience.introSeen = true;
    experience.lessons.skill = true;
    experience.audio.musicVolume = 0.2;
    const restored = JSON.parse(JSON.stringify(state));
    expect(validState(restored)).toBe(true);
    expect(prepareExperience(restored)).toEqual(experience);
  });
  it("protects malformed presentation metadata rather than silently discarding a save", () => {
    const state = initialState();
    for (const value of [
      null,
      {},
      { ...initialExperience(), introSeen: "yes" },
      { ...initialExperience(), audio: { ...initialExperience().audio, musicVolume: 1.1 } },
      { ...initialExperience(), lessons: { battle: true } },
    ]) {
      expect(validState({ ...state, meta: { ...state.meta, experience: value } })).toBe(false);
      expect(validExperience(value)).toBe(false);
    }
  });
  it("does not mutate a state when the UI reads defaults", () => {
    const state = initialState();
    delete state.meta.experience;
    expect(experienceOf(state).introSeen).toBe(false);
    expect(state.meta.experience).toBeUndefined();
    expect(isFirstJourney(state)).toBe(true);
    state.meta.earnedGold = 1;
    expect(isFirstJourney(state)).toBe(false);
  });
  it("maps volume controls to silence and a perceptual gain curve", () => {
    expect(sliderGain(0)).toBe(0);
    expect(sliderGain(0.5)).toBe(0.25);
    expect(sliderGain(1)).toBe(1);
    expect(sliderGain(-1)).toBe(0);
    expect(sliderGain(2)).toBe(1);
  });
});
describe("event-driven sound", () => {
  it("distinguishes ordinary allies, criticals, incoming damage and big events", () => {
    const state = initialState();
    const hit = {
      type: "hit",
      side: "hero",
      actor: "hero",
      target: "enemy-0",
      damage: 23,
      critical: false,
    } as const;
    expect(eventCue(hit, state)).toBe("slash");
    state.meta.loadout.weapon = "greatsword";
    expect(eventCue(hit, state)).toBe("heavy");
    state.meta.loadout.weapon = "spear";
    expect(eventCue(hit, state)).toBe("pierce");
    state.meta.loadout.weapon = "sword";
    expect(eventCue({ ...hit, actor: "companion" }, state)).toBe("arrow");
    expect(eventCue({ ...hit, actor: "pet" }, state)).toBe("pet");
    expect(eventCue({ ...hit, critical: true }, state)).toBe("critical");
    expect(eventCue({ ...hit, side: "enemy", actor: "enemy-0", target: "hero" }, state)).toBe(
      "hurt",
    );
    expect(eventCue({ type: "skill", skill: "whirlwind" }, state)).toBe("whirlwind");
    expect(eventCue({ type: "victory", gold: 20 }, state)).toBe("victory");
  });
});
