import { FIRST_LIGHT } from "./first-light.ts";
import type { GameState } from "./model";

export const DAY_MS = 86_400_000;
export type ActivityKind = "daily" | "hunt";
export type Tier = 1 | 2 | 3;
export type RouteId = "spring" | "elite" | "rescue" | "shrine" | "tracks";
export type RunContext =
  | { kind: "campaign"; routes: { at: number; path: RouteId }[]; junctionFloor: number }
  | { kind: "first-light"; returnChapter: number }
  | { kind: ActivityKind; id: number; period: number; tier: Tier; returnChapter: number };
export interface AdventureLedger {
  day: number;
  week: number;
  daily: Tier[];
  hunt: Tier[];
  discoveries: {
    mira: boolean;
    cinder: boolean;
    whirlwind: boolean;
    daily: boolean;
    weekly: boolean;
    oaths: number;
  };
}
export const EXPEDITIONS = [
  {
    name: "Arrowstorm",
    rule: "Archers hold the rear. Their arrows arrive twice as often.",
    style: "arrows",
  },
  {
    name: "Ironwatch",
    rule: "Armored sentinels guard every wave. Pierce or overwhelm their armor.",
    style: "armor",
  },
  {
    name: "Glass Cannon",
    rule: "Foes have less health but strike for double damage.",
    style: "glass",
  },
  {
    name: "Feral Hour",
    rule: "Fast raiders rush the front. No rear line to shelter behind.",
    style: "feral",
  },
  {
    name: "Lantern Run",
    rule: "Hexers gather in the rear. Interrupt their heavy ember bolts.",
    style: "lantern",
  },
] as const;
export const TIERS = [
  { tier: 1, name: "Scout", chapter: 1, factor: 1, gold: 45, marks: 6, embers: 1 },
  { tier: 2, name: "Veteran", chapter: 2, factor: 1.4, gold: 85, marks: 10, embers: 2 },
  { tier: 3, name: "Legend", chapter: 4, factor: 1.9, gold: 140, marks: 15, embers: 4 },
] as const;
export const ROUTES: Record<
  RouteId,
  { name: string; symbol: string; risk: string; reward: string }
> = {
  spring: {
    name: "Lantern spring",
    symbol: "✦",
    risk: "Gentle trail · weaker foes for 3 fights",
    reward: "Heal 35% · gain 2 Trailmarks",
  },
  elite: {
    name: "Elite encampment",
    symbol: "⚔",
    risk: "Hard trail · armored foes, 35% more health",
    reward: "Double foe gold · 2 extra Trailmarks per fight",
  },
  rescue: {
    name: "A ranger’s signal",
    symbol: "➶",
    risk: "Rescue Mira · ordinary trail",
    reward: "Mira joins permanently; already found? Gain 5 Trailmarks",
  },
  shrine: {
    name: "The wind shrine",
    symbol: "❖",
    risk: "Ancient trail · ordinary foes",
    reward: "Discover Whirlwind · +20% Rook damage for this run",
  },
  tracks: {
    name: "Follow fox tracks",
    symbol: "♨",
    risk: "Leave the road · ordinary foes",
    reward: "Cinder joins permanently; already found? Gain 5 Trailmarks",
  },
};
export const DISCOVERY_CHAPTERS = { mira: 2, cinder: 3 } as const;

