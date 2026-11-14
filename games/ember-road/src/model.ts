export type PerkId =
  | "edge"
  | "tempo"
  | "blood"
  | "heart"
  | "bastion"
  | "storm"
  | "thorns"
  | "renewal"
  | "execution";
export type UpgradeId = "blade" | "mail" | "charm";
export type EnemyKind = "raider" | "sentinel" | "hexer" | "warden";

export interface Perk {
  id: PerkId;
  title: string;
  caption: string;
  description: string;
  family: "steel" | "ember" | "vitality";
  max: number;
}

export const PERKS: readonly Perk[] = [
  {
    id: "edge",
    title: "Honed edge",
    caption: "STEEL / DAMAGE",
    description: "+25% sword damage. Every ordinary strike hits harder.",
    family: "steel",
    max: 3,
  },
  {
    id: "tempo",
    title: "Quick hands",
    caption: "STEEL / SPEED",
    description: "Attack 18% faster. More strikes, more chances to trigger your build.",
    family: "steel",
    max: 3,
  },
  {
    id: "blood",
    title: "Blood oath",
    caption: "VITALITY / LIFESTEAL",
    description: "Restore health equal to 10% of damage dealt.",
    family: "vitality",
    max: 3,
  },
  {
    id: "heart",
    title: "Stout heart",
    caption: "VITALITY / HEALTH",
    description: "+35 maximum health. Restore 35 health immediately.",
    family: "vitality",
    max: 3,
  },
  {
    id: "bastion",
    title: "Iron resolve",
    caption: "STEEL / ARMOR",
    description: "Reduce every incoming hit by 3 damage, to a minimum of 1.",
    family: "steel",
    max: 3,
  },
  {
    id: "storm",
    title: "Stormbound",
    caption: "EMBER / EVERY THIRD HIT",
    description: "Every third sword strike calls lightning for 18 extra damage.",
    family: "ember",
    max: 3,
  },
  {
    id: "thorns",
    title: "Briar mail",
    caption: "EMBER / RETALIATION",
    description: "Return 5 damage whenever an enemy hits you.",
    family: "ember",
    max: 3,
  },
  {
    id: "renewal",
    title: "Quiet renewal",
    caption: "VITALITY / ON VICTORY",
    description: "Recover 8% of maximum health after every enemy defeated.",
    family: "vitality",
    max: 3,
  },
  {
    id: "execution",
    title: "Last word",
    caption: "STEEL / FINISHER",
    description: "+40% sword damage against enemies below half health.",
    family: "steel",
    max: 3,
  },
];

export const CHAPTERS = [
  {
    name: "The Cinder March",
    place: "Ashen Verge",
    description: "A lantern still burns beyond the old watchtower.",
    boss: "The Thorn Warden",
  },
  {
    name: "Beneath the Bell",
    place: "Lantern Ruins",
    description: "Follow the tolling through the ruined monastery.",
    boss: "The Bellkeeper",
  },
  {
    name: "The Sinking Road",
    place: "Hollow Marsh",
    description: "The causeway remembers everyone who crossed it.",
    boss: "The Mire King",
  },
  {
    name: "Winter’s Debt",
    place: "Frostbound Keep",
    description: "Find the fire that the cold could never take.",
    boss: "The Iron Regent",
  },
  {
    name: "A Crown of Cinders",
    place: "The Last Threshold",
    description: "One final oath. One road back to the light.",
    boss: "The Crownless",
  },
] as const;

export const ENCOUNTERS_PER_CHAPTER = 12;
export const UPGRADE_CAP = 8;

export interface Enemy {
  kind: EnemyKind;
  name: string;
  hp: number;
  maxHp: number;
  damage: number;
  interval: number;
  armor: number;
  gold: number;
}

export interface PendingHit {
  remaining: number;
  damage: number;
  critical: boolean;
}

