import { describe, expect, it } from "vitest";
import {
  ARMORS,
  type BattlePhase,
  beginBattle,
  buyUpgrade,
  COMPANIONS,
  useSkill as castSkill,
  choosePerk,
  ENCOUNTERS_PER_CHAPTER,
  encounter,
  encounterGroup,
  equip,
  type GameState,
  heroStats,
  initialState,
  type LegacyState,
  livingEnemies,
  migrateV1State,
  migrateV2State,
  PERKS,
  PETS,
  type PerkId,
  rank,
  retreatToCamp,
  returnToCamp,
  SKILLS,
  skipPerk,
  startRun,
  stepGame,
  validLegacyState,
  validState,
  validV2State,
  WEAPONS,
} from "./model";

function battle(state = initialState()): BattlePhase {
  startRun(state);
  const phase = beginBattle(state);
  state.phase = phase;
  phase.heroCooldown = 5;
  phase.companionCooldown = 5;
  phase.petCooldown = 5;
  for (const foe of phase.enemies) foe.cooldown = 5;
  return phase;
}
function enemyAt(battle: BattlePhase, slot: number) {
  const enemy = battle.enemies[slot];
  if (!enemy) throw new Error(`Expected enemy slot ${slot}`);
  return enemy;
}
function advance(state: GameState, seconds: number) {
  const events = [];
  for (let i = 0; i < Math.ceil(seconds * 60); i++) events.push(...stepGame(state, 1 / 60));
  return events;
}
function legacy(phase: "camp" | "battle" | "choice" = "camp"): LegacyState {
  const s = initialState(42);
  const { loadout: _, ...meta } = s.meta;
  const { skillCooldown: __, shield: ___, ...run } = s.run;
  return {
    meta,
    run,
    phase:
      phase === "camp"
        ? { kind: "camp" }
        : phase === "choice"
          ? { kind: "choice", options: ["edge", "blood", "heart"] }
          : {
              kind: "battle",
              enemy: encounter(1, 0),
              heroCooldown: 0.6,
              enemyCooldown: 0.7,
              heroHit: { remaining: 0.12, damage: 24, critical: false },
              enemyHit: { remaining: 0.2, damage: encounter(1, 0).damage, critical: false },
            },
  };
}
const priorities: PerkId[] = [
  "renewal",
  "bastion",
  "blood",
  "cleave",
  "chain",
  "edge",
  "storm",
  "heart",
  "tempo",
  "interrupt",
  "ward",
  "pierce",
  "execution",
  "thorns",
];
function completeRun(state: GameState) {
  for (let i = 0; i < 30000; i++) {
    if (state.phase.kind === "choice") {
      const options = state.phase.options;
      const choice = priorities.find((id) => options.includes(id));
      if (!choice || !choosePerk(state, choice))
        throw Error("An offered choice must resume the road.");
    } else if (state.phase.kind === "victory" || state.phase.kind === "defeat") return;
    else {
      castSkill(state);
      stepGame(state, 1 / 30);
    }
    if (!validState(state)) throw Error("Invalid runtime state during campaign.");
  }
  throw Error("The chapter never resolved.");
}

