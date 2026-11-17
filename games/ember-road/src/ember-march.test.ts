import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isEmberMarch, marchEnemy } from "./ember-march.ts";
import { CAPTURED_V6_CHECKPOINTS } from "./fixtures/captured-v6-checkpoints.ts";
import * as M from "./model.ts";
import { useSkill as castSkill } from "./model.ts";

const clone = <T>(state: T): T => JSON.parse(JSON.stringify(state));
function fresh(seed = 42) {
  const state = M.initialState(seed);
  expect(M.startEmberMarch(state)).toBe(true);
  return state;
}
function context(state: M.GameState) {
  const c = state.run.context;
  if (c?.kind !== "ember-march") throw new Error("Expected March context.");
  return c;
}
function advance(state: M.GameState, stop: (s: M.GameState) => boolean, priority: M.PerkId[] = []) {
  for (let i = 0; i < 40000 && !stop(state); i++) {
    const p = state.phase;
    if (p.kind === "choice") {
      const id = priority.find((id) => p.options.includes(id)) ?? p.options[0]!;
      expect(M.choosePerk(state, id, p.offerId)).toBe(true);
    } else if (p.kind === "march-gift") {
      expect(M.chooseMarchGift(state, p.options[0]!, p.offerId)).toBe(true);
    } else if (p.kind === "battle") M.stepGame(state, 1 / 60);
    else break;
  }
  expect(stop(state)).toBe(true);
}
function suspended(state: M.GameState) {
  const before = clone(state);
  expect(M.validV7State(before)).toBe(true);
  expect(M.stepGame(before, 0.25)).toEqual([]);
  expect(before).toEqual(state);
  return before;
}
const done = (s: M.GameState) => ["victory", "defeat"].includes(s.phase.kind);