export type Phase =
  | { kind: "camp" }
  | { kind: "travel"; remaining: number }
  | {
      kind: "battle";
      enemy: Enemy;
      heroCooldown: number;
      enemyCooldown: number;
      heroHit: PendingHit | null;
      enemyHit: PendingHit | null;
    }
  | { kind: "choice"; options: PerkId[] }
  | { kind: "defeat"; enemy: string }
  | { kind: "victory"; reward: number };

export interface GameState {
  meta: {
    gold: number;
    earnedGold: number;
    unlockedChapter: number;
    victories: number;
    defeats: number;
    upgrades: Record<UpgradeId, number>;
  };
  run: {
    chapter: number;
    cleared: number;
    hp: number;
    xp: number;
    level: number;
    strikes: number;
    seed: number;
    time: number;
    distance: number;
    perks: Partial<Record<PerkId, number>>;
  };
  phase: Phase;
}

export interface HeroStats {
  hp: number;
  damage: number;
  interval: number;
  armor: number;
  crit: number;
  lifesteal: number;
}

export type GameEvent =
  | { type: "swing"; side: "hero" | "enemy" }
  | { type: "hit"; side: "hero" | "enemy"; damage: number; critical: boolean; lightning?: boolean }
  | { type: "heal"; amount: number }
  | { type: "kill"; gold: number }
  | { type: "level"; level: number }
  | { type: "defeat" }
  | { type: "victory"; gold: number };

export function initialState(seed = 927113): GameState {
  return {
    meta: {
      gold: 0,
      earnedGold: 0,
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
      seed: seed >>> 0 || 1,
      time: 0,
      distance: 0,
      perks: {},
    },
    phase: { kind: "camp" },
  };
}

export function rank(state: GameState, id: PerkId): number {
  return state.run.perks[id] ?? 0;
}

export function heroStats(state: GameState): HeroStats {
  return {
    hp: 180 + state.meta.upgrades.mail * 25 + rank(state, "heart") * 35,
    damage: (23 + state.meta.upgrades.blade * 4) * (1 + rank(state, "edge") * 0.25),
    interval: 0.95 / (1 + rank(state, "tempo") * 0.18),
    armor: state.meta.upgrades.mail + rank(state, "bastion") * 3,
    crit: Math.min(0.5, 0.12 + state.meta.upgrades.charm * 0.025),
    lifesteal: rank(state, "blood") * 0.1,
  };
}

function random(state: GameState) {
  let x = state.run.seed;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.run.seed = x >>> 0 || 1;
  return state.run.seed / 4294967296;
}

export function xpNeeded(state: GameState) {
  return 3 + state.run.level;
}

export function upgradeCost(state: GameState, id: UpgradeId) {
  return Math.round({ blade: 24, mail: 22, charm: 30 }[id] * 1.65 ** state.meta.upgrades[id]);
}

export function buyUpgrade(state: GameState, id: UpgradeId): boolean {
  if (state.phase.kind !== "camp" || state.meta.upgrades[id] >= UPGRADE_CAP) return false;
  const cost = upgradeCost(state, id);
  if (state.meta.gold < cost) return false;
  state.meta.gold -= cost;
  state.meta.upgrades[id]++;
  state.run.hp = heroStats(state).hp;
  return true;
}

export function startRun(state: GameState, chapter = state.meta.unlockedChapter): boolean {
  if (!["camp", "victory", "defeat"].includes(state.phase.kind)) return false;
  if (
    !Number.isInteger(chapter) ||
    chapter < 1 ||
    chapter > Math.min(CHAPTERS.length, state.meta.unlockedChapter)
  )
    return false;
  const seed = state.run.seed;
  state.run = {
    chapter,
    cleared: 0,
    hp: 180,
    xp: 0,
    level: 1,
    strikes: 0,
    seed,
    time: 0,
    distance: 0,
    perks: {},
  };
  state.run.hp = heroStats(state).hp;
  state.phase = { kind: "travel", remaining: 1.25 };
  return true;
}

