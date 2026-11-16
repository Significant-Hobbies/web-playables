import { describe, expect, it } from "vitest";
import { attackMotion } from "./attack-motion";
import {
  beginBattle,
  useSkill as castSkill,
  choosePerk,
  chooseRoute,
  equip,
  heroStats,
  initialState,
  migrateV3State,
  PERKS,
  type PerkId,
  rerollPerks,
  returnToCamp,
  skipPerk,
  startRun,
  stepGame,
  validState,
} from "./model";
import { companyPower } from "./power";
import {
  companyLevel,
  initialProgression,
  levelProgress,
  prepareProgression,
  progressionOf,
  SYSTEMS,
  systemUnlocked,
  train,
  trainingCost,
  validProgression,
} from "./progression";

describe("permanent company progression", () => {
  it("finishes a fresh chapter, keeps earned currencies and training through the next journey", () => {
    const state = initialState(927113);
    startRun(state);
    for (let frame = 0; frame < 18_000 && state.phase.kind !== "victory"; frame++) {
      if (state.phase.kind === "choice") {
        const priority: PerkId[] = ["heart", "blood", "renewal", "bastion", "edge", "cleave"];
        const options = state.phase.options;
        choosePerk(state, priority.find((id) => options.includes(id)) ?? options[0]!);
      }
      if (state.phase.kind === "route")
        chooseRoute(
          state,
          state.phase.at === 3 ? "rescue" : state.phase.at === 6 ? "shrine" : "tracks",
        );
      castSkill(state);
      stepGame(state, 1 / 60);
      expect(validState(state)).toBe(true);
      expect(state.phase.kind).not.toBe("defeat");
    }
    expect(state.phase.kind).toBe("victory");
    expect(companyLevel(state)).toBe(4);
    expect(progressionOf(state)).toMatchObject({ renown: 48, trailmarks: 18, embers: 4 });
    expect(returnToCamp(state)).toBe(true);
    expect(train(state, "companion")).toBe(false);
    expect(train(state, "pet")).toBe(false);
    expect(train(state, "skill")).toBe(true);
    const earned = structuredClone(progressionOf(state));
    expect(startRun(state, 2)).toBe(true);
    expect(progressionOf(state)).toEqual(earned);
    expect(validState(JSON.parse(JSON.stringify(state)))).toBe(true);
  });
  it("starts solo, discovers systems through play and gives every company level permanent strength", () => {
    const state = initialState();
    expect(companyLevel(state)).toBe(1);
    expect(heroStats(state).companionDamage).toBe(0);
    expect(heroStats(state).petDamage).toBe(0);
    expect(companyPower(state).company).toBe(0);
    expect(equip(state, "companion", "mira")).toBe(false);
    const previous = heroStats(state);
    for (const renown of [6, 12, 36, 72, 120, 180, 260, 360, 500]) {
      state.meta.progression!.renown = renown;
      expect(
        Object.keys(SYSTEMS).filter((id) => systemUnlocked(state, id as keyof typeof SYSTEMS)),
      ).toEqual([]);
      expect(heroStats(state).damage).toBeGreaterThan(previous.damage);
      expect(heroStats(state).hp).toBeGreaterThan(previous.hp);
      Object.assign(previous, heroStats(state));
    }
    expect(levelProgress(state)).toEqual({ level: 10, current: 0, needed: null });
  });
  it("preserves old company access without inventing spendable rewards", () => {
    const legacy = initialState();
    delete legacy.meta.progression;
    delete legacy.adventures;
    delete legacy.run.context;
    const state = migrateV3State(legacy);
    const before = structuredClone(state);
    expect(systemUnlocked(state, "pets")).toBe(true);
    expect(progressionOf(state).embers).toBe(0);
    expect(progressionOf(state).trailmarks).toBe(0);
    expect(state).toEqual(before);
    const p = prepareProgression(state);
    expect(p.renown).toBe(120);
    expect(validState(state)).toBe(true);
    expect(prepareProgression(JSON.parse(JSON.stringify(state)))).toEqual(p);
  });
  it("keeps every solo battle frame valid and awards a cleared wave exactly once", () => {
    const state = initialState(7);
    startRun(state);
    state.phase = beginBattle(state);
    for (const enemy of state.phase.enemies) {
      enemy.hp = 1;
      enemy.cooldown = 5;
    }
    const actors = new Set<string>();
    for (let i = 0; i < 240 && state.run.cleared === 0; i++) {
      for (const event of stepGame(state, 1 / 60))
        if (event.type === "swing") actors.add(event.actor);
      expect(validState(state)).toBe(true);
    }
    expect(actors).toEqual(new Set(["hero"]));
    expect(progressionOf(state)).toMatchObject({ renown: 2, trailmarks: 1, embers: 0 });
    const after = structuredClone(progressionOf(state));
    stepGame(state, 0);
    expect(progressionOf(state)).toEqual(after);
    expect(castSkill(state)).toEqual([]);
  });
  it("trains through the real currency and level boundary, and keeps upgrades across runs", () => {
    const state = initialState();
    const p = state.meta.progression!;
    p.renown = 36;
    Object.assign(state.adventures!.discoveries, { mira: true, cinder: true, whirlwind: true });
    p.trailmarks = 12;
    p.embers = 4;
    const before = heroStats(state);
    const cost = trainingCost(state, "companion");
    expect(train(state, "companion")).toBe(true);
    expect(p.trailmarks).toBe(12 - cost);
    expect(heroStats(state).companionDamage).toBeGreaterThan(before.companionDamage);
    expect(train(state, "pet")).toBe(true);
    const powerBeforeTraining = companyPower(state).technique;
    expect(train(state, "skill")).toBe(true);
    expect(companyPower(state).technique).toBeGreaterThan(powerBeforeTraining);
    expect(p.embers).toBe(2);
    startRun(state);
    const frozen = structuredClone(state);
    expect(train(state, "skill")).toBe(false);
    expect(state).toEqual(frozen);
    expect(validState(state)).toBe(true);
    state.phase = beginBattle(state);
    expect(castSkill(state).some((e) => e.type === "skill")).toBe(true);
    expect(state.run.skillCooldown).toBeCloseTo(8 * 0.92);
    expect(validState(JSON.parse(JSON.stringify(state)))).toBe(true);
  });
  it("rejects malformed currency, impossible training and denied actions without writes", () => {
    const state = initialState();
    const before = structuredClone(state);
    expect(train(state, "pet")).toBe(false);
    expect(state).toEqual(before);
    for (const invalid of [
      null,
      {},
      { ...initialProgression(), embers: -1 },
      { ...initialProgression(), renown: Infinity },
      { ...initialProgression(), trailmarks: 1.5 },
      { ...initialProgression(), training: { companion: 1, pet: 0, skill: 0 } },
      { ...initialProgression(), renown: 6, training: { companion: 0, pet: 1, skill: 0 } },
      { ...initialProgression(), renown: 500, training: { companion: 5, pet: 0, skill: 0 } },
    ]) {
      expect(validProgression(invalid)).toBe(false);
      expect(validState({ ...state, meta: { ...state.meta, progression: invalid } })).toBe(false);
    }
    delete state.meta.progression;
    state.phase = beginBattle(state);
    const legacy = structuredClone(state);
    expect(train(state, "companion")).toBe(false);
    expect(state).toEqual(legacy);
  });
});

