import { createSaveManager, type Platform } from "@games/gamekit";
import { describe, expect, it } from "vitest";
import { equippedBlade, FIRST_LIGHT, weaponAppearance } from "./first-light";
import { RELEASED_V4_BATTLE } from "./fixtures/released-v4-battle";
import { RELEASED_V5_CHECKPOINTS } from "./fixtures/released-v5-checkpoints";
import {
  continueAfterLoot,
  equipGear,
  type GameEvent,
  type GameState,
  heroStats,
  initialState,
  migrateV4State,
  migrateV5State,
  returnToCamp,
  startFirstLight,
  startRun,
  stepGame,
  useSkill,
  validState,
  validV4State,
  validV5State,
  validV6State,
} from "./model";

function reload(state: GameState): GameState {
  const copy = JSON.parse(JSON.stringify(state));
  expect(validV6State(copy)).toBe(true);
  return copy;
}
function until(state: GameState, stop: (state: GameState) => boolean, seconds = 100) {
  const events: GameEvent[] = [];
  for (let frame = 0; frame < seconds * 60 && !stop(state); frame++) {
    events.push(...stepGame(state, 1 / 60));
    if (frame % 31 === 0) expect(validV6State(state)).toBe(true);
  }
  expect(stop(state)).toBe(true);
  return events;
}
function expedition(seed: number, equip = true) {
  let state = initialState(seed);
  expect(startFirstLight(state)).toBe(true);
  const first = until(state, (s) => s.phase.kind === "loot");
  const rewardAt = state.run.time;
  state = reload(state);
  if (equip) expect(equipGear(state, "sunfang")).toBe(true);
  expect(continueAfterLoot(state)).toBe(true);
  const second = until(state, (s) => s.run.cleared === 2);
  const rest = until(state, (s) => s.phase.kind === "victory");
  return { state, first, second, rest, rewardAt };
}
const contacts = (events: GameEvent[]) =>
  events.filter((e) => e.type === "hit" && e.actor === "hero" && e.side === "enemy").length;

