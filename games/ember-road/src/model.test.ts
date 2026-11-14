import { describe, expect, it } from "vitest";
import {
  buyUpgrade,
  CHAPTERS,
  choosePerk,
  ENCOUNTERS_PER_CHAPTER,
  encounter,
  type GameState,
  heroStats,
  initialState,
  PERKS,
  type PerkId,
  returnToCamp,
  startRun,
  stepGame,
  upgradeCost,
  validState,
} from "./model";

function battle(state: GameState, enemyHp = 100) {
  const enemy = encounter(state.run.chapter, state.run.cleared);
  enemy.hp = enemyHp;
  state.phase = {
    kind: "battle",
    enemy,
    heroCooldown: 100,
    enemyCooldown: 100,
    heroHit: null,
    enemyHit: null,
  };
  return state.phase;
}

function completeRun(
  state: GameState,
  priorities: PerkId[] = [
    "renewal",
    "bastion",
    "blood",
    "edge",
    "storm",
    "heart",
    "tempo",
    "execution",
    "thorns",
  ],
) {
  for (let i = 0; i < 30000; i++) {
    if (state.phase.kind === "choice") {
      const choice = priorities.find(
        (id) => state.phase.kind === "choice" && state.phase.options.includes(id),
      );
      if (!choice || !choosePerk(state, choice))
        throw new Error("A real offered perk must advance the journey.");
    } else if (state.phase.kind === "victory" || state.phase.kind === "defeat") return;
    else stepGame(state, 1 / 30);
  }
  throw new Error("The chapter never resolved.");
}