describe("saved oath refresh", () => {
  it("gives one deterministic alternate offer without granting an oath or spending currency", () => {
    const state = initialState(44);
    state.phase = { kind: "choice", options: ["edge", "heart", "tempo"], rerolls: 1 };
    state.run.level = 2;
    state.run.cleared = 2;
    const twin = structuredClone(state),
      before = structuredClone(state);
    expect(rerollPerks(state)).toBe(true);
    expect(rerollPerks(twin)).toBe(true);
    expect(state).toEqual(twin);
    expect(state.phase).toMatchObject({ kind: "choice", rerolls: 0 });
    if (state.phase.kind !== "choice") throw new Error("Expected choices");
    expect(state.phase.options).toHaveLength(3);
    expect(state.phase.options.every((id) => !["edge", "heart", "tempo"].includes(id))).toBe(true);
    expect(state.run.perks).toEqual(before.run.perks);
    expect(state.quests).toEqual(before.quests);
    expect(state.meta).toEqual(before.meta);
    const restored = JSON.parse(JSON.stringify(state));
    expect(validState(restored)).toBe(true);
    expect(rerollPerks(restored)).toBe(false);
    expect(choosePerk(state, state.phase.options[0]!)).toBe(true);
    expect(Object.values(state.run.perks)).toEqual([1]);
  });
  it("does not consume refresh when no alternative remains, and skips safely", () => {
    const state = initialState();
    for (const p of PERKS) state.run.perks[p.id] = p.max;
    state.run.perks.edge = 1;
    state.phase = { kind: "choice", options: ["edge"] };
    const before = structuredClone(state);
    expect(rerollPerks(state)).toBe(false);
    expect(state).toEqual(before);
    expect(skipPerk(state)).toBe(true);
    expect(rerollPerks(state)).toBe(false);
  });
});

describe("attack presentation", () => {
  it("aligns melee contact, keeps ranged actors planted and returns every transform to rest", () => {
    const ready = attackMotion(-1, 0.22, false);
    const windup = attackMotion(0.06, 0.22, false);
    expect(windup.frame).toBe(1);
    expect(windup.reach).toBeLessThan(0);
    const hit = attackMotion(0.22, 0.22, false);
    expect(hit.frame).toBe(2);
    expect(hit.reach).toBe(1);
    expect(attackMotion(0.3, 0.5, true).reach).toBe(0);
    expect(attackMotion(0.58, 0.22, false)).toEqual(ready);
    expect(attackMotion(0.57, 0.22, false).sx).toBeCloseTo(1);
    expect(attackMotion(0.57, 0.22, false).sy).toBeCloseTo(1);
  });
});