export function returnToCamp(state: GameState): boolean {
  if (!["victory", "defeat"].includes(state.phase.kind)) return false;
  if (state.phase.kind === "victory")
    state.run.chapter = Math.min(state.meta.unlockedChapter, state.run.chapter + 1);
  state.phase = { kind: "camp" };
  state.run.perks = {};
  state.run.hp = heroStats(state).hp;
  return true;
}

export function encounter(chapter: number, cleared: number): Enemy {
  const boss = cleared === ENCOUNTERS_PER_CHAPTER - 1;
  const kind: EnemyKind = boss
    ? "warden"
    : (["raider", "sentinel", "raider", "hexer"][cleared % 4] as EnemyKind);
  const factor = 1 + (chapter - 1) * 0.34;
  const hp = Math.round((boss ? 190 : 42 + cleared * 5) * factor);
  return {
    kind,
    name: boss
      ? (CHAPTERS[chapter - 1]?.boss ?? "The Crownless")
      : {
          raider: "Briar raider",
          sentinel: "Hollow sentinel",
          hexer: "Cinder wisp",
          warden: "The Thorn Warden",
        }[kind],
    hp,
    maxHp: hp,
    damage: Math.round((boss ? 22 : kind === "hexer" ? 13 : 6 + cleared * 0.75) * factor),
    interval: boss ? 1.6 : kind === "hexer" ? 1.9 : kind === "raider" ? 1.45 : 1.7,
    armor: kind === "sentinel" || boss ? 2 + chapter : 0,
    gold: boss ? 30 + chapter * 8 : 5 + Math.floor(cleared / 3) + chapter,
  };
}

export function choosePerk(state: GameState, id: PerkId): boolean {
  if (state.phase.kind !== "choice" || !state.phase.options.includes(id)) return false;
  const perk = PERKS.find((p) => p.id === id);
  if (!perk || rank(state, id) >= perk.max) return false;
  state.run.perks[id] = rank(state, id) + 1;
  if (id === "heart") state.run.hp = Math.min(heroStats(state).hp, state.run.hp + 35);
  state.phase = { kind: "travel", remaining: 0.9 };
  return true;
}

function offeredPerks(state: GameState): PerkId[] {
  const pool = PERKS.filter((p) => rank(state, p.id) < p.max).map((p) => p.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random(state) * (i + 1));
    const a = pool[i];
    const b = pool[j];
    if (a && b) {
      pool[i] = b;
      pool[j] = a;
    }
  }
  return pool.slice(0, 3);
}

function awardGold(state: GameState, amount: number) {
  state.meta.gold += amount;
  state.meta.earnedGold += amount;
}

function heal(state: GameState, amount: number, events: GameEvent[]) {
  const actual = Math.min(amount, heroStats(state).hp - state.run.hp);
  if (actual <= 0) return;
  state.run.hp += actual;
  events.push({ type: "heal", amount: actual });
}

function defeatEnemy(state: GameState, enemy: Enemy, events: GameEvent[]) {
  awardGold(state, enemy.gold);
  state.run.cleared++;
  state.run.xp += 2;
  events.push({ type: "kill", gold: enemy.gold });
  heal(state, heroStats(state).hp * 0.08 * rank(state, "renewal"), events);
  if (state.run.cleared >= ENCOUNTERS_PER_CHAPTER) {
    const reward = 35 + state.run.chapter * 15;
    awardGold(state, reward);
    state.meta.victories++;
    state.meta.unlockedChapter = Math.max(
      state.meta.unlockedChapter,
      Math.min(CHAPTERS.length, state.run.chapter + 1),
    );
    state.phase = { kind: "victory", reward };
    events.push({ type: "victory", gold: reward });
  } else if (state.run.xp >= xpNeeded(state)) {
    state.run.xp -= xpNeeded(state);
    state.run.level++;
    const options = offeredPerks(state);
    state.phase = options.length ? { kind: "choice", options } : { kind: "travel", remaining: 0.9 };
    events.push({ type: "level", level: state.run.level });
  } else {
    state.phase = { kind: "travel", remaining: 1.05 };
  }
}

