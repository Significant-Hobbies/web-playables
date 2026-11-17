import { describe, expect, it } from "vitest";
import { RELEASED_V4_BATTLE } from "./fixtures/released-v4-battle.ts";
import {
  activeSynergies,
  beginBattle,
  COMBO_TUNING,
  type GameEvent,
  type GameState,
  heroStats,
  initialState,
  migrateV1State,
  migrateV2State,
  migrateV3State,
  migrateV4State,
  retreatToCamp,
  startRun,
  stepGame,
  synergyStatus,
  useSkill,
  validLegacyState,
  validState,
  validV2State,
  validV3State,
  validV4State,
} from "./model.ts";

function setup() {
  const state = initialState(42);
  state.meta.unlockedChapter = 5;
  Object.assign(state.adventures!.discoveries, { mira: true, cinder: true, whirlwind: true });
  startRun(state, 5);
  state.run.cleared = 11;
  state.run.context = { kind: "campaign", routes: [], junctionFloor: 11 };
  state.phase = beginBattle(state);
  state.phase.heroCooldown = 5;
  state.phase.companionCooldown = 5;
  state.phase.petCooldown = 5;
  for (const foe of state.phase.enemies) foe.cooldown = 5;
  return state as GameState & { phase: ReturnType<typeof beginBattle> };
}
function advance(state: GameState, seconds: number) {
  const events: GameEvent[] = [];
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame++)
    events.push(...stepGame(state, 1 / 60));
  return events;
}
function strike(state: ReturnType<typeof setup>, damage = 10) {
  state.phase.heroHit = {
    source: "hero",
    remaining: 0.001,
    damage,
    critical: false,
    target: state.phase.enemies[0]!.id,
    projectile: false,
  };
}
function incoming(state: ReturnType<typeof setup>) {
  const foe = state.phase.enemies[0]!;
  foe.pendingHit = { remaining: 0.001, damage: foe.damage, critical: false };
  return foe;
}
function hits(events: GameEvent[], effect: string) {
  return events.filter((event) => event.type === "hit" && event.effect === effect);
}