export function routeDetails(state: GameState, path: RouteId) {
  const discoveries = state.adventures?.discoveries;
  if (path === "spring" && state.run.rules === 1)
    return { ...ROUTES.spring, risk: "Gentler road · weaker foes ahead" };
  if (path === "shrine" && discoveries?.whirlwind)
    return {
      ...ROUTES.shrine,
      reward: "+20% Rook damage for this run · Whirlwind already learned",
    };
  if (path === "rescue" && !discoveries?.mira && state.run.chapter < DISCOVERY_CHAPTERS.mira)
    return {
      ...ROUTES[path],
      name: "A ribbon on the road",
      risk: "Mira passed this way. Her trail leads toward the monastery.",
      reward: "Follow her trail · gain 3 Trailmarks. Find Mira in chapter 2.",
    };
  if (path === "tracks" && !discoveries?.cinder && state.run.chapter < DISCOVERY_CHAPTERS.cinder)
    return {
      ...ROUTES[path],
      name: "Little ember footprints",
      risk: "Small tracks cross the road, then vanish into the distant marsh.",
      reward: "Scout the trail · gain 3 Trailmarks. Meet Cinder in chapter 3.",
    };
  return ROUTES[path];
}
export function initialAdventures(): AdventureLedger {
  return {
    day: 0,
    week: 0,
    daily: [],
    hunt: [],
    discoveries: {
      mira: false,
      cinder: false,
      whirlwind: false,
      daily: false,
      weekly: false,
      oaths: 0,
    },
  };
}
export function advanceAdventures(state: GameState, now: number): boolean {
  if (!Number.isFinite(now) || now < 0 || now >= Date.UTC(10000, 0, 1)) return false;
  const ledger = state.adventures;
  if (!ledger) return false;
  const day = Math.floor(now / DAY_MS),
    week = Math.floor((day + 3) / 7);
  let changed = false;
  if (day > ledger.day) {
    ledger.day = day;
    ledger.daily = [];
    changed = true;
  }
  if (week > ledger.week) {
    ledger.week = week;
    ledger.hunt = [];
    changed = true;
  }
  return changed;
}
export function activityUnlocked(state: GameState, kind: ActivityKind): boolean {
  return (
    state.quests.story.completed.includes(kind === "daily" ? 1 : 2) ||
    (kind === "daily" ? state.meta.unlockedChapter > 1 : state.meta.unlockedChapter > 2)
  );
}
export function tierUnlocked(state: GameState, tier: Tier): boolean {
  return state.meta.unlockedChapter >= TIERS[tier - 1]!.chapter;
}
export function activityPreview(
  state: GameState,
  kind: ActivityKind,
  tier: Tier,
  captured?: { period: number; id: number },
) {
  const ledger = state.adventures ?? initialAdventures();
  const current = kind === "daily" ? ledger.day : ledger.week;
  const period = captured?.period ?? current;
  const id = captured?.id ?? period % 5;
  const reward = TIERS[tier - 1]!;
  return {
    kind,
    period,
    id,
    tier,
    name:
      kind === "daily"
        ? EXPEDITIONS[id]!.name
        : `${["Thorn", "Marsh", "Lantern", "Frost", "Crownless"][id]} hunt`,
    rule:
      kind === "daily"
        ? EXPEDITIONS[id]!.rule
        : "Three boss rounds. Each round adds pressure: a lone warden, a guarded warden, then a warden with two hexers.",
    fights: kind === "daily" ? 6 : 3,
    reward: {
      gold: reward.gold * (kind === "hunt" ? 2 : 1),
      marks: reward.marks,
      embers: reward.embers * (kind === "hunt" ? 2 : 1),
    },
    claimed: period === current && ledger[kind].includes(tier),
    unlocked: activityUnlocked(state, kind) && tierUnlocked(state, tier),
  };
}
export function routeOptions(at: number): RouteId[] {
  return ["spring", "elite", at === 3 ? "rescue" : at === 6 ? "shrine" : "tracks"];
}
export function runLength(state: GameState): number {
  return state.run.context?.kind === "first-light"
    ? FIRST_LIGHT.length
    : state.run.context?.kind === "daily"
      ? 6
      : state.run.context?.kind === "hunt"
        ? 3
        : 12;
}
export function currentRoute(state: GameState): RouteId | undefined {
  const context = state.run.context;
  return context?.kind === "campaign" ? context.routes.at(-1)?.path : undefined;
}
export function chapterJunctions(chapter: number, rules: 1 | undefined): number[] {
  return rules === 1 ? [chapter === 2 ? 3 : chapter === 3 ? 9 : 6] : [3, 6, 9];
}
export function junctions(state: GameState): number[] {
  return chapterJunctions(state.run.chapter, state.run.rules);
}
export function nextJunction(state: GameState): number | undefined {
  const context = state.run.context;
  if (context?.kind !== "campaign") return undefined;
  return junctions(state).find(
    (at) =>
      at > context.junctionFloor &&
      at === state.run.cleared &&
      !context.routes.some((route) => route.at === at),
  );
}
export function validAdventureLedger(value: unknown): value is AdventureLedger {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const l = value as AdventureLedger;
  const integer = (v: unknown, max: number) =>
    typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
  const tiers = (v: unknown): v is Tier[] =>
    Array.isArray(v) &&
    v.length <= 3 &&
    new Set(v).size === v.length &&
    v.every((t) => [1, 2, 3].includes(t));
  return (
    integer(l.day, 2932896) &&
    integer(l.week, 418985) &&
    (l.week === Math.floor((l.day + 3) / 7) || (l.day === 0 && l.week === 0)) &&
    tiers(l.daily) &&
    tiers(l.hunt) &&
    !!l.discoveries &&
    typeof l.discoveries === "object" &&
    !Array.isArray(l.discoveries) &&
    ["mira", "cinder", "whirlwind", "daily", "weekly"].every(
      (k) => typeof l.discoveries[k as "mira"] === "boolean",
    ) &&
    integer(l.discoveries.oaths, 2)
  );
}
export function validRunContext(state: GameState, firstLight = false): boolean {
  const c = state.run.context;
  if (!c || typeof c !== "object") return false;
  if (c.kind === "campaign")
    return (
      Array.isArray(c.routes) &&
      c.routes.length <= 3 &&
      Number.isInteger(c.junctionFloor) &&
      c.junctionFloor >= 0 &&
      c.junctionFloor <= state.run.cleared &&
      c.routes.every(
        (r, i) =>
          !!r &&
          [3, 6, 9].includes(r.at) &&
          r.at > c.junctionFloor &&
          r.at <= state.run.cleared &&
          routeOptions(r.at).includes(r.path) &&
          (i === 0 || r.at > c.routes[i - 1]!.at),
      ) &&
      junctions(state)
        .filter((at) => at > c.junctionFloor && at < state.run.cleared)
        .every((at) => c.routes.some((r) => r.at === at)) &&
      (state.phase.kind === "camp" ||
        state.phase.kind === "defeat" ||
        state.phase.kind === "choice" ||
        state.phase.kind === "route" ||
        nextJunction(state) === undefined)
    );
  if (c.kind === "first-light")
    return (
      firstLight &&
      state.phase.kind !== "camp" &&
      !["choice", "route"].includes(state.phase.kind) &&
      state.run.chapter === 1 &&
      state.run.rules === 1 &&
      state.run.cleared <= FIRST_LIGHT.length &&
      state.run.xp === 0 &&
      state.run.level === 1 &&
      Number.isInteger(c.returnChapter) &&
      c.returnChapter >= 1 &&
      c.returnChapter <= state.meta.unlockedChapter
    );
  const ledger = state.adventures;
  if (!ledger || !["daily", "hunt"].includes(c.kind)) return false;
  const period = c.kind === "daily" ? ledger.day : ledger.week;
  return (
    state.phase.kind !== "camp" &&
    state.run.cleared <= (c.kind === "daily" ? 6 : 3) &&
    Number.isInteger(c.returnChapter) &&
    c.returnChapter >= 1 &&
    c.returnChapter <= state.meta.unlockedChapter &&
    Number.isInteger(c.id) &&
    c.id >= 0 &&
    c.id < 5 &&
    Number.isInteger(c.period) &&
    c.period >= 0 &&
    c.period <= period &&
    c.id === c.period % 5 &&
    [1, 2, 3].includes(c.tier) &&
    tierUnlocked(state, c.tier) &&
    activityUnlocked(state, c.kind)
  );
}