export function stepGame(state: GameState, dt: number): GameEvent[] {
  const events: GameEvent[] = [];
  if (!Number.isFinite(dt) || dt <= 0 || dt > 0.25) return events;
  if (state.phase.kind !== "travel" && state.phase.kind !== "battle") return events;
  state.run.time += dt;
  if (state.phase.kind === "travel") {
    state.run.distance += dt;
    state.phase.remaining -= dt;
    if (state.phase.remaining <= 0)
      state.phase = {
        kind: "battle",
        enemy: encounter(state.run.chapter, state.run.cleared),
        heroCooldown: 0.22,
        enemyCooldown: 1.1,
        heroHit: null,
        enemyHit: null,
      };
    return events;
  }
  const battle = state.phase;
  const stats = heroStats(state);
  battle.heroCooldown -= dt;
  battle.enemyCooldown -= dt;
  if (battle.heroHit) {
    battle.heroHit.remaining -= dt;
    if (battle.heroHit.remaining <= 0) {
      const hit = battle.heroHit;
      battle.heroHit = null;
      state.run.strikes++;
      const lightning = rank(state, "storm") > 0 && state.run.strikes % 3 === 0;
      const extra = lightning ? 18 * rank(state, "storm") : 0;
      const damage = Math.max(1, hit.damage - battle.enemy.armor) + extra;
      const actual = Math.min(battle.enemy.hp, damage);
      battle.enemy.hp = Math.max(0, battle.enemy.hp - damage);
      events.push({ type: "hit", side: "enemy", damage, critical: hit.critical, lightning });
      heal(state, actual * stats.lifesteal, events);
      if (battle.enemy.hp <= 0) {
        defeatEnemy(state, battle.enemy, events);
        return events;
      }
    }
  }
  if (battle.enemyHit) {
    battle.enemyHit.remaining -= dt;
    if (battle.enemyHit.remaining <= 0) {
      const damage = Math.max(1, battle.enemyHit.damage - stats.armor);
      battle.enemyHit = null;
      state.run.hp = Math.max(0, state.run.hp - damage);
      events.push({ type: "hit", side: "hero", damage, critical: false });
      if (state.run.hp <= 0) {
        state.meta.defeats++;
        state.phase = { kind: "defeat", enemy: battle.enemy.name };
        events.push({ type: "defeat" });
        return events;
      }
      const thornDamage = rank(state, "thorns") * 5;
      if (thornDamage > 0) {
        battle.enemy.hp = Math.max(0, battle.enemy.hp - thornDamage);
        events.push({ type: "hit", side: "enemy", damage: thornDamage, critical: false });
        if (battle.enemy.hp <= 0) {
          defeatEnemy(state, battle.enemy, events);
          return events;
        }
      }
    }
  }
  if (battle.heroCooldown <= 0 && !battle.heroHit) {
    const critical = random(state) < stats.crit;
    const execution =
      battle.enemy.hp < battle.enemy.maxHp / 2 ? 1 + rank(state, "execution") * 0.4 : 1;
    battle.heroHit = {
      remaining: 0.22,
      damage: stats.damage * (critical ? 1.8 : 1) * execution,
      critical,
    };
    battle.heroCooldown = stats.interval;
    events.push({ type: "swing", side: "hero" });
  }
  if (battle.enemyCooldown <= 0 && !battle.enemyHit) {
    battle.enemyHit = { remaining: 0.29, damage: battle.enemy.damage, critical: false };
    battle.enemyCooldown = battle.enemy.interval;
    events.push({ type: "swing", side: "enemy" });
  }
  return events;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function number(value: unknown, min: number, max: number, integer = false): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max &&
    (!integer || Number.isInteger(value))
  );
}