describe("bounded build reactions", () => {
  it("requires real chapter, equipment, discovery and oath choices", () => {
    const state = initialState();
    expect(activeSynergies(state)).toEqual([]);
    const built = setup();
    expect(activeSynergies(built)).toEqual(["hunters-signal"]);
    built.meta.loadout.skill = "aegis";
    built.meta.loadout.weapon = "spear";
    built.run.perks.storm = 1;
    expect(activeSynergies(built)).toEqual(["shatterguard", "storm-relay", "hunters-signal"]);
    built.meta.unlockedChapter = 2;
    expect(activeSynergies(built)).toEqual(["hunters-signal"]);
  });
  it("reveals build combinations at their discoveries and chapter milestones", () => {
    const state = initialState();
    expect(synergyStatus(state).filter((rule) => rule.revealed)).toEqual([]);
    state.meta.unlockedChapter = 3;
    expect(
      synergyStatus(state)
        .filter((rule) => rule.revealed)
        .map((rule) => rule.id),
    ).toEqual(["shatterguard", "storm-relay"]);
    Object.assign(state.adventures!.discoveries, { mira: true, cinder: true });
    expect(synergyStatus(state).every((rule) => rule.revealed)).toBe(true);
    state.meta.loadout.skill = "aegis";
    state.adventures!.discoveries.whirlwind = true;
    expect(activeSynergies(state)).toContain("shatterguard");
    expect(synergyStatus(state)[0]!.status).toContain("fresh Aegis");
  });
  it("keeps absorbed charge across a cleared wave and JSON reload until exactly one later break", () => {
    const state = setup();
    state.run.cleared = 1;
    state.run.context = { kind: "campaign", routes: [], junctionFloor: 0 };
    state.phase = beginBattle(state);
    state.phase.heroCooldown = state.phase.companionCooldown = state.phase.petCooldown = 5;
    for (const foe of state.phase.enemies) foe.cooldown = 5;
    state.meta.loadout.skill = "aegis";
    useSkill(state);
    incoming(state);
    stepGame(state, 0.01);
    const cast = structuredClone(state.run.shieldCast);
    expect(cast!.absorbed).toBeGreaterThan(0);
    for (const foe of state.phase.enemies.slice(1)) foe.hp = 0;
    strike(state, 10000);
    stepGame(state, 0.01);
    expect(state.phase.kind).toBe("travel");
    expect(state.run.shieldCast).toEqual(cast);
    expect(validState(state)).toBe(true);
    const reloaded: GameState = JSON.parse(JSON.stringify(state));
    expect(validState(reloaded)).toBe(true);
    advance(reloaded, 1.2);
    if (reloaded.phase.kind !== "battle") throw new Error("Expected next battle");
    reloaded.phase.heroCooldown = reloaded.phase.companionCooldown = reloaded.phase.petCooldown = 5;
    for (const foe of reloaded.phase.enemies) foe.cooldown = 5;
    const foe = reloaded.phase.enemies[0]!;
    let shatters = 0;
    for (let hit = 0; hit < 20 && reloaded.run.shield > 0; hit++) {
      foe.pendingHit = { remaining: 0.001, damage: foe.damage, critical: false };
      shatters += stepGame(reloaded, 0.01).filter(
        (event) => event.type === "combo" && event.effect === "shatterguard",
      ).length;
    }
    expect(shatters).toBe(reloaded.phase.enemies.length);
    expect(reloaded.run.shieldCast).toBeNull();
    expect(
      advance(reloaded, 0.3).filter(
        (event) => event.type === "hit" && event.effect === "shatterguard",
      ),
    ).toHaveLength(shatters);
    foe.pendingHit = { remaining: 0.001, damage: foe.damage, critical: false };
    expect(
      stepGame(reloaded, 0.01).some(
        (event) => event.type === "combo" && event.effect === "shatterguard",
      ),
    ).toBe(false);
  });
  it("preserves charged barriers at choices and forks but rejects terminal cast artifacts", () => {
    const state: GameState = setup();
    state.run.shield = 10;
    state.run.shieldCast = { absorbed: 5, attack: heroStats(state).damage };
    state.run.cleared = 6;
    state.run.context = { kind: "campaign", routes: [], junctionFloor: 0 };
    state.phase = { kind: "route", at: 6 };
    expect(validState(state)).toBe(true);
    state.run.cleared = 2;
    state.phase = { kind: "choice", options: ["edge", "tempo", "heart"], rerolls: 1 };
    expect(validState(state)).toBe(true);
    state.phase = { kind: "camp" };
    expect(validState(state)).toBe(false);
    state.phase = { kind: "travel", remaining: 1 };
    retreatToCamp(state);
    expect(state.run.shieldCast).toBeNull();
    expect(state.run.shield).toBe(0);
    startRun(state, 5);
    expect(state.run.shieldCast).toBeNull();
  });
  it.each([
    ["full block", 100, 10, 0],
    ["partial block", 5, 10, 0],
    ["unshielded body armor", 0, 10, 0],
    ["minimum body damage", 0, 100, 1],
  ])("applies ranged mitigation, barrier, then body armor: %s", (_, shield, armor, minimum) => {
    const state = setup();
    state.meta.upgrades.mail = armor;
    state.run.shield = shield;
    state.run.shieldCast = null;
    const hp = state.run.hp;
    const foe = incoming(state);
    const raw = Math.max(1, foe.damage);
    stepGame(state, 0.01);
    expect(state.run.shield).toBe(Math.max(0, shield - raw));
    expect(hp - state.run.hp).toBe(shield >= raw ? 0 : Math.max(minimum, 1, raw - shield - armor));
  });
  it("applies ranged resistance before barrier absorption", () => {
    const state = setup();
    state.run.perks.ward = 1;
    state.meta.upgrades.mail = 4;
    state.run.shield = 5;
    const foe = state.phase.enemies.find((enemy) => enemy.row === "back")!;
    foe.pendingHit = { remaining: 0.001, damage: foe.damage, critical: false };
    const hp = state.run.hp;
    const raw = Math.max(1, foe.damage * (1 - heroStats(state).rangedResistance));
    stepGame(state, 0.01);
    expect(state.run.shield).toBe(0);
    expect(hp - state.run.hp).toBeCloseTo(Math.max(1, raw - 5 - heroStats(state).armor));
  });
  it("clears cast provenance on victory without letting queued shards enter another wave", () => {
    const state = setup();
    state.meta.loadout.skill = "aegis";
    useSkill(state);
    for (const foe of state.phase.enemies.slice(1)) foe.hp = 0;
    strike(state, 10000);
    stepGame(state, 0.01);
    expect(state.phase.kind).toBe("victory");
    expect(state.run.shieldCast).toBeNull();
    expect(validState(state)).toBe(true);
    state.run.shieldCast = { absorbed: 0, attack: 1 };
    expect(validState(state)).toBe(false);
    state.run.shieldCast = null;
    startRun(state, 5);
    expect(state.run.shield).toBe(0);
    expect(state.run.shieldCast).toBeNull();
  });
  it("shatters once only after positive shield absorption reaches zero, with both caps", () => {
    const state = setup();
    state.meta.loadout.skill = "aegis";
    state.run.perks.thorns = 1;
    useSkill(state);
    const initialShield = state.run.shield;
    const attack = heroStats(state).damage;
    // Consume genuine enemy attacks, keeping the shield's cast provenance.
    while (state.run.shield > 0) {
      incoming(state);
      stepGame(state, 0.01);
    }
    expect(state.run.shieldCast).toBeNull();
    const queued = state.phase.reactions!;
    expect(queued).toHaveLength(3);
    expect(queued.reduce((sum, reaction) => sum + reaction.damage, 0)).toBeCloseTo(
      Math.min(initialShield * 0.6, attack),
    );
    state.run.hp = 100;
    state.run.perks.blood = 3;
    const events = advance(state, 0.3);
    expect(hits(events, "shatterguard")).toHaveLength(3);
    expect(events.some((event) => event.type === "heal")).toBe(false);
    expect(state.phase.reactions).toEqual([]);
    expect(
      advance(state, 0.3).some(
        (event) => event.type === "combo" && event.effect === "shatterguard",
      ),
    ).toBe(false);
  });
  it("small shield breaks never exceed actual absorbed damage, even below armor", () => {
    const state = setup();
    state.run.shield = 0.5;
    state.run.shieldCast = { absorbed: 0, attack: 50 };
    incoming(state);
    stepGame(state, 0.01);
    const events = advance(state, 0.3);
    expect(
      hits(events, "shatterguard").reduce(
        (sum, event) => sum + (event.type === "hit" ? event.damage : 0),
        0,
      ),
    ).toBeLessThanOrEqual(0.3);
  });
  it("refreshes and lethal damage never detonate shields; cleared waves discard queues", () => {
    const state = setup();
    state.meta.loadout.skill = "aegis";
    state.run.perks.thorns = 1;
    useSkill(state);
    state.run.skillCooldown = 0;
    expect(
      useSkill(state).some((event) => event.type === "combo" && event.effect === "shatterguard"),
    ).toBe(false);
    expect(state.phase.reactions).toEqual([]);
    state.run.shield = 0.1;
    state.run.hp = 0.1;
    incoming(state);
    const events = stepGame(state, 0.01);
    expect(state.phase.kind).toBe("defeat");
    expect(state.run.shieldCast).toBeNull();
    expect(validState(state)).toBe(true);
    state.run.shield = 1;
    state.run.shieldCast = { absorbed: 0, attack: 1 };
    expect(validState(state)).toBe(false);
    expect(events.some((event) => event.type === "combo" && event.effect === "shatterguard")).toBe(
      false,
    );
  });
  it("discards queued shards and battle-only marks and bracing at a wave boundary", () => {
    const state = setup();
    state.run.cleared = 1;
    state.run.context = { kind: "campaign", routes: [], junctionFloor: 0 };
    state.phase = beginBattle(state);
    state.phase.heroCooldown = state.phase.companionCooldown = state.phase.petCooldown = 5;
    const foe = state.phase.enemies[0]!;
    foe.hp = 1;
    foe.cooldown = 5;
    foe.braced = true;
    for (const other of state.phase.enemies.slice(1)) other.hp = 0;
    state.phase.markSerial = 1;
    state.phase.mark = { target: foe.id, serial: 1, remaining: 4 };
    state.run.perks.thorns = 1;
    state.run.shield = 1;
    state.run.shieldCast = { absorbed: 5, attack: heroStats(state).damage };
    incoming(state);
    expect(
      stepGame(state, 0.01).some(
        (event) => event.type === "combo" && event.effect === "shatterguard",
      ),
    ).toBe(true);
    expect(state.phase.kind).toBe("travel");
    expect(hits(advance(state, 1.2), "shatterguard")).toEqual([]);
    expect(state.phase).toMatchObject({ kind: "battle", reactions: [], mark: null, markSerial: 0 });
    expect(state.phase.enemies.every((enemy) => !enemy.braced)).toBe(true);
  });
  it("replays queued shards deterministically after reload", () => {
    const state = setup();
    state.run.shield = 1;
    state.run.shieldCast = { absorbed: 10, attack: 24 };
    incoming(state);
    stepGame(state, 0.01);
    expect(validState(state)).toBe(true);
    const twin = JSON.parse(JSON.stringify(state));
    expect(advance(state, 0.5)).toEqual(advance(twin, 0.5));
    expect(state).toEqual(twin);
  });
  it("redistributes covenant's existing chain budget with distinct decaying relay hops", () => {
    const state = setup();
    state.meta.loadout.weapon = "spear";
    state.run.perks.chain = 2;
    state.run.strikes = 2;
    strike(state);
    const events = stepGame(state, 0.01);
    const relay = hits(events, "storm-relay");
    expect(relay.length).toBeGreaterThan(0);
    expect(new Set(relay.map((event) => event.type === "hit" && event.target)).size).toBe(
      relay.length,
    );
    expect(
      relay.reduce((sum, event) => sum + (event.type === "hit" ? event.damage : 0), 0),
    ).toBeLessThanOrEqual(56);
    expect(
      events.filter((event) => event.type === "hit" && event.lightning && !event.effect),
    ).toHaveLength(0);
    const origin = events.find((event) => event.type === "combo" && event.effect === "storm-relay");
    expect(origin && "actor" in origin && origin.actor).toBe("enemy-1");
  });
  it("entry relay is small, no-heal and cannot recursively fire strikes or reactions", () => {
    const state = setup();
    state.meta.loadout.weapon = "spear";
    state.run.perks.storm = 1;
    state.run.perks.blood = 3;
    state.run.hp = 100;
    state.run.strikes = 2;
    strike(state);
    const events = stepGame(state, 0.01);
    const relayDamage = hits(events, "storm-relay").reduce(
      (sum, event) => sum + (event.type === "hit" ? event.damage : 0),
      0,
    );
    expect(relayDamage).toBeLessThanOrEqual(
      heroStats(state).damage * COMBO_TUNING.relayEntryAttack,
    );
    expect(state.run.strikes).toBe(3);
    const weaponDamage = events
      .filter((event) => event.type === "hit" && event.actor === "hero" && !event.effect)
      .reduce((sum, event) => sum + (event.type === "hit" ? event.damage : 0), 0);
    expect(state.run.hp - 100).toBeCloseTo(weaponDamage * 0.3);
  });
  it("does not relay missed targets and preserves non-piercing covenant fallback", () => {
    const state = setup();
    state.run.perks.chain = 1;
    state.run.strikes = 2;
    strike(state);
    expect(hits(stepGame(state, 0.01), "storm-relay")).toEqual([]);
    state.meta.loadout.weapon = "spear";
    strike(state);
    state.phase.enemies[0]!.hp = 0;
    expect(hits(stepGame(state, 0.01), "storm-relay")).toEqual([]);
  });
  it("preserves covenant damage when only the pierced foe survives", () => {
    const state = setup();
    state.meta.loadout.weapon = "spear";
    state.run.perks.chain = 1;
    state.run.strikes = 2;
    const front = state.phase.enemies[0]!;
    const rear = state.phase.enemies.find((foe) => foe.row === "back")!;
    for (const foe of state.phase.enemies) if (foe !== front && foe !== rear) foe.hp = 0;
    front.hp = 1;
    const before = rear.hp;
    const pierceDamage = 10 * heroStats(state).pierce;
    strike(state);
    const events = stepGame(state, 0.01);
    expect(front.hp).toBe(0);
    expect(rear.hp).toBeCloseTo(before - pierceDamage - 14);
    expect(hits(events, "storm-relay")).toEqual([]);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "hit",
        target: rear.id,
        damage: 14,
        lightning: true,
      }),
    );
    expect(validState(state)).toBe(true);
  });
});