describe("First Light permanent blade expedition", () => {
  it("finishes five fights hands-off across fixed seeds and improves actual repeated-foe hit counts", () => {
    let ordinary = 0,
      sunfang = 0;
    for (let sample = 1; sample <= 40; sample++) {
      const seed = (sample * 2654435761) >>> 0;
      const { state, first, second, rest, rewardAt } = expedition(seed);
      expect(FIRST_LIGHT[0]).toEqual(FIRST_LIGHT[1]);
      expect(state.phase).toEqual({ kind: "victory", reward: 0 });
      expect(state.run.cleared).toBe(5);
      expect(state.run.hp).toBeGreaterThan(0);
      expect(rewardAt).toBeGreaterThanOrEqual(5);
      expect(rewardAt).toBeLessThan(10);
      expect(state.run.time).toBeGreaterThan(25);
      expect(state.run.time).toBeLessThan(60);
      expect(contacts(second)).toBeLessThanOrEqual(contacts(first));
      ordinary += contacts(first);
      sunfang += contacts(second);
      expect([...first, ...second, ...rest].some((e) => e.type === "level")).toBe(false);
      expect(state.meta.gear).toEqual({ owned: ["sunfang"], equipped: "sunfang" });
      expect(state.meta.firstLight).toEqual({ cleared: true });
      expect(state.meta.gold).toBe(0);
      expect(state.meta.earnedGold).toBe(0);
      expect(state.meta.victories).toBe(0);
      expect(state.meta.progression).toEqual(initialState().meta.progression);
      expect(state.quests).toEqual(initialState().quests);
      expect(state.run.xp).toBe(0);
      expect(state.run.level).toBe(1);
      expect(validV6State(state)).toBe(true);
    }
    expect(sunfang).toBeLessThan(ordinary * 0.8);
  });
  it("keeps the blade when stored, retreats and replays never duplicate it, and returns to the selected chapter", () => {
    const { state } = expedition(42, false);
    expect(state.meta.gear).toEqual({ owned: ["sunfang"], equipped: null });
    state.meta.unlockedChapter = 4;
    expect(returnToCamp(state)).toBe(true);
    expect(startFirstLight(state, 3)).toBe(true);
    expect(equipGear(state, "sunfang")).toBe(false);
    const replay = until(state, (s) => s.phase.kind === "victory");
    expect(replay.some((e) => e.type === "loot")).toBe(false);
    expect(state.meta.gear!.owned).toEqual(["sunfang"]);
    expect(returnToCamp(state)).toBe(true);
    expect(state.run.chapter).toBe(3);
    expect(equipGear(state, "sunfang")).toBe(true);
    expect(equipGear(state, "sunfang")).toBe(true);
    expect(equipGear(state, null)).toBe(true);
    expect(state.meta.gear!.owned).toEqual(["sunfang"]);
    expect(validV6State(state)).toBe(true);
  });
  it("persists ownership before loot, pauses without attacks, and keeps queued attack outcomes across reload", () => {
    let state = initialState(42);
    startFirstLight(state);
    until(state, (s) => s.phase.kind === "battle" && s.phase.heroHit !== null);
    const inFlight = reload(state);
    expect(stepGame(inFlight, 0.2)).toEqual(stepGame(state, 0.2));
    expect(inFlight).toEqual(state);
    until(state, (s) => s.phase.kind === "loot");
    state = reload(state);
    expect(state.meta.gear!.owned).toEqual(["sunfang"]);
    const atLoot = structuredClone(state);
    expect(stepGame(state, 0.25)).toEqual([]);
    expect(state).toEqual(atLoot);
    expect(equipGear(state, "sunfang")).toBe(true);
    state = reload(state);
    expect(equippedBlade(state)).toBe("sunfang");
    expect(weaponAppearance(state)).toBe("sunfang");
    expect(continueAfterLoot(state)).toBe(true);
    expect(continueAfterLoot(state)).toBe(false);
    state = reload(state);
    until(state, (s) => s.phase.kind === "battle" && s.phase.heroHit !== null);
    const twin = reload(state);
    for (let frame = 0; frame < 60; frame++)
      expect(stepGame(twin, 1 / 60)).toEqual(stepGame(state, 1 / 60));
    expect(twin).toEqual(state);
  });
  it("round-trips the saved loot through the real v6 gamekit envelope", async () => {
    let raw: string | null = null;
    const platform: Platform = {
      env: "web",
      allowsMuteUi: true,
      firstFrameReady() {},
      gameReady() {},
      async loadData() {
        return raw;
      },
      async saveData(data) {
        raw = data;
      },
      audioEnabled: () => true,
      onAudioEnabledChange: () => () => {},
      onPauseChange: () => () => {},
    };
    const manager = () =>
      createSaveManager({
        platform,
        version: 6,
        initial: initialState,
        migrations: { 5: migrateV5State },
      });
    const saves = manager();
    const { state } = await saves.load();
    startFirstLight(state);
    until(state, (s) => s.phase.kind === "loot");
    await saves.save(state);
    expect(JSON.parse(raw!).version).toBe(6);
    expect(new TextEncoder().encode(raw!).length).toBeLessThan(65536);
    const loaded = await manager().load();
    expect(loaded.state).toEqual(state);
    expect(validV6State(loaded.state)).toBe(true);
    equipGear(loaded.state, "sunfang");
    continueAfterLoot(loaded.state);
    const secondSave = manager();
    await secondSave.load();
    await secondSave.save(loaded.state);
    expect((await manager().load()).state).toEqual(loaded.state);
  });
  it("applies the bonus through heroStats only for swords and explicitly equips that weapon style", () => {
    const state = initialState();
    expect(equipGear(state, "sunfang")).toBe(false);
    state.meta.gear!.owned.push("sunfang");
    state.meta.unlockedChapter = 3;
    for (const weapon of ["sword", "greatsword", "spear"] as const) {
      state.meta.loadout.weapon = weapon;
      state.meta.gear!.equipped = null;
      const before = heroStats(state);
      state.meta.gear!.equipped = "sunfang";
      const after = heroStats(state);
      expect(after.damage - before.damage).toBeCloseTo(weapon === "sword" ? 12 : 0);
      expect(after.cleave - before.cleave).toBeCloseTo(weapon === "sword" ? 0.35 : 0);
      expect(weaponAppearance(state)).toBe(weapon === "sword" ? "sunfang" : "ordinary");
    }
    expect(equipGear(state, "sunfang")).toBe(true);
    expect(state.meta.loadout.weapon).toBe("sword");
    expect(heroStats(state).damage).toBe(35);
    state.meta.loadout.weapon = "spear";
    expect(equipGear(state, null)).toBe(true);
    expect(state.meta.loadout.weapon).toBe("sword");
    expect(weaponAppearance(state)).toBe("ordinary");
    expect(heroStats(state).damage).toBe(23);
  });
  it("keeps veteran companions off this solo trail and leaves their campaign behavior available", () => {
    const state = initialState(42);
    Object.assign(state.adventures!.discoveries, { mira: true, cinder: true, whirlwind: true });
    startFirstLight(state);
    expect(heroStats(state).companionDamage).toBe(0);
    expect(heroStats(state).petDamage).toBe(0);
    const events = until(state, (s) => s.phase.kind === "loot");
    expect(events.some((e) => e.type === "swing" && ["companion", "pet"].includes(e.actor))).toBe(
      false,
    );
  });
  it("keeps optional Aegis cast snapshots coherent when gear changes at loot", () => {
    const state = initialState(77);
    state.meta.unlockedChapter = 5;
    state.meta.upgrades.blade = 8;
    state.adventures!.discoveries.whirlwind = true;
    state.meta.loadout.skill = "aegis";
    state.meta.loadout.weapon = "greatsword";
    startFirstLight(state);
    until(state, (s) => s.phase.kind === "battle");
    useSkill(state);
    expect(state.run.shieldCast).not.toBeNull();
    until(state, (s) => s.phase.kind === "loot");
    const cast = structuredClone(state.run.shieldCast);
    expect(validV6State(state)).toBe(true);
    expect(equipGear(state, "sunfang")).toBe(true);
    expect(state.run.shieldCast).toEqual(cast);
    expect(validV6State(state)).toBe(true);
    expect(equipGear(state, null)).toBe(true);
    expect(validV6State(state)).toBe(true);
    expect(continueAfterLoot(state)).toBe(true);
    until(state, (s) => s.run.cleared === 2);
  });
  it("rejects forged items, unavailable equipment and loot outside its saved checkpoint", () => {
    const { state } = expedition(5);
    const invalid: ((s: GameState) => void)[] = [
      (s) => Object.assign(s.run, { perks: null }),
      (s) => Object.assign(s.meta.gear!, { owned: ["forged"] }),
      (s) => {
        s.meta.gear!.owned = [];
      },
      (s) => Object.assign(s.meta.gear!, { equipped: "forged" }),
      (s) => {
        s.meta.gear!.owned.push("sunfang");
      },
      (s) => {
        s.phase = { kind: "loot", item: "sunfang" };
      },
      (s) => {
        s.run.context = { kind: "campaign", routes: [], junctionFloor: 5 };
        s.phase = { kind: "loot", item: "sunfang" };
      },
    ];
    for (const mutate of invalid) {
      const bad = structuredClone(state);
      mutate(bad);
      expect(validV6State(bad)).toBe(false);
    }
    const missing = initialState();
    delete missing.meta.gear;
    expect(validV6State(missing)).toBe(false);
    expect(validV5State(state)).toBe(false);
    expect(validV4State(state)).toBe(false);
  });
});

