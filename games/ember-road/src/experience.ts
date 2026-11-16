import type { GameState } from "./model";

export type Lesson = "battle" | "skill" | "oath" | "camp";
export interface AudioPreferences {
  musicEnabled: boolean;
  effectsEnabled: boolean;
  musicVolume: number;
  effectsVolume: number;
}
export interface Experience {
  introSeen: boolean;
  lessons: Record<Lesson, boolean>;
  audio: AudioPreferences;
}
export function initialExperience(): Experience {
  return {
    introSeen: false,
    lessons: { battle: false, skill: false, oath: false, camp: false },
    audio: { musicEnabled: true, effectsEnabled: true, musicVolume: 0.65, effectsVolume: 0.72 },
  };
}
export function experienceOf(state: GameState): Experience {
  return state.meta.experience ?? initialExperience();
}
export function prepareExperience(state: GameState): Experience {
  state.meta.experience ??= initialExperience();
  return state.meta.experience;
}
export function validExperience(value: unknown): value is Experience {
  if (!value || typeof value !== "object") return false;
  const e = value as Partial<Experience>;
  return (
    typeof e.introSeen === "boolean" &&
    !!e.lessons &&
    ["battle", "skill", "oath", "camp"].every(
      (key) => typeof e.lessons?.[key as Lesson] === "boolean",
    ) &&
    !!e.audio &&
    typeof e.audio.musicEnabled === "boolean" &&
    typeof e.audio.effectsEnabled === "boolean" &&
    [e.audio.musicVolume, e.audio.effectsVolume].every(
      (volume) =>
        typeof volume === "number" && Number.isFinite(volume) && volume >= 0 && volume <= 1,
    )
  );
}
export function isFirstJourney(state: GameState) {
  return (
    state.phase.kind === "camp" &&
    state.meta.earnedGold === 0 &&
    state.meta.victories === 0 &&
    state.meta.defeats === 0 &&
    state.meta.unlockedChapter === 1
  );
}
export function sliderGain(value: number) {
  return Math.max(0, Math.min(1, value)) ** 2;
}
