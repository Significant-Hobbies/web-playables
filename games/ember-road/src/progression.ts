import { activityUnlocked } from "./adventures.ts";
import type { GameState } from "./model";

export const LEVEL_THRESHOLDS = [0, 6, 12, 36, 72, 120, 180, 260, 360, 500] as const;
export const SYSTEMS = {
  company: {
    level: 2,
    title: "Mira joins the company",
    description: "A ranger watches your back. Train companions with Trailmarks.",
  },
  skills: {
    level: 3,
    title: "Whirlwind awakens",
    description: "Cast with Q. Train skills with Embers earned from chapter victories.",
  },
  pets: {
    level: 4,
    title: "Cinder finds the trail",
    description: "Your first pet joins the fight. Train pets with Trailmarks.",
  },
  daily: {
    level: 5,
    title: "Daily quests",
    description: "New goals each day. Your earlier progress already counts.",
  },
  weekly: {
    level: 6,
    title: "Weekly quests",
    description: "Longer challenges for a growing company.",
  },
} as const;
export type SystemId = keyof typeof SYSTEMS;
export type TrainingId = "companion" | "pet" | "skill";
export interface Progression {
  renown: number;
  trailmarks: number;
  embers: number;
  training: Record<TrainingId, number>;
}
const CAP = 1_000_000_000;
export const TRAINING_CAP = 4;
export function initialProgression(): Progression {
  return { renown: 0, trailmarks: 0, embers: 0, training: { companion: 0, pet: 0, skill: 0 } };
}
export function progressionOf(state: GameState): Progression {
  return state.meta.progression ?? { ...initialProgression(), renown: LEVEL_THRESHOLDS[5] };
}
export function prepareProgression(state: GameState): Progression {
  // Before progression existed every company system was available. Preserve that access.
  state.meta.progression ??= progressionOf(state);
  return state.meta.progression;
}
export function companyLevel(state: GameState): number {
  const renown = progressionOf(state).renown;
  return LEVEL_THRESHOLDS.filter((threshold) => threshold <= renown).length;
}
export function systemUnlocked(state: GameState, system: SystemId): boolean {
  if (state.adventures) {
    if (system === "daily" || system === "weekly")
      return (
        state.adventures.discoveries[system] ||
        activityUnlocked(state, system === "daily" ? "daily" : "hunt")
      );
    return state.adventures.discoveries[
      { company: "mira", pets: "cinder", skills: "whirlwind" }[system] as "mira"
    ];
  }
  return companyLevel(state) >= SYSTEMS[system].level;
}
export function nextUnlock(state: GameState) {
  const objectives = [
    ["company", "Rescue Mira", "Follow the ranger’s signal after fight 3."],
    ["skills", "Discover Whirlwind", "Choose 2 oaths, or visit the wind shrine after fight 6."],
    ["pets", "Find Cinder", "Follow fox tracks after fight 9."],
    ["daily", "Daily expeditions", "Clear chapter 1 to open six-fight daily adventures."],
    ["weekly", "Weekly boss hunt", "Clear chapter 2 to open three-round boss hunts."],
  ] as const;
  const next = objectives.find(([id]) => !systemUnlocked(state, id));
  return next ? { title: next[1], description: next[2], level: SYSTEMS[next[0]].level } : undefined;
}
export function levelProgress(state: GameState) {
  const level = companyLevel(state);
  const start = LEVEL_THRESHOLDS[level - 1]!;
  const end = LEVEL_THRESHOLDS[level];
  return {
    level,
    current: progressionOf(state).renown - start,
    needed: end === undefined ? null : end - start,
  };
}
export function awardRenown(state: GameState, amount: number) {
  const p = prepareProgression(state);
  p.renown = Math.min(CAP, p.renown + amount);
}
export function awardWave(state: GameState, victory: boolean) {
  const p = prepareProgression(state);
  p.trailmarks = Math.min(CAP, p.trailmarks + 1);
  if (victory) {
    p.embers = Math.min(CAP, p.embers + 4);
    awardRenown(state, 12);
  }
}
export function trainingCost(state: GameState, id: TrainingId) {
  return (id === "skill" ? 2 : 3) + progressionOf(state).training[id] * (id === "skill" ? 2 : 3);
}
export function trainingUnlocked(state: GameState, id: TrainingId) {
  return systemUnlocked(
    state,
    { companion: "company", pet: "pets", skill: "skills" }[id] as SystemId,
  );
}
export function train(state: GameState, id: TrainingId) {
  const p = progressionOf(state);
  const rank = p.training[id];
  if (
    state.phase.kind !== "camp" ||
    !trainingUnlocked(state, id) ||
    rank >= TRAINING_CAP ||
    companyLevel(state) < rank + 2
  )
    return false;
  const currency = id === "skill" ? "embers" : "trailmarks";
  const cost = trainingCost(state, id);
  if (p[currency] < cost) return false;
  const saved = prepareProgression(state);
  saved[currency] -= cost;
  saved.training[id]++;
  return true;
}
export function validProgression(value: unknown, discovery = false): value is Progression {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const p = value as Progression;
  const counter = (v: unknown, max: number) =>
    typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
  const level = LEVEL_THRESHOLDS.filter((threshold) => threshold <= p.renown).length;
  return (
    counter(p.renown, CAP) &&
    counter(p.trailmarks, CAP) &&
    counter(p.embers, CAP) &&
    !!p.training &&
    typeof p.training === "object" &&
    !Array.isArray(p.training) &&
    ["companion", "pet", "skill"].every(
      (id) =>
        counter(p.training[id as TrainingId], TRAINING_CAP) &&
        p.training[id as TrainingId] <= Math.max(0, level - 1) &&
        (discovery ||
          p.training[id as TrainingId] === 0 ||
          level >=
            SYSTEMS[
              { companion: "company", pet: "pets", skill: "skills" }[id as TrainingId] as SystemId
            ].level),
    )
  );
}