describe("the old road", () => {
  it("begins an earned chapter and resolves combat without player clicking", () => {
    const state = initialState(42);
    expect(startRun(state, 2)).toBe(false);
    expect(startRun(state, 1)).toBe(true);
    for (let i = 0; i < 250; i++) stepGame(state, 1 / 30);
    expect(state.run.cleared).toBeGreaterThan(0);
    expect(state.meta.gold).toBeGreaterThan(0);
    expect(state.meta.earnedGold).toBe(state.meta.gold);
    expect(state.run.strikes).toBeGreaterThan(0);
  });

  it("freezes the entire combat model at an oath choice", () => {
    const state = initialState();
    startRun(state);
    for (let i = 0; i < 2000 && state.phase.kind !== "choice"; i++) stepGame(state, 1 / 30);
    expect(state.phase.kind).toBe("choice");
    const frozen = structuredClone(state);
    for (let i = 0; i < 600; i++) expect(stepGame(state, 1 / 30)).toEqual([]);
    expect(state).toEqual(frozen);
    if (state.phase.kind !== "choice") throw new Error("Expected choice");
    expect(new Set(state.phase.options).size).toBe(3);
    const selected = state.phase.options[0];
    if (!selected) throw new Error("Expected an offered perk");
    expect(choosePerk(state, selected)).toBe(true);
    expect(choosePerk(state, selected)).toBe(false);
    expect(state.run.perks[selected]).toBe(1);
    expect(state.phase.kind).toBe("travel");
  });

  it("lets equipment and perks change actual hit damage and healing", () => {
    const state = initialState();
    state.run.perks.edge = 1;
    state.run.perks.blood = 1;
    state.meta.upgrades.blade = 1;
    state.run.hp = 90;
    const combat = battle(state);
    combat.heroHit = { remaining: 0.01, damage: heroStats(state).damage, critical: false };
    const events = stepGame(state, 0.02);
    expect(combat.enemy.hp).toBeCloseTo(100 - 33.75);
    expect(state.run.hp).toBeCloseTo(93.375);
    expect(events).toContainEqual({ type: "heal", amount: 3.375 });
  });

  it("triggers Stormbound on the third resolved hit and not the first two", () => {
    const state = initialState();
    state.run.perks.storm = 2;
    const combat = battle(state, 200);
    for (let hit = 1; hit <= 3; hit++) {
      combat.heroHit = { remaining: 0.01, damage: 5, critical: false };
      const events = stepGame(state, 0.02);
      expect(events.find((event) => event.type === "hit")).toMatchObject({
        damage: hit === 3 ? 41 : 5,
        lightning: hit === 3,
      });
    }
    expect(combat.enemy.hp).toBe(149);
  });

  it("never lets armor turn an incoming attack into healing", () => {
    const state = initialState();
    state.run.perks.bastion = 3;
    const combat = battle(state);
    combat.enemyHit = { remaining: 0.01, damage: 2, critical: false };
    stepGame(state, 0.02);
    expect(state.run.hp).toBe(179);
  });

  it("cancels a fallen foe's pending attack and pays its gold once", () => {
    const state = initialState();
    const combat = battle(state, 1);
    combat.heroHit = { remaining: 0.01, damage: 100, critical: false };
    combat.enemyHit = { remaining: 0.01, damage: 100, critical: false };
    stepGame(state, 0.02);
    const gold = state.meta.gold;
    expect(gold).toBe(combat.enemy.gold);
    expect(state.run.hp).toBe(180);
    stepGame(state, 0.02);
    expect(state.meta.gold).toBe(gold);
    expect(state.run.cleared).toBe(1);
  });

  it("keeps earned gold and permanent upgrades after defeat and retry", () => {
    const state = initialState();
    state.meta.gold = 60;
    state.meta.earnedGold = 60;
    expect(buyUpgrade(state, "blade")).toBe(true);
    const kept = structuredClone(state.meta);
    startRun(state);
    const combat = battle(state);
    state.run.hp = 1;
    combat.enemyHit = { remaining: 0.01, damage: 10, critical: false };
    stepGame(state, 0.02);
    expect(state.phase.kind).toBe("defeat");
    expect(state.meta.gold).toBe(kept.gold);
    expect(state.meta.upgrades).toEqual(kept.upgrades);
    expect(state.meta.defeats).toBe(1);
    for (let i = 0; i < 20; i++) stepGame(state, 0.02);
    expect(state.meta.defeats).toBe(1);
    expect(startRun(state)).toBe(true);
    expect(state.run.hp).toBe(heroStats(state).hp);
    expect(state.run.perks).toEqual({});
    expect(state.meta.gold).toBe(kept.gold);
  });

  it("spends gold only in camp and rejects an unaffordable repeat purchase", () => {
    const state = initialState();
    const cost = upgradeCost(state, "mail");
    state.meta.gold = cost;
    state.meta.earnedGold = cost;
    expect(buyUpgrade(state, "mail")).toBe(true);
    expect(state.meta.gold).toBe(0);
    expect(state.meta.upgrades.mail).toBe(1);
    expect(buyUpgrade(state, "mail")).toBe(false);
    state.meta.gold = 100;
    state.meta.earnedGold = 150;
    startRun(state);
    expect(buyUpgrade(state, "blade")).toBe(false);
    expect(state.meta.gold).toBe(100);
  });

  it("provides a legal first chapter with real perk choices and a boss payoff", () => {
    for (const seed of [1, 42, 927113]) {
      const state = initialState(seed);
      startRun(state);
      completeRun(state);
      expect(state.phase.kind).toBe("victory");
      expect(state.run.cleared).toBe(ENCOUNTERS_PER_CHAPTER);
      expect(state.meta.victories).toBe(1);
      expect(state.meta.unlockedChapter).toBe(2);
      expect(Object.keys(state.run.perks).length).toBeGreaterThan(1);
      const reward = state.meta.gold;
      for (let i = 0; i < 100; i++) stepGame(state, 0.02);
      expect(state.meta.gold).toBe(reward);
      expect(returnToCamp(state)).toBe(true);
      expect(state.run.perks).toEqual({});
      expect(validState(state)).toBe(true);
    }
  });

  it("reaches all five authored roads through earned upgrades without an endless grind", () => {
    const state = initialState(927113);
    let runs = 0;
    while (runs++ < 12) {
      for (const id of ["mail", "blade", "charm"] as const) {
        while (buyUpgrade(state, id)) {}
      }
      startRun(state, state.meta.unlockedChapter);
      completeRun(state);
      if (state.phase.kind === "victory" && state.run.chapter === CHAPTERS.length) break;
      returnToCamp(state);
    }
    expect(state.phase.kind).toBe("victory");
    expect(state.run.chapter).toBe(CHAPTERS.length);
    expect(runs).toBeLessThanOrEqual(12);
  });

  it("can resume a saved pending strike with exactly the same result", () => {
    const original = initialState();
    startRun(original);
    for (let i = 0; i < 50; i++) stepGame(original, 1 / 30);
    expect(validState(original)).toBe(true);
    const restored: unknown = JSON.parse(JSON.stringify(original));
    expect(validState(restored)).toBe(true);
    if (!validState(restored)) throw new Error("Expected a loadable save");
    for (let i = 0; i < 300; i++) {
      expect(stepGame(restored, 1 / 30)).toEqual(stepGame(original, 1 / 30));
      expect(restored).toEqual(original);
    }
  });

  it("rejects malformed or impossible persisted state instead of trusting it", () => {
    const state = initialState();
    expect(validState(state)).toBe(true);
    for (const changed of [
      null,
      {},
      { ...state, meta: { ...state.meta, gold: -1 } },
      { ...state, run: { ...state.run, hp: 9999 } },
      { ...state, run: { ...state.run, chapter: 7 } },
      { ...state, run: { ...state.run, perks: { edge: 12 } } },
      { ...state, phase: { kind: "choice", options: ["edge", "edge", "heart"] } },
    ])
      expect(validState(changed)).toBe(false);
    const run = initialState();
    startRun(run);
    for (let i = 0; i < 40; i++) stepGame(run, 1 / 30);
    expect(run.phase.kind).toBe("battle");
    if (run.phase.kind === "battle") run.phase.enemy.damage = 999;
    expect(validState(run)).toBe(false);
    expect(PERKS.every((perk) => perk.description.length > 20)).toBe(true);
  });
});