export function validState(value: unknown): value is GameState {
  if (!record(value) || !record(value.meta) || !record(value.run) || !record(value.phase))
    return false;
  const m = value.meta;
  const r = value.run;
  const p = value.phase;
  if (!record(m.upgrades) || !record(r.perks)) return false;
  if (
    !["blade", "mail", "charm"].every((k) =>
      number((m.upgrades as Record<string, unknown>)[k], 0, UPGRADE_CAP, true),
    )
  )
    return false;
  if (
    !number(m.gold, 0, 1e12) ||
    !number(m.earnedGold, m.gold, 1e12) ||
    !number(m.unlockedChapter, 1, CHAPTERS.length, true) ||
    !number(m.victories, 0, 1e9, true) ||
    !number(m.defeats, 0, 1e9, true)
  )
    return false;
  if (
    !number(r.chapter, 1, m.unlockedChapter, true) ||
    !number(r.cleared, 0, ENCOUNTERS_PER_CHAPTER, true) ||
    !number(r.hp, 0, 10000) ||
    !number(r.xp, 0, 100, true) ||
    !number(r.level, 1, 100, true) ||
    !number(r.strikes, 0, 1e9, true) ||
    !number(r.seed, 1, 4294967295, true) ||
    !number(r.time, 0, 1e9) ||
    !number(r.distance, 0, 1e9)
  )
    return false;
  if (
    !Object.entries(r.perks).every(([id, count]) =>
      PERKS.some((perk) => perk.id === id && number(count, 1, perk.max, true)),
    )
  )
    return false;
  const maxHp =
    180 + (m.upgrades.mail as number) * 25 + ((r.perks.heart as number | undefined) ?? 0) * 35;
  if (r.hp > maxHp) return false;
  if (p.kind === "camp") return true;
  if (p.kind === "travel")
    return r.hp > 0 && r.cleared < ENCOUNTERS_PER_CHAPTER && number(p.remaining, -0.25, 2);
  if (p.kind === "choice")
    return (
      r.hp > 0 &&
      r.cleared < ENCOUNTERS_PER_CHAPTER &&
      Array.isArray(p.options) &&
      p.options.length === 3 &&
      new Set(p.options).size === 3 &&
      p.options.every((id) =>
        PERKS.some(
          (perk) => perk.id === id && ((r.perks as Record<string, number>)[id] ?? 0) < perk.max,
        ),
      )
    );
  if (p.kind === "defeat")
    return (
      r.hp === 0 &&
      r.cleared < ENCOUNTERS_PER_CHAPTER &&
      p.enemy === encounter(r.chapter, r.cleared).name
    );
  if (p.kind === "victory")
    return r.cleared === ENCOUNTERS_PER_CHAPTER && r.hp > 0 && p.reward === 35 + r.chapter * 15;
  if (p.kind !== "battle" || r.hp <= 0 || r.cleared >= ENCOUNTERS_PER_CHAPTER || !record(p.enemy))
    return false;
  const e = p.enemy;
  const expected = encounter(r.chapter, r.cleared);
  if (
    e.kind !== expected.kind ||
    e.name !== expected.name ||
    e.maxHp !== expected.maxHp ||
    e.damage !== expected.damage ||
    e.interval !== expected.interval ||
    e.armor !== expected.armor ||
    e.gold !== expected.gold ||
    !number(e.hp, 0, expected.maxHp) ||
    e.hp === 0
  )
    return false;
  if (!number(p.heroCooldown, -0.25, 5) || !number(p.enemyCooldown, -0.25, 5)) return false;
  const pending = (v: unknown) =>
    v === null ||
    (record(v) &&
      number(v.remaining, -0.25, 0.4) &&
      number(v.damage, 0, 10000) &&
      typeof v.critical === "boolean");
  return pending(p.heroHit) && pending(p.enemyHit);
}