describe("a company on the old road", () => {
  it("migrates version-two battles without crediting old totals to daily or weekly quests", () => {
    const original = initialState();
    original.meta.unlockedChapter = 3;
    original.meta.victories = 91;
    original.meta.earnedGold = 1000;
    original.meta.gold = 700;
    original.run.strikes = 500;
    battle(original);
    const { quests: _quests, ...old } = structuredClone(original);
    const before = JSON.stringify(old);
    expect(validV2State(old)).toBe(true);
    expect(validState(old)).toBe(false);
    const next = migrateV2State(old);
    expect(JSON.stringify(old)).toBe(before);
    expect(next.meta).toEqual(original.meta);
    expect(next.run).toEqual(original.run);
    expect(next.phase).toEqual(original.phase);
    expect(next.quests.daily.progress).toEqual({ kills: 0, skills: 0, oaths: 0, victories: 0 });
    expect(next.quests.weekly.progress).toEqual(next.quests.daily.progress);
    expect(next.quests.story).toEqual({ completed: [1, 2], claimed: [] });
    expect(validState(next)).toBe(true);
    expect(
      new TextEncoder().encode(JSON.stringify({ version: 3, savedAt: 0, state: next })).byteLength,
    ).toBeLessThan(64 * 1024);
  });
  it("preserves final-chapter completion on migration and rejects invalid quest saves", () => {
    const state = initialState();
    state.meta.unlockedChapter = 5;
    state.run.chapter = 5;
    state.run.cleared = ENCOUNTERS_PER_CHAPTER;
    state.phase = { kind: "victory", reward: 110 };
    const { quests: _quests, ...old } = state;
    const next = migrateV2State(old);
    expect(next.quests.story.completed).toEqual([1, 2, 3, 4, 5]);
    next.quests.daily.progress.kills = -1;
    expect(validState(next)).toBe(false);
    expect(() => migrateV2State({ ...old, meta: { ...old.meta, gold: -1 } })).toThrow();
  });
  it("begins immediately with front melee and a rear archer that attack independently", () => {
    const s = initialState();
    const b = battle(s);
    expect(b.enemies.map((e) => [e.row, e.kind])).toEqual([
      ["front", "raider"],
      ["back", "archer"],
    ]);
    for (const e of b.enemies) e.cooldown = 0;
    const windups = stepGame(s, 0.01).filter((e) => e.type === "swing");
    expect(windups).toMatchObject([
      { actor: "enemy-0", target: "hero", projectile: false },
      { actor: "enemy-1", target: "hero", projectile: true },
    ]);
    const hp = s.run.hp;
    advance(s, 0.35);
    expect(s.run.hp).toBeLessThan(hp);
    const afterMelee = s.run.hp;
    expect(b.enemies[1]?.pendingHit).not.toBeNull();
    advance(s, 0.35);
    expect(s.run.hp).toBeLessThan(afterMelee);
  });
  it("keeps melee fighters in front and archers or spellcasters in every rear row", () => {
    for (let chapter = 1; chapter <= 5; chapter++) {
      for (let cleared = 0; cleared < ENCOUNTERS_PER_CHAPTER; cleared++) {
        for (const enemy of encounterGroup(chapter, cleared)) {
          expect(
            enemy.row === "back" ? ["archer", "hexer"] : ["raider", "sentinel", "warden"],
          ).toContain(enemy.kind);
        }
      }
    }
  });
  it("keeps front fighters between ordinary sword strikes and rear enemies", () => {
    const s = initialState();
    const b = battle(s);
    b.heroCooldown = 0;
    stepGame(s, 0.01);
    expect(b.heroHit?.target).toBe("enemy-0");
    advance(s, 0.25);
    expect(enemyAt(b, 0).hp).toBeLessThan(enemyAt(b, 0).maxHp);
    expect(enemyAt(b, 1).hp).toBe(enemyAt(b, 1).maxHp);
  });
  it("shows companion arrows and pet attacks doing real damage to their targets", () => {
    const s = initialState();
    const b = battle(s);
    b.companionCooldown = 0;
    b.petCooldown = 0;
    const events = stepGame(s, 0.01);
    expect(events).toContainEqual(
      expect.objectContaining({ actor: "companion", target: "enemy-1", projectile: true }),
    );
    expect(events).toContainEqual(expect.objectContaining({ actor: "pet" }));
    advance(s, 0.55);
    expect(enemyAt(b, 1).hp).toBeLessThan(enemyAt(b, 1).maxHp);
  });
  it("cancels a fallen archer’s pending arrow and pays each defeated foe once", () => {
    const s = initialState();
    const b = battle(s);
    const foe = enemyAt(b, 1);
    foe.hp = 1;
    foe.pendingHit = { remaining: 0.01, damage: foe.damage, critical: false };
    b.companionHit = {
      remaining: 0.01,
      damage: 100,
      critical: false,
      target: foe.id,
      projectile: true,
    };
    const events = stepGame(s, 0.02);
    expect(foe.hp).toBe(0);
    expect(foe.pendingHit).toBeNull();
    expect(s.run.hp).toBe(180);
    expect(s.meta.gold).toBe(foe.gold);
    expect(s.run.cleared).toBe(0);
    expect(events).toContainEqual({ type: "kill", gold: foe.gold, target: foe.id });
    advance(s, 0.2);
    expect(s.meta.gold).toBe(foe.gold);
  });
  it("cleaves another front fighter and pierces the rear rather than adding cosmetic labels", () => {
    const s = initialState();
    s.run.cleared = 8;
    s.run.perks = { cleave: 1, pierce: 1 };
    const b = beginBattle(s);
    s.phase = b;
    b.heroCooldown = 5;
    b.companionCooldown = 5;
    b.petCooldown = 5;
    for (const e of b.enemies) e.cooldown = 5;
    b.heroHit = {
      remaining: 0.01,
      damage: 20,
      critical: false,
      target: "enemy-0",
      projectile: false,
    };
    const events = stepGame(s, 0.02);
    const hits = events.filter((e) => e.type === "hit");
    expect(hits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ target: "enemy-0" }),
        expect.objectContaining({ target: "enemy-1" }),
        expect.objectContaining({ target: "enemy-2" }),
      ]),
    );
    expect(enemyAt(b, 1).hp).toBeLessThan(enemyAt(b, 1).maxHp);
    expect(enemyAt(b, 2).hp).toBeLessThan(enemyAt(b, 2).maxHp);
  });
  it("interrupts windups and arrows on every third Thunderclap strike", () => {
    const s = initialState();
    s.run.strikes = 2;
    s.run.perks.interrupt = 1;
    const b = battle(s);
    s.run.strikes = 2;
    s.run.perks.interrupt = 1;
    b.heroHit = {
      remaining: 0.01,
      damage: 1,
      critical: false,
      target: "enemy-0",
      projectile: false,
    };
    for (const e of b.enemies)
      e.pendingHit = { remaining: 0.01, damage: e.damage, critical: false };
    const events = stepGame(s, 0.02);
    expect(s.run.hp).toBe(180);
    expect(b.enemies.every((e) => e.pendingHit === null && e.cooldown >= 1.18)).toBe(true);
    expect(events.filter((e) => e.type === "interrupt")).toHaveLength(2);
  });
  it("chains lightning to distinct living enemies only on the third strike", () => {
    const s = initialState();
    const b = battle(s);
    s.run.perks.chain = 1;
    s.run.perks.storm = 1;
    s.run.strikes = 1;
    b.heroHit = {
      remaining: 0.01,
      damage: 1,
      critical: false,
      target: "enemy-0",
      projectile: false,
    };
    expect(stepGame(s, 0.02).filter((e) => e.type === "hit" && e.lightning)).toHaveLength(0);
    b.heroHit = {
      remaining: 0.01,
      damage: 1,
      critical: false,
      target: "enemy-0",
      projectile: false,
    };
    const events = stepGame(s, 0.02);
    expect(events.filter((e) => e.type === "hit" && e.lightning)).toHaveLength(2);
  });
  it("reduces rear fire with a ward, while armor never heals the hero", () => {
    const s = initialState();
    const b = battle(s);
    s.run.perks.ward = 2;
    const rear = enemyAt(b, 1);
    rear.pendingHit = { remaining: 0.01, damage: 10, critical: false };
    stepGame(s, 0.02);
    expect(s.run.hp).toBeCloseTo(177);
    s.run.perks.bastion = 3;
    rear.pendingHit = { remaining: 0.01, damage: 2, critical: false };
    stepGame(s, 0.02);
    expect(s.run.hp).toBeCloseTo(176);
  });
  it("awards wave progress and renewal only when the whole formation is defeated", () => {
    const s = initialState();
    const b = battle(s);
    s.run.perks.renewal = 1;
    s.run.hp = 90;
    b.heroHit = {
      remaining: 0.01,
      damage: 100,
      critical: false,
      target: "enemy-0",
      projectile: false,
    };
    stepGame(s, 0.02);
    expect(s.run.cleared).toBe(0);
    expect(s.run.xp).toBe(0);
    expect(s.run.hp).toBe(90);
    b.heroHit = {
      remaining: 0.01,
      damage: 100,
      critical: false,
      target: "enemy-1",
      projectile: false,
    };
    stepGame(s, 0.02);
    expect(s.run.cleared).toBe(1);
    expect(s.run.xp).toBe(2);
    expect(s.run.hp).toBeCloseTo(104.4);
    const gold = s.meta.gold;
    advance(s, 0.2);
    expect(s.meta.gold).toBe(gold);
  });
  it("offers four honest rarity tiers and skips a choice without granting a perk or currency", () => {
    const s = initialState();
    s.phase = { kind: "choice", options: ["edge", "storm", "interrupt"] };
    const gold = s.meta.gold;
    expect(new Set(PERKS.map((p) => p.rarity))).toEqual(
      new Set(["common", "rare", "epic", "legendary"]),
    );
    expect(skipPerk(s)).toBe(true);
    expect(skipPerk(s)).toBe(false);
    expect(s.run.perks).toEqual({});
    expect(s.meta.gold).toBe(gold);
    expect(s.phase.kind).toBe("travel");
  });
  it("rejects unoffered choices and freezes choices and all skill cooldowns", () => {
    const s = initialState();
    s.phase = { kind: "choice", options: ["edge", "storm", "interrupt"] };
    s.run.skillCooldown = 4;
    const frozen = structuredClone(s);
    expect(choosePerk(s, "blood")).toBe(false);
    expect(castSkill(s)).toEqual([]);
    advance(s, 5);
    expect(s).toEqual(frozen);
    expect(choosePerk(s, "edge")).toBe(true);
    expect(rank(s, "edge")).toBe(1);
    expect(choosePerk(s, "edge")).toBe(false);
  });
  it("activates the selected skill against the right row and respects its real cooldown", () => {
    const s = initialState();
    s.meta.unlockedChapter = 2;
    equip(s, "skill", "volley");
    const b = battle(s);
    enemyAt(b, 1).pendingHit = { remaining: 0.1, damage: 3, critical: false };
    const events = castSkill(s);
    expect(events).toContainEqual({ type: "skill", skill: "volley" });
    expect(enemyAt(b, 0).hp).toBe(enemyAt(b, 0).maxHp);
    expect(enemyAt(b, 1).hp).toBe(0);
    expect(enemyAt(b, 1).pendingHit).toBeNull();
    expect(s.run.skillCooldown).toBe(10);
    expect(castSkill(s)).toEqual([]);
    advance(s, 0.5);
    expect(s.run.skillCooldown).toBeCloseTo(9.5);
  });
  it("Aegis absorbs incoming damage and cancels existing windups", () => {
    const s = initialState();
    s.meta.unlockedChapter = 3;
    equip(s, "skill", "aegis");
    const b = battle(s);
    for (const e of b.enemies)
      e.pendingHit = { remaining: 0.01, damage: e.damage, critical: false };
    castSkill(s);
    expect(s.run.shield).toBe(54);
    expect(b.enemies.every((e) => e.pendingHit === null)).toBe(true);
    const front = enemyAt(b, 0);
    front.pendingHit = { remaining: 0.01, damage: 10, critical: false };
    stepGame(s, 0.02);
    expect(s.run.hp).toBe(180);
    expect(s.run.shield).toBe(44);
    expect(validState(s)).toBe(true);
  });
  it("camp loadouts require earned chapters and change exact combat stats", () => {
    const s = initialState();
    expect(equip(s, "companion", "bram")).toBe(false);
    expect(equip(s, "pet", "hound")).toBe(false);
    s.meta.unlockedChapter = 3;
    expect(equip(s, "companion", "bram")).toBe(true);
    equip(s, "pet", "hound");
    equip(s, "armor", "plate");
    equip(s, "weapon", "greatsword");
    expect(heroStats(s)).toMatchObject({ hp: 220, armor: 5, cleave: 0.25 });
    expect(heroStats(s).damage).toBeCloseTo(29.9);
    startRun(s);
    expect(equip(s, "pet", "fox")).toBe(false);
    expect(s.run.hp).toBe(220);
    expect([COMPANIONS, PETS, ARMORS, WEAPONS, SKILLS].every((items) => items.length === 3)).toBe(
      true,
    );
  });
  it("the owl interrupts rear enemies and Sable damages the whole formation", () => {
    const s = initialState();
    s.meta.unlockedChapter = 3;
    equip(s, "pet", "owl");
    equip(s, "companion", "sable");
    const b = battle(s);
    const rear = enemyAt(b, 1);
    rear.pendingHit = { remaining: 0.02, damage: rear.damage, critical: false };
    b.petHit = { remaining: 0.01, damage: 1, critical: false, target: rear.id, projectile: false };
    b.companionHit = {
      remaining: 0.01,
      damage: 2,
      critical: false,
      target: "enemy-0",
      projectile: true,
    };
    const events = stepGame(s, 0.02);
    expect(rear.pendingHit).toBeNull();
    expect(events.filter((e) => e.type === "hit" && e.actor === "companion")).toHaveLength(2);
    expect(s.run.hp).toBe(180);
  });
  it("retains earned gold and forge upgrades after a defeat and retry", () => {
    const s = initialState();
    s.meta.gold = 60;
    s.meta.earnedGold = 60;
    expect(buyUpgrade(s, "blade")).toBe(true);
    const kept = structuredClone(s.meta);
    const b = battle(s);
    s.run.hp = 1;
    enemyAt(b, 0).pendingHit = { remaining: 0.01, damage: 10, critical: false };
    stepGame(s, 0.02);
    expect(s.phase.kind).toBe("defeat");
    expect(s.meta.gold).toBe(kept.gold);
    expect(s.meta.upgrades).toEqual(kept.upgrades);
    expect(s.meta.defeats).toBe(1);
    advance(s, 1);
    expect(s.meta.defeats).toBe(1);
    startRun(s);
    expect(s.meta.loadout).toEqual(kept.loadout);
  });
  it("retreats to camp without losing earned gold or awarding unfinished waves", () => {
    const s = initialState();
    s.meta.gold = 80;
    s.meta.earnedGold = 100;
    buyUpgrade(s, "blade");
    battle(s);
    s.run.perks = { cleave: 1 };
    s.run.cleared = 3;
    const meta = structuredClone(s.meta);
    expect(retreatToCamp(s)).toBe(true);
    expect(s.meta).toEqual(meta);
    expect(s.run.perks).toEqual({});
    expect(s.run.cleared).toBe(0);
    expect(s.run.hp).toBe(heroStats(s).hp);
    expect(s.phase.kind).toBe("camp");
    expect(validState(s)).toBe(true);
    expect(retreatToCamp(s)).toBe(false);
  });
  it("completes the first chapter with ordinary earned choices and actual skills", () => {
    for (const seed of [1, 42, 927113]) {
      const s = initialState(seed);
      startRun(s);
      completeRun(s);
      expect(s.phase.kind).toBe("victory");
      expect(s.run.cleared).toBe(ENCOUNTERS_PER_CHAPTER);
      expect(s.meta.unlockedChapter).toBe(2);
      expect(Object.keys(s.run.perks).length).toBeGreaterThan(1);
    }
  });
  it("reaches all five chapters through earned equipment and choices in a bounded campaign", () => {
    const s = initialState();
    let runs = 0;
    while (runs++ < 15) {
      for (const id of ["mail", "blade", "charm"] as const) while (buyUpgrade(s, id)) {}
      startRun(s, s.meta.unlockedChapter);
      completeRun(s);
      if (s.phase.kind === "victory" && s.run.chapter === 5) break;
      returnToCamp(s);
    }
    expect(s.phase.kind).toBe("victory");
    expect(s.run.chapter).toBe(5);
    expect(runs).toBeLessThanOrEqual(15);
  });
  it("resumes a multi-enemy battle and pending arrows deterministically", () => {
    const original = initialState();
    startRun(original);
    advance(original, 2);
    expect(validState(original)).toBe(true);
    const restored: unknown = JSON.parse(JSON.stringify(original));
    if (!validState(restored)) throw Error("Loadable battle required");
    for (let i = 0; i < 500; i++) {
      expect(stepGame(restored, 1 / 60)).toEqual(stepGame(original, 1 / 60));
      expect(restored).toEqual(original);
    }
  });
  it.each([
    "camp",
    "choice",
    "battle",
  ] as const)("migrates version-one %s without losing earned progress or pending strikes", (phase) => {
    const old = legacy(phase);
    old.meta.gold = 35;
    old.meta.earnedGold = 100;
    old.meta.upgrades.blade = 2;
    old.run.perks = { heart: 1, blood: 1 };
    old.run.hp = 175;
    old.run.cleared = 3;
    if (old.phase.kind === "battle" && "enemy" in old.phase) {
      old.phase.enemy = encounter(1, 3);
      old.phase.enemy.hp = 13.5;
      old.phase.enemyHit = { remaining: 0.2, damage: old.phase.enemy.damage, critical: false };
    }
    expect(validLegacyState(old)).toBe(true);
    const next = migrateV1State(old);
    expect(validState(next)).toBe(true);
    expect(next.meta.gold).toBe(35);
    expect(next.meta.earnedGold).toBe(100);
    expect(next.meta.upgrades).toEqual(old.meta.upgrades);
    expect(next.run.hp).toBe(175);
    expect(next.run.perks).toEqual(old.run.perks);
    expect(next.run.cleared).toBe(3);
    if (next.phase.kind === "battle") {
      expect(next.phase.formation).toBe("legacy");
      expect(next.phase.enemies[0]!.hp).toBe(13.5);
      expect(next.phase.heroHit).toMatchObject({ remaining: 0.12, damage: 24, target: "enemy-0" });
      expect(next.phase.enemies[0]!.pendingHit).toMatchObject({ remaining: 0.2 });
      next.phase.heroHit = {
        remaining: 0.01,
        damage: 100,
        critical: false,
        target: "enemy-0",
        projectile: false,
      };
      stepGame(next, 0.02);
      expect(next.run.cleared).toBe(4);
      skipPerk(next);
      advance(next, 1.5);
      if (next.phase.kind !== "battle") throw Error("Expected next wave");
      expect(next.phase.formation).toBe("squad");
      expect(next.phase.enemies.length).toBe(3);
    }
    if (phase === "choice") expect(next.phase).toEqual(old.phase);
  });
  it("retains living enemies with fractional health without an arbitrary health cutoff", () => {
    const s = initialState();
    const b = battle(s);
    enemyAt(b, 0).hp = 0;
    enemyAt(b, 1).hp = 1e-12;
    expect(validState(s)).toBe(true);
    enemyAt(b, 1).hp = 0;
    expect(validState(s)).toBe(false);
  });
  it("protects malformed old saves and rejects impossible new loadouts, rosters and projectiles", () => {
    const old = legacy("battle");
    if (old.phase.kind === "battle" && "enemy" in old.phase) old.phase.enemy.damage = 999;
    expect(validLegacyState(old)).toBe(false);
    expect(() => migrateV1State(old)).toThrow();
    const s = initialState();
    expect(validState(s)).toBe(true);
    for (const invalid of [
      { ...s, meta: { ...s.meta, loadout: { ...s.meta.loadout, pet: "dragon" } } },
      { ...s, meta: { ...s.meta, loadout: { ...s.meta.loadout, pet: "owl" } } },
      { ...s, run: { ...s.run, skillCooldown: Infinity } },
      { ...s, run: { ...s.run, hp: 9999 } },
      { ...s, run: { ...s.run, perks: { chain: 99 } } },
    ])
      expect(validState(invalid)).toBe(false);
    const b = battle(s);
    expect(validState(s)).toBe(true);
    enemyAt(b, 1).slot = 0;
    expect(validState(s)).toBe(false);
    enemyAt(b, 1).slot = 1;
    enemyAt(b, 1).pendingHit = { remaining: 0.5, damage: 999, critical: false };
    expect(validState(s)).toBe(false);
    enemyAt(b, 1).pendingHit = null;
    b.heroHit = {
      remaining: 0.1,
      damage: 5,
      critical: false,
      target: "enemy-99",
      projectile: false,
    };
    expect(validState(s)).toBe(false);
    expect(livingEnemies(b)).toHaveLength(2);
  });
  it("does not teleport a queued Mira arrow to another enemy after its target dies", () => {
    const state = initialState();
    const phase = battle(state);
    const front = enemyAt(phase, 0);
    const rear = enemyAt(phase, 1);
    const before = front.hp;
    rear.hp = 0;
    phase.companionHit = {
      remaining: 0.01,
      damage: 50,
      critical: false,
      target: rear.id,
      projectile: true,
    };
    const events = stepGame(state, 0.02);
    expect(front.hp).toBe(before);
    expect(events.filter((event) => event.type === "hit" && event.actor === "companion")).toEqual(
      [],
    );
    expect(phase.companionHit).toBeNull();
  });
});