describe("Hunter’s Signal checkpoint semantics", () => {
  function mark() {
    const state = setup();
    const target = state.phase.enemies[1]!;
    state.phase.petHit = {
      source: "fox",
      target: target.id,
      damage: 5,
      remaining: 0.001,
      critical: false,
      projectile: false,
    };
    stepGame(state, 0.01);
    return { state, target };
  }
  it("Mira aims her next arrow, consumes one mark and adds exactly 50% snapshotted damage", () => {
    const { state, target } = mark();
    state.phase.companionCooldown = 0;
    stepGame(state, 0.01);
    const arrow = structuredClone(state.phase.companionHit!);
    expect(arrow.target).toBe(target.id);
    expect(arrow.signalBonus).toBe(arrow.damage * 0.5);
    const twin = JSON.parse(JSON.stringify(state));
    expect(validState(twin)).toBe(true);
    const before = target.hp;
    expect(advance(state, 0.6)).toEqual(advance(twin, 0.6));
    expect(state).toEqual(twin);
    expect(before - target.hp).toBeCloseTo(arrow.damage * 1.5 - target.armor);
    expect(state.phase.mark).toBeNull();
  });
  it("does not retarget an arrow already flying when Cinder marks another foe", () => {
    const state = setup();
    state.phase.companionCooldown = 0;
    stepGame(state, 0.01);
    const original = state.phase.companionHit!.target;
    const target = state.phase.enemies[2]!;
    state.phase.petHit = {
      source: "fox",
      target: target.id,
      damage: 5,
      remaining: 0.001,
      critical: false,
      projectile: false,
    };
    stepGame(state, 0.01);
    expect(state.phase.companionHit!.target).toBe(original);
    expect(
      advance(state, 0.6).some(
        (event) => event.type === "combo" && event.effect === "hunters-signal",
      ),
    ).toBe(false);
  });
  it("expires marks and rejects bonuses for dead or replaced targets", () => {
    for (const mode of ["expire", "dead", "replace"]) {
      const { state, target } = mark();
      state.phase.companionCooldown = 0;
      stepGame(state, 0.01);
      if (mode === "expire") state.phase.mark!.remaining = 0.01;
      if (mode === "dead") {
        target.hp = 0;
        target.pendingHit = null;
      }
      if (mode === "replace") state.phase.mark!.serial = ++state.phase.markSerial!;
      expect(
        advance(state, 0.6).some(
          (event) => event.type === "combo" && event.effect === "hunters-signal",
        ),
      ).toBe(false);
    }
  });
});