describe("Ember March", () => {
  it("preserves historical v6 validation, pending attacks, RNG, events and balances after migration", () => {
    for (const checkpoint of CAPTURED_V6_CHECKPOINTS) {
      expect(M.validV6State(checkpoint.state), checkpoint.name).toBe(true);
      const state = clone(M.migrateV6State(checkpoint.state));
      expect(M.validV7State(state), checkpoint.name).toBe(true);
      const events: unknown[] = [];
      for (let i = 0; i < 900; i++) {
        if (state.phase.kind === "choice")
          events.push(["pick", M.choosePerk(state, state.phase.options[0]!)]);
        else if (state.phase.kind === "route")
          events.push(["route", M.chooseRoute(state, "spring")]);
        else if (state.phase.kind === "loot") events.push(["loot", M.continueAfterLoot(state)]);
        else events.push(...castSkill(state), ...M.stepGame(state, 1 / 60));
      }
      const { emberMarch: _, ...meta } = state.meta;
      const hash = createHash("sha256")
        .update(JSON.stringify({ state: { ...state, meta }, events }))
        .digest("hex");
      expect(hash, checkpoint.name).toBe(checkpoint.futureHash);
      expect(M.validV7State(state), checkpoint.name).toBe(true);
    }
  });

  it("starts with truthful uncharged Barrier and no forced allies, pet or skill unlock", () => {
    const state = fresh();
    expect(isEmberMarch(state)).toBe(true);
    expect(state.run.shield).toBe(M.heroStats(state).hp * 0.3);
    expect(state.run.shieldCast).toBeNull();
    const battle = M.visibleBattle(state)!;
    M.stepGame(state, 0.25);
    expect(battle.companionHit).toBeNull();
    expect(battle.petHit).toBeNull();
    expect(state.run.skillCooldown).toBe(0);
    expect(M.validV6State(state)).toBe(false);
    expect(M.validV7State(state)).toBe(true);
    state.meta.unlockedChapter = 3;
    state.meta.loadout.skill = "aegis";
    state.adventures!.discoveries.whirlwind = true;
    state.run.shield = 1;
    const shield = castSkill(state).find((e) => e.type === "shield");
    expect(shield).toEqual({ type: "shield", amount: M.heroStats(state).hp * 0.3 });
    expect(state.run.shield).toBe(M.heroStats(state).hp * 0.3);
    expect(state.run.shieldCast).toEqual({ absorbed: 0, attack: M.heroStats(state).damage });
  });

  it("pauses and reloads the same live battle through a choice, reroll and gift", () => {
    const state = fresh();
    advance(state, (s) => s.phase.kind === "choice");
    let loaded = suspended(state);
    const before = clone(M.visibleBattle(loaded));
    const p = loaded.phase;
    if (p.kind !== "choice") throw new Error("Expected choice.");
    expect(M.choosePerk(loaded, p.options[0]!)).toBe(false);
    expect(M.rerollPerks(loaded)).toBe(false);
    expect(M.skipPerk(loaded)).toBe(false);
    expect(M.rerollPerks(loaded, p.offerId)).toBe(true);
    expect(M.visibleBattle(loaded)).toEqual(before);
    loaded = suspended(loaded);
    if (loaded.phase.kind !== "choice") throw new Error("Expected choice.");
    expect(M.choosePerk(loaded, loaded.phase.options[0]!, loaded.phase.offerId)).toBe(true);
    expect(M.visibleBattle(loaded)).toEqual(before);
    advance(loaded, (s) => s.phase.kind === "march-gift", ["heart", "bastion", "blood"]);
    loaded = suspended(loaded);
    if (loaded.phase.kind !== "march-gift") throw new Error("Expected gift.");
    const gift = loaded.phase,
      timer = clone(loaded.run),
      battle = clone(M.visibleBattle(loaded));
    expect(M.chooseMarchGift(loaded, gift.options[0]!, "stale")).toBe(false);
    expect(M.chooseMarchGift(loaded, gift.options[0]!, gift.offerId)).toBe(true);
    expect(M.chooseMarchGift(loaded, gift.options[0]!, gift.offerId)).toBe(false);
    expect(context(loaded).gift).toBe("taken");
    expect(loaded.run.time).toBe(timer.time);
    expect(context(loaded).spawnRemaining).toBe(
      (timer.context as typeof timer.context & { spawnRemaining: number }).spawnRemaining,
    );
    expect(M.visibleBattle(loaded)).toEqual(battle);
    expect(M.validV7State(clone(loaded))).toBe(true);
  });

  it("drains multi-kill XP overflow with bound identities even when consecutive offers overlap", () => {
    const state = fresh();
    const c = context(state),
      battle = M.visibleBattle(state)!;
    c.nextSpawn = 13;
    c.kills = 9;
    c.earnedGold = 9;
    state.run.xp = 9;
    battle.enemies = [9, 10, 11, 12].map((i, slot) => marchEnemy(i, slot < 2 ? slot : slot));
    for (const foe of battle.enemies) {
      foe.hp = 1;
      foe.row = "front";
    }
    state.run.perks.cleave = 2;
    battle.heroHit = {
      source: "hero",
      remaining: 0.01,
      damage: 100,
      critical: false,
      target: "enemy-9",
      projectile: false,
    };
    M.stepGame(state, 0.02);
    expect(c.kills).toBe(13);
    expect(state.phase.kind).toBe("choice");
    if (state.phase.kind !== "choice") throw new Error("Expected choice.");
    const firstId = state.phase.offerId;
    state.phase.options = ["heart", "edge", "tempo"];
    expect(M.choosePerk(state, "heart", firstId)).toBe(true);
    if (state.phase.kind !== "choice") throw new Error("Expected owed choice.");
    state.phase.options = ["heart", "edge", "tempo"];
    const saved = clone(state);
    expect(M.choosePerk(state, "heart", firstId)).toBe(false);
    expect(M.skipPerk(state, firstId)).toBe(false);
    expect(M.rerollPerks(state, firstId)).toBe(false);
    expect(state).toEqual(saved);
    expect(state.run.level).toBe(3);
    expect(state.run.xp).toBe(2);
  });

  it("settles all due damage before choices and completes a final multi-kill once", () => {
    const dying = fresh(),
      c = context(dying),
      battle = M.visibleBattle(dying)!;
    c.nextSpawn = 7;
    c.kills = 5;
    c.earnedGold = 5;
    dying.run.xp = 5;
    battle.enemies = [marchEnemy(4, 0), marchEnemy(5, 1)];
    battle.enemies[0]!.hp = 1;
    battle.heroHit = {
      source: "hero",
      remaining: 0.01,
      damage: 100,
      critical: false,
      target: "enemy-4",
      projectile: false,
    };
    const attacker = battle.enemies[1]!;
    attacker.pendingHit = { remaining: 0.01, damage: attacker.damage, critical: false };
    dying.run.hp = 1;
    dying.run.shield = 0;
    M.stepGame(dying, 0.02);
    expect(c.kills).toBe(6);
    expect(dying.phase.kind).toBe("defeat");
    expect(dying.run.level).toBe(1);

    const final = fresh(),
      finish = context(final),
      last = M.visibleBattle(final)!;
    finish.nextSpawn = 54;
    finish.kills = 52;
    finish.earnedGold = 52;
    finish.gift = "taken";
    final.meta.gold = 52;
    final.meta.earnedGold = 52;
    final.run.level = 11;
    final.run.xp = 1;
    final.run.perks.cleave = 2;
    last.enemies = [marchEnemy(52, 0), marchEnemy(53, 1)];
    for (const foe of last.enemies) foe.hp = 1;
    last.heroHit = {
      source: "hero",
      remaining: 0.01,
      damage: 100,
      critical: false,
      target: "enemy-52",
      projectile: false,
    };
    const events = M.stepGame(final, 0.02);
    expect(events.filter((e) => e.type === "xp")).toHaveLength(2);
    expect(events.filter((e) => e.type === "victory")).toHaveLength(1);
    expect(final.phase.kind).toBe("victory");
    expect(final.meta.gold).toBe(90);
    expect(M.validV7State(clone(final))).toBe(true);
    expect(M.stepGame(final, 0.02)).toEqual([]);
    expect(final.meta.gold).toBe(90);
  });

  it("persists camp selection while accepting existing v7 ledgers without a preference", () => {
    const state = M.initialState(7);
    expect(M.validV7State(clone(state))).toBe(true);
    expect(state.meta.emberMarch!.selected).toBeUndefined();
    expect(M.selectMarchCamp(state, true)).toBe(true);
    expect(clone(state).meta.emberMarch!.selected).toBe(true);
    expect(M.selectMarchCamp(state, false)).toBe(true);
    expect(M.startEmberMarch(state)).toBe(true);
    expect(state.meta.emberMarch!.selected).toBe(true);
    expect(M.selectMarchCamp(state, false)).toBe(false);
    delete state.meta.emberMarch!.selected;
    expect(M.validV7State(clone(state))).toBe(true);
    expect(M.retreatToCamp(state)).toBe(true);
    expect(state.meta.emberMarch!.selected).toBe(true);
    expect(M.validV7State(clone(state))).toBe(true);
    expect(M.selectMarchCamp(state, false)).toBe(true);
    expect(clone(state).meta.emberMarch!.selected).toBe(false);
    expect(M.startEmberMarch(state)).toBe(true);
    advance(state, done, ["blood", "heart", "bastion", "edge", "tempo"]);
    expect(state.phase.kind).toBe("victory");
    expect(state.meta.emberMarch).toEqual({ cleared: true, selected: true });
    delete state.meta.emberMarch!.selected;
    expect(M.validV7State(clone(state))).toBe(true);
    expect(M.returnToCamp(state)).toBe(true);
    expect(state.meta.emberMarch).toEqual({ cleared: true, selected: true });
    expect(M.validV7State(clone(state))).toBe(true);
    const invalid = clone(state);
    Object.assign(invalid.meta.emberMarch!, { selected: "true" });
    expect(M.validV7State(invalid)).toBe(false);
  });

  it("publishes saveable manual casts immediately, including kills and owed choices", () => {
    const state = fresh(4);
    state.adventures!.discoveries.whirlwind = true;
    state.meta.upgrades.blade = 3;
    const battle = M.visibleBattle(state)!;
    expect(M.validV7State(clone(state))).toBe(true);
    const events = castSkill(state);
    expect(events.filter((e) => e.type === "kill")).toHaveLength(2);
    expect(M.validV7State(clone(state))).toBe(true);
    expect(battle.enemies).toEqual([]);

    const owed = fresh(4),
      c = context(owed),
      pending = M.visibleBattle(owed)!;
    owed.adventures!.discoveries.whirlwind = true;
    c.nextSpawn = 6;
    c.kills = 5;
    c.earnedGold = 5;
    owed.meta.gold = owed.meta.earnedGold = 5;
    owed.run.xp = 5;
    pending.enemies = [marchEnemy(5, 0)];
    pending.enemies[0]!.hp = 1;
    expect(M.validV7State(clone(owed))).toBe(true);
    const cast = castSkill(owed);
    expect(cast.filter((e) => e.type === "level")).toEqual([{ type: "level", level: 2 }]);
    expect(owed.phase.kind).toBe("choice");
    expect(M.validV7State(clone(owed))).toBe(true);
    const saved = clone(owed);
    expect(castSkill(owed)).toEqual([]);
    expect(owed).toEqual(saved);
  });

  it("saves the tenth choice after a final four-kill strike and pays once after pick or skip", () => {
    for (const replay of [false, true])
      for (const action of ["pick", "skip"] as const) {
        const state = fresh(),
          c = context(state),
          battle = M.visibleBattle(state)!;
        state.meta.emberMarch!.cleared = replay;
        c.nextSpawn = 54;
        c.kills = c.earnedGold = 50;
        c.gift = "taken";
        state.meta.gold = state.meta.earnedGold = 50;
        state.run.level = 10;
        state.run.xp = 4;
        state.run.strikes = 2;
        state.run.perks = { cleave: 2, pierce: 2, chain: 1 };
        battle.enemies = [46, 47, 52, 53].map((i, slot) => marchEnemy(i, (slot + 2) % 4));
        for (const enemy of battle.enemies) enemy.hp = 1;
        battle.heroHit = {
          source: "hero",
          remaining: 0.01,
          damage: M.heroStats(state).damage,
          critical: false,
          target: "enemy-52",
          projectile: false,
        };
        expect(M.validV7State(clone(state))).toBe(true);
        const events = M.stepGame(state, 0.02);
        expect(events.filter((e) => e.type === "kill")).toHaveLength(4);
        expect(events.filter((e) => e.type === "level")).toEqual([{ type: "level", level: 11 }]);
        expect(events.some((e) => e.type === "victory")).toBe(false);
        expect(state.meta.gold).toBe(54);
        expect(c.earnedGold).toBe(54);
        const loaded = suspended(state);
        expect(M.visibleBattle(loaded)!.enemies).toEqual([]);
        if (loaded.phase.kind !== "choice") throw new Error("Expected final choice.");
        const { offerId, options } = loaded.phase;
        const malformed = clone(loaded);
        malformed.run.level = 10;
        malformed.run.xp = 8;
        context(malformed).offerSerial = 21;
        if (malformed.phase.kind === "choice")
          malformed.phase.offerId = `${context(malformed).runId}:21`;
        expect(M.validV7State(malformed)).toBe(false);
        const settled: M.GameEvent[] = [];
        expect(
          action === "pick"
            ? M.choosePerk(loaded, options[0]!, offerId, settled)
            : M.skipPerk(loaded, offerId, settled),
        ).toBe(true);
        expect(settled.filter((event) => event.type === "victory")).toHaveLength(1);
        expect(loaded.phase.kind).toBe("victory");
        expect(loaded.meta.gold).toBe(replay ? 66 : 90);
        expect(context(loaded).earnedGold).toBe(replay ? 66 : 90);
        expect(M.validV7State(clone(loaded))).toBe(true);
        const paid = clone(loaded);
        expect(M.choosePerk(loaded, options[0]!, offerId, settled)).toBe(false);
        expect(M.skipPerk(loaded, offerId, settled)).toBe(false);
        expect(settled.filter((event) => event.type === "victory")).toHaveLength(1);
        expect(M.stepGame(loaded, 0.02)).toEqual([]);
        expect(loaded).toEqual(paid);
      }
  });

  it("publishes immutable spawn positions before same-tick damage, XP and death", () => {
    for (const lethal of [false, true]) {
      const state = fresh(),
        c = context(state),
        battle = M.visibleBattle(state)!;
      c.nextSpawn = c.kills = c.earnedGold = 6;
      c.spawnRemaining = 0;
      state.meta.gold = state.meta.earnedGold = 6;
      state.run.level = 2;
      state.run.xp = 0;
      state.meta.upgrades.blade = 5;
      state.adventures!.discoveries.whirlwind = lethal;
      battle.enemies = [];
      battle.heroCooldown = 5;
      expect(M.validV7State(clone(state))).toBe(true);
      const events = M.stepGame(state, 0.02);
      expect(events[0]).toEqual({ type: "spawn", enemy: marchEnemy(6, 2) });
      if (lethal) {
        expect(
          events.filter((e) => ["hit", "xp", "kill"].includes(e.type)).map((e) => e.type),
        ).toEqual(["hit", "xp", "kill"]);
        expect(battle.enemies).toEqual([]);
      } else {
        const enemy = battle.enemies[0]!;
        expect(enemy.cooldown).toBeLessThan(1.2);
        enemy.hp--;
        expect(events[0]).toEqual({ type: "spawn", enemy: marchEnemy(6, 2) });
      }
      expect(M.validV7State(clone(state))).toBe(true);
    }
  });

  it("never retargets a launched projectile to a reused formation slot", () => {
    const state = fresh();
    state.adventures!.discoveries.mira = true;
    const battle = M.visibleBattle(state)!;
    const formation = battle.enemies;
    const old = battle.enemies[0]!;
    old.hp = 1;
    battle.heroHit = {
      source: "hero",
      remaining: 0.01,
      damage: 100,
      critical: false,
      target: old.id,
      projectile: false,
    };
    battle.companionHit = {
      source: "mira",
      remaining: 0.5,
      damage: 10,
      critical: false,
      target: old.id,
      projectile: true,
    };
    context(state).spawnRemaining = 0;
    M.stepGame(state, 0.02);
    M.stepGame(state, 0.02);
    const replacement = battle.enemies.find((e) => e.slot === old.slot && e.hp > 0)!;
    expect(replacement.id).not.toBe(old.id);
    expect(battle.enemies).toContain(old);
    expect(battle.enemies).toBe(formation);
    expect(M.validV7State(state)).toBe(true);
    const loaded = clone(state),
      current = M.visibleBattle(loaded)!;
    current.heroHit = null;
    current.heroCooldown = 5;
    const hp = current.enemies.find((e) => e.id === replacement.id)!.hp;
    M.stepGame(loaded, 0.25);
    M.stepGame(loaded, 0.25);
    expect(current.enemies.find((e) => e.id === replacement.id)!.hp).toBe(hp);
    const restoredFormation = current.enemies;
    expect(current.enemies.some((e) => e.id === old.id)).toBe(false);
    M.stepGame(loaded, 0.25);
    expect(current.enemies).toBe(restoredFormation);
  });

  it("rejects altered templates, aliased identities, invalid queues and continuation envelopes", () => {
    const state = fresh();
    for (const mutate of [
      (s: M.GameState) => {
        M.visibleBattle(s)!.enemies[0]!.damage++;
      },
      (s: M.GameState) => {
        M.visibleBattle(s)!.enemies[1]!.id = "enemy-0";
      },
      (s: M.GameState) => {
        M.visibleBattle(s)!.heroHit = {
          source: "hero",
          remaining: 0.1,
          damage: 23,
          critical: false,
          target: "enemy-53",
          projectile: false,
        };
      },
      (s: M.GameState) => {
        M.visibleBattle(s)!.reactions = [
          {
            actor: "enemy-0",
            effect: "shatterguard",
            target: "enemy-0",
            remaining: 0.1,
            damage: 1,
          },
        ];
      },
    ]) {
      const invalid = clone(state);
      mutate(invalid);
      expect(M.validV7State(invalid)).toBe(false);
    }
    advance(state, (s) => s.phase.kind === "choice");
    if (state.phase.kind !== "choice") throw new Error("Expected choice.");
    const invalid = clone(state);
    if (invalid.phase.kind === "choice") delete invalid.phase.resume;
    expect(M.validV7State(invalid)).toBe(false);
    expect(M.validV6State(state)).toBe(false);
  });

  it("pays exact first-clear, replay and defeat coins once, without changing Sunfang acquisition", () => {
    const state = fresh(7);
    advance(state, done, ["blood", "heart", "bastion", "edge", "tempo"]);
    expect(state.phase.kind).toBe("victory");
    expect(state.meta.gold).toBe(90);
    expect(context(state).earnedGold).toBe(90);
    expect(context(state).kills).toBe(54);
    expect(state.meta.gear!.owned).toEqual([]);
    expect(state.meta.firstLight!.cleared).toBe(false);
    expect(state.meta.unlockedChapter).toBe(1);
    const loaded = clone(state);
    expect(M.validV7State(loaded)).toBe(true);
    expect(M.stepGame(loaded, 0.25)).toEqual([]);
    expect(M.returnToCamp(loaded)).toBe(true);
    expect(M.returnToCamp(loaded)).toBe(false);
    expect(M.startEmberMarch(loaded)).toBe(true);
    advance(loaded, done, ["blood", "heart", "bastion", "edge", "tempo"]);
    expect(loaded.phase.kind).toBe("victory");
    expect(loaded.meta.gold).toBe(156);
    expect(context(loaded).earnedGold).toBe(66);
    expect(loaded.phase).toMatchObject({ reward: 12, bonus: 0, bonusStatus: "claimed" });
    M.returnToCamp(loaded);
    M.startEmberMarch(loaded);
    advance(loaded, (s) => context(s).kills >= 1);
    const coins = context(loaded).kills;
    loaded.run.hp = 1;
    loaded.run.shield = 0;
    const battle = M.visibleBattle(loaded)!;
    battle.heroHit = null;
    battle.heroCooldown = 5;
    const enemy = M.livingEnemies(battle)[0]!;
    enemy.pendingHit = { remaining: 0.01, damage: enemy.damage, critical: false };
    M.stepGame(loaded, 0.02);
    expect(loaded.phase.kind).toBe("defeat");
    expect(context(loaded).earnedGold).toBe(coins);
    expect(loaded.meta.gold).toBe(156 + coins);
    expect(M.validV7State(loaded)).toBe(true);
  });

  it("keeps legal fresh sustain, speed and area runs bounded and checks every saved transaction", () => {
    const builds: M.PerkId[][] = [
      ["blood", "heart", "bastion", "edge", "tempo"],
      ["tempo", "edge", "execution", "blood", "heart"],
      ["cleave", "pierce", "chain", "storm", "edge", "blood"],
    ];
    for (const priority of builds)
      for (const seed of [7, 42, 927113]) {
        const state = fresh(seed);
        let maximum = 0,
          picks = 0;
        for (let i = 0; i < 40000 && !done(state); i++) {
          const p = state.phase;
          if (p.kind === "choice") {
            expect(p.options).toHaveLength(3);
            expect(p.options).not.toContain("renewal");
            const id = priority.find((id) => p.options.includes(id)) ?? p.options[0]!;
            M.choosePerk(state, id, p.offerId);
            picks++;
          } else if (p.kind === "march-gift") M.chooseMarchGift(state, p.options[0]!, p.offerId);
          else M.stepGame(state, 1 / 60);
          expect(M.validV7State(state), `${priority[0]} seed ${seed} tick ${i}`).toBe(true);
          maximum = Math.max(
            maximum,
            new TextEncoder().encode(JSON.stringify({ version: 7, savedAt: 0, state })).length,
          );
          expect(M.visibleBattle(state)?.enemies.length ?? 0).toBeLessThanOrEqual(10);
          expect(
            M.visibleBattle(state) ? M.livingEnemies(M.visibleBattle(state)!).length : 0,
          ).toBeLessThanOrEqual(4);
        }
        expect(state.phase.kind, `${priority[0]} seed ${seed}`).toBe("victory");
        expect(picks).toBe(10);
        expect(maximum).toBeLessThan(64 * 1024);
        expect(state.run.time).toBeGreaterThan(80);
        expect(state.run.time).toBeLessThan(240);
      }
  });
});