describe("v5 to v6 preservation", () => {
  it("matches the frozen v5 engine event sequence and final checkpoint for projectiles and a live shield cast", () => {
    for (const fixture of RELEASED_V5_CHECKPOINTS) {
      expect(validV5State(fixture.state)).toBe(true);
      const state = migrateV5State(fixture.state);
      const events: GameEvent[] = [];
      for (let frame = 0; frame < 180; frame++) events.push(...stepGame(state, 1 / 60));
      expect(events).toEqual(fixture.events);
      const { gear: _gear, firstLight: _firstLight, ...meta } = state.meta;
      expect({ ...state, meta }).toEqual(fixture.after);
      expect(validV6State(state)).toBe(true);
    }
  });
  it("adds empty gear without replacing a genuine active checkpoint or changing its subsequent event sequence", () => {
    const old = migrateV4State(structuredClone(RELEASED_V4_BATTLE.state));
    expect(validV5State(old)).toBe(true);
    const next = migrateV5State(old);
    expect(next.meta.gear).toEqual({ owned: [], equipped: null });
    expect(next.meta.firstLight).toEqual({ cleared: false });
    const { gear: _gear, firstLight: _firstLight, ...meta } = next.meta;
    expect(meta).toEqual(old.meta);
    expect(next.run).toEqual(old.run);
    expect(next.phase).toEqual(old.phase);
    expect(next.quests).toEqual(old.quests);
    expect(next.adventures).toEqual(old.adventures);
    expect(startFirstLight(next)).toBe(false);
    for (let frame = 0; frame < 180; frame++)
      expect(stepGame(next, 1 / 60)).toEqual(stepGame(old, 1 / 60));
    expect(validState(next)).toBe(true);
  });
  it("retains a live shield cast and old validator invariants, and does not repair invalid input", () => {
    const old = migrateV4State(structuredClone(RELEASED_V4_BATTLE.state));
    old.run.skillCooldown = 0;
    useSkill(old);
    expect(old.run.shieldCast).not.toBeNull();
    const next = migrateV5State(old);
    expect(next.run).toEqual(old.run);
    expect(next.phase).toEqual(old.phase);
    const invalid = structuredClone(old);
    invalid.run.seed = 0;
    expect(() => migrateV5State(invalid)).toThrow();
    const camp = initialState();
    delete camp.meta.gear;
    delete camp.meta.firstLight;
    const migratedCamp = migrateV5State(camp);
    expect(migratedCamp.phase).toEqual(camp.phase);
    expect(migratedCamp.run).toEqual(camp.run);
    expect(startRun(migratedCamp)).toBe(true);
  });
});