describe("control recovery", () => {
  it("fast repeated Thunderclap cannot permanently suppress the chapter-five final formation", () => {
    const state = setup();
    state.meta.loadout.weapon = "spear";
    state.meta.loadout.armor = "cloak";
    state.run.perks = { interrupt: 2, tempo: 2 };
    state.phase = beginBattle(state);
    const incomingTimes: number[] = [];
    for (let frame = 0; frame < 30 * 60 && state.phase.kind === "battle"; frame++) {
      for (const event of stepGame(state, 1 / 60))
        if (event.type === "hit" && event.target === "hero") incomingTimes.push(state.run.time);
      expect(validState(state)).toBe(true);
    }
    expect(incomingTimes.length).toBeGreaterThan(2);
    expect(Math.max(...incomingTimes)).toBeGreaterThan(4);
  });
  it("all cancel sources respect bracing until an enemy attack resolves, including shielded hits", () => {
    const state = setup();
    state.meta.loadout.skill = "aegis";
    useSkill(state);
    const foe = state.phase.enemies[1]!;
    expect(foe.braced).toBe(true);
    foe.cooldown = 0.4;
    const pending = { damage: foe.damage, remaining: 0.2, critical: false };
    foe.pendingHit = pending;
    state.run.skillCooldown = 0;
    state.meta.loadout.skill = "volley";
    useSkill(state);
    expect(foe.pendingHit).toBe(pending);
    expect(foe.cooldown).toBe(0.4);
    state.run.strikes = 2;
    state.run.perks.interrupt = 2;
    strike(state);
    stepGame(state, 0.01);
    expect(foe.pendingHit).toBe(pending);
    state.phase.petHit = {
      source: "owl",
      remaining: 0.001,
      damage: 1,
      target: foe.id,
      critical: false,
      projectile: false,
    };
    stepGame(state, 0.01);
    expect(foe.pendingHit).toBe(pending);
    state.run.shield = 100;
    state.run.shieldCast = null;
    advance(state, 0.2);
    expect(foe.braced).toBe(false);
    state.run.skillCooldown = 0;
    useSkill(state);
    expect(foe.braced).toBe(true);
  });
});

describe("v5 strict combat envelope", () => {
  it("validates native states and rejects malformed sources, duplicates and unbounded queues", () => {
    const state = setup();
    expect(validState(state)).toBe(true);
    const invalid = [
      (s: typeof state) => {
        s.run.shieldCast = { absorbed: Infinity, attack: 24 };
      },
      (s: typeof state) => {
        delete s.phase.enemies[0]!.braced;
      },
      (s: typeof state) => {
        s.phase.mark = { target: "enemy-99", remaining: 4, serial: 1 };
      },
      (s: typeof state) => {
        s.phase.reactions = Array.from({ length: 4 }, () => ({
          target: "enemy-1",
          damage: 1,
          remaining: 0.2,
          actor: "hero",
          effect: "shatterguard",
        }));
      },
      (s: typeof state) => {
        s.phase.reactions = [null] as unknown as NonNullable<typeof s.phase.reactions>;
      },
      (s: typeof state) => {
        strike(s);
        s.phase.heroHit!.source = "mira";
      },
    ];
    for (const mutate of invalid) {
      const bad = structuredClone(state);
      mutate(bad);
      expect(validState(bad)).toBe(false);
    }
    expect(
      new TextEncoder().encode(JSON.stringify({ version: 5, savedAt: 0, state })).byteLength,
    ).toBeLessThan(65536);
  });
  it("keeps sequential v1, v2, v3 and v4 migrations valid without granting currency", () => {
    const legacy = {
      meta: {
        gold: 7,
        earnedGold: 7,
        unlockedChapter: 1,
        victories: 0,
        defeats: 0,
        upgrades: { blade: 0, mail: 0, charm: 0 },
      },
      run: {
        chapter: 1,
        cleared: 0,
        hp: 180,
        xp: 0,
        level: 1,
        strikes: 0,
        seed: 42,
        time: 0,
        distance: 0,
        perks: {},
      },
      phase: { kind: "camp" },
    };
    expect(validLegacyState(legacy)).toBe(true);
    const v2 = migrateV1State(legacy);
    expect(validV2State(v2)).toBe(true);
    const v3 = migrateV2State(v2);
    expect(validV3State(v3)).toBe(true);
    const v4 = migrateV3State(v3);
    expect(validV4State(v4)).toBe(true);
    const v5 = migrateV4State(v4);
    expect(validState(v5)).toBe(true);
    expect(v5.meta.gold).toBe(7);
    expect(v5.meta.earnedGold).toBe(7);
    expect(v5.run.hp).toBe(180);
    expect(v5.run.perks).toEqual({});
  });
  it("preserves a genuine released v4 battle, pending attack budgets and all durable progress", () => {
    const old = structuredClone(RELEASED_V4_BATTLE.state);
    expect(validV4State(old)).toBe(true);
    const state = migrateV4State(old);
    expect(validState(state)).toBe(true);
    expect(state.meta).toEqual(old.meta);
    expect(state.quests).toEqual(old.quests);
    expect(state.adventures).toEqual(old.adventures);
    expect(state.run).toEqual({ ...old.run, shieldCast: null });
    expect(state.phase).toMatchObject(old.phase);
    if (state.phase.kind !== "battle") throw new Error("Expected released battle");
    expect(state.phase.mark).toBeNull();
    expect(state.phase.reactions).toEqual([]);
    expect(state.phase.enemies.every((foe) => foe.braced === false)).toBe(true);
    expect(state.phase.heroHit).toMatchObject({ legacy: true, source: "hero" });
    expect(state.phase.companionHit).toMatchObject({
      legacy: true,
      source: old.meta.loadout.companion,
    });
    const twin = JSON.parse(JSON.stringify(state));
    expect(advance(state, 1)).toEqual(advance(twin, 1));
    expect(state).toEqual(twin);
  });
  it("lands one migrated enemy attack with v4 armor order, then uses v5 barrier order", () => {
    const old = structuredClone(RELEASED_V4_BATTLE.state);
    const state = migrateV4State(old);
    if (state.phase.kind !== "battle") throw new Error("Expected released battle");
    state.phase.heroHit = state.phase.companionHit = state.phase.petHit = null;
    state.phase.heroCooldown = state.phase.companionCooldown = state.phase.petCooldown = 5;
    const foe = state.phase.enemies.find((enemy) => enemy.pendingHit)!;
    for (const enemy of state.phase.enemies) {
      enemy.cooldown = 5;
      if (enemy !== foe) enemy.pendingHit = null;
    }
    expect(foe.pendingHit!.legacy).toBe(true);
    state.run.shield = 40;
    const stats = heroStats(state);
    const raw = foe.damage * (foe.row === "back" ? 1 - stats.rangedResistance : 1);
    foe.pendingHit!.remaining = 0.001;
    expect(validState(state)).toBe(true);
    stepGame(state, 0.01);
    expect(state.run.shield).toBeCloseTo(40 - Math.max(1, raw - stats.armor));
    foe.cooldown = 0;
    stepGame(state, 0.01);
    expect(foe.pendingHit!.legacy).toBeUndefined();
    const before = state.run.shield;
    foe.pendingHit!.remaining = 0.001;
    stepGame(state, 0.01);
    expect(state.run.shield).toBeCloseTo(Math.max(0, before - Math.max(1, raw)));
  });
  it("preserves fractional v4 health damage when a queued attack partly exceeds its barrier", () => {
    const state = migrateV4State(structuredClone(RELEASED_V4_BATTLE.state));
    if (state.phase.kind !== "battle") throw new Error("Expected released battle");
    state.phase.heroHit = state.phase.companionHit = state.phase.petHit = null;
    state.phase.heroCooldown = state.phase.companionCooldown = state.phase.petCooldown = 5;
    const foe = state.phase.enemies.find((enemy) => enemy.pendingHit)!;
    for (const enemy of state.phase.enemies) {
      enemy.cooldown = 5;
      if (enemy !== foe) enemy.pendingHit = null;
    }
    const stats = heroStats(state);
    const raw = foe.damage * (foe.row === "back" ? 1 - stats.rangedResistance : 1);
    state.run.shield = Math.max(1, raw - stats.armor) - 0.25;
    const hp = state.run.hp;
    foe.pendingHit!.remaining = 0.001;
    stepGame(state, 0.01);
    expect(hp - state.run.hp).toBeCloseTo(0.25);
    expect(state.run.shield).toBe(0);
  });
  it("strictly rejects malformed enemy legacy flags while leaving v4 acceptance frozen", () => {
    const state = setup();
    const foe = incoming(state);
    for (const flag of [false, 1, "true", null]) {
      Object.assign(foe.pendingHit!, { legacy: flag });
      expect(validV4State(state)).toBe(true);
      expect(validState(state)).toBe(false);
    }
  });
  it("v4 acceptance does not require new fields and migration grants no retroactive proc", () => {
    const state = setup();
    delete state.run.shieldCast;
    delete state.phase.mark;
    delete state.phase.markSerial;
    delete state.phase.reactions;
    for (const foe of state.phase.enemies) delete foe.braced;
    state.run.shield = 10;
    state.phase.heroHit = {
      target: "enemy-0",
      damage: 24,
      remaining: 0.1,
      projectile: false,
      critical: false,
    };
    expect(validV4State(state)).toBe(true);
    expect(validState(state)).toBe(false);
    const next = migrateV4State(state);
    expect(validState(next)).toBe(true);
    expect(next.run.shieldCast).toBeNull();
    expect(next.run).toMatchObject(state.run);
    expect(next.meta).toEqual(state.meta);
    expect(next.quests).toEqual(state.quests);
    expect(next.phase).toMatchObject({ heroHit: { remaining: 0.1, damage: 24, legacy: true } });
  });
});
