import { initialQuests, type QuestLedger, validQuestLedger } from "./quests";

export type PerkId =
  | "edge"
  | "tempo"
  | "blood"
  | "heart"
  | "bastion"
  | "storm"
  | "thorns"
  | "renewal"
  | "execution"
  | "cleave"
  | "pierce"
  | "interrupt"
  | "ward"
  | "chain";
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type UpgradeId = "blade" | "mail" | "charm";
export type EnemyKind = "raider" | "sentinel" | "hexer" | "warden" | "archer";
export type CompanionId = "mira" | "bram" | "sable";
export type PetId = "fox" | "hound" | "owl";
export type WeaponId = "sword" | "greatsword" | "spear";
export type ArmorId = "mail" | "plate" | "cloak";
export type SkillId = "whirlwind" | "volley" | "aegis";
export type ActorId = "hero" | "companion" | "pet" | `enemy-${number}`;
export interface Perk {
  id: PerkId;
  title: string;
  caption: string;
  description: string;
  family: "steel" | "ember" | "vitality";
  rarity: Rarity;
  max: number;
}
export const PERKS: readonly Perk[] = [
  {
    id: "edge",
    title: "Honed edge",
    caption: "STEEL / DAMAGE",
    description: "+25% sword damage. Every ordinary strike hits harder.",
    family: "steel",
    rarity: "common",
    max: 3,
  },
  {
    id: "tempo",
    title: "Quick hands",
    caption: "STEEL / SPEED",
    description: "Attack 18% faster. More strikes, more chances to trigger your build.",
    family: "steel",
    rarity: "common",
    max: 3,
  },
  {
    id: "blood",
    title: "Blood oath",
    caption: "VITALITY / LIFESTEAL",
    description: "Restore health equal to 10% of Rook’s damage dealt.",
    family: "vitality",
    rarity: "rare",
    max: 3,
  },
  {
    id: "heart",
    title: "Stout heart",
    caption: "VITALITY / HEALTH",
    description: "+35 maximum health. Restore 35 health immediately.",
    family: "vitality",
    rarity: "common",
    max: 3,
  },
  {
    id: "bastion",
    title: "Iron resolve",
    caption: "STEEL / ARMOR",
    description: "Reduce every incoming hit by 3 damage, to a minimum of 1.",
    family: "steel",
    rarity: "rare",
    max: 3,
  },
  {
    id: "storm",
    title: "Stormbound",
    caption: "EMBER / EVERY THIRD HIT",
    description: "Every third sword strike calls lightning for 18 extra damage per rank.",
    family: "ember",
    rarity: "epic",
    max: 3,
  },
  {
    id: "thorns",
    title: "Briar mail",
    caption: "EMBER / RETALIATION",
    description: "Return 5 damage per rank to the enemy that hits you.",
    family: "ember",
    rarity: "rare",
    max: 3,
  },
  {
    id: "renewal",
    title: "Quiet renewal",
    caption: "VITALITY / ON VICTORY",
    description: "Recover 8% of maximum health per rank after each defeated wave.",
    family: "vitality",
    rarity: "rare",
    max: 3,
  },
  {
    id: "execution",
    title: "Last word",
    caption: "STEEL / FINISHER",
    description: "+40% damage per rank against enemies below half health.",
    family: "steel",
    rarity: "common",
    max: 3,
  },
  {
    id: "cleave",
    title: "Sweeping oath",
    caption: "STEEL / FRONT LINE",
    description: "Sword strikes also hit the other front-line enemies for 45% damage per rank.",
    family: "steel",
    rarity: "epic",
    max: 2,
  },
  {
    id: "pierce",
    title: "Through the ranks",
    caption: "STEEL / BACK LINE",
    description: "Each sword strike pierces one rear enemy for 40% damage per rank.",
    family: "steel",
    rarity: "epic",
    max: 2,
  },
  {
    id: "interrupt",
    title: "Thunderclap",
    caption: "EMBER / INTERRUPT",
    description:
      "Every third strike cancels all enemy windups and arrows, delaying their next attack by 1.2 seconds per rank.",
    family: "ember",
    rarity: "legendary",
    max: 2,
  },
  {
    id: "ward",
    title: "Windward veil",
    caption: "VITALITY / ARROW WARD",
    description: "Take 35% less ranged damage per rank, capped at 70%, before armor.",
    family: "vitality",
    rarity: "rare",
    max: 2,
  },
  {
    id: "chain",
    title: "Storm’s covenant",
    caption: "EMBER / CHAIN LIGHTNING",
    description:
      "Every third strike sends 14 lightning damage per rank through every other living enemy.",
    family: "ember",
    rarity: "legendary",
    max: 2,
  },
];
interface Unlock {
  id: string;
  name: string;
  description: string;
  chapter: number;
}
export const COMPANIONS = [
  {
    id: "mira",
    name: "Mira",
    role: "Ranger",
    description: "Fires an arrow at the rear line every 1.8 seconds.",
    chapter: 1,
    damage: 8,
    interval: 1.8,
  },
  {
    id: "bram",
    name: "Bram",
    role: "Guardian",
    description: "Strikes the front line and grants 2 armor.",
    chapter: 2,
    damage: 12,
    interval: 2.1,
  },
  {
    id: "sable",
    name: "Sable",
    role: "Stormcaller",
    description: "Her ember bolts hit every living enemy.",
    chapter: 3,
    damage: 6,
    interval: 2.4,
  },
] as const;
export const PETS = [
  {
    id: "fox",
    name: "Cinder",
    kind: "Ember fox",
    description: "Bites the weakest enemy every 2 seconds.",
    chapter: 1,
    damage: 5,
    interval: 2,
  },
  {
    id: "hound",
    name: "Briar",
    kind: "Hound",
    description: "Bites the front line and grants 20 maximum health.",
    chapter: 2,
    damage: 9,
    interval: 2.4,
  },
  {
    id: "owl",
    name: "Pip",
    kind: "Dusk owl",
    description: "Dives at archers and cancels their pending shots.",
    chapter: 3,
    damage: 7,
    interval: 2.7,
  },
] as const;
export const WEAPONS = [
  {
    id: "sword",
    name: "Wayfarer’s blade",
    description: "Balanced strikes, 0.95-second base interval.",
    chapter: 1,
  },
  {
    id: "greatsword",
    name: "Gatebreaker",
    description: "+30% damage, 20% slower. Hits a second front enemy for 25% damage.",
    chapter: 2,
  },
  {
    id: "spear",
    name: "Watchkeeper’s spear",
    description: "10% faster. Pierces a rear enemy for 20% damage.",
    chapter: 3,
  },
] as const;
export const ARMORS = [
  {
    id: "mail",
    name: "Weathered mail",
    description: "Balanced protection, no speed penalty.",
    chapter: 1,
  },
  {
    id: "plate",
    name: "Lantern plate",
    description: "+3 armor, +20 health, 10% slower attacks.",
    chapter: 2,
  },
  {
    id: "cloak",
    name: "Windrunner’s cloak",
    description: "20% ranged resistance and 10% faster attacks.",
    chapter: 3,
  },
] as const;
export const SKILLS = [
  {
    id: "whirlwind",
    name: "Whirlwind",
    description:
      "Deal 135% sword damage to every front-line enemy. If none remain, hit the rear line.",
    chapter: 1,
    cooldown: 8,
  },
  {
    id: "volley",
    name: "Piercing volley",
    description:
      "Deal 175% sword damage to each rear enemy and cancel their pending attacks. Hits all enemies if there is no rear line.",
    chapter: 2,
    cooldown: 10,
  },
  {
    id: "aegis",
    name: "Aegis",
    description: "Gain a shield equal to 30% maximum health and cancel all incoming attacks.",
    chapter: 3,
    cooldown: 12,
  },
] as const;
export interface Loadout {
  companion: CompanionId;
  pet: PetId;
  weapon: WeaponId;
  armor: ArmorId;
  skill: SkillId;
}

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
export interface TargetHit extends PendingHit {
  target: ActorId;
  projectile: boolean;
}
export interface EnemyFighter extends Enemy {
  id: `enemy-${number}`;
  slot: number;
  row: "front" | "back";
  cooldown: number;
  pendingHit: PendingHit | null;
}
export interface BattlePhase {
  kind: "battle";
  formation: "legacy" | "squad";
  enemies: EnemyFighter[];
  heroCooldown: number;
  companionCooldown: number;
  petCooldown: number;
  heroHit: TargetHit | null;
  companionHit: TargetHit | null;
  petHit: TargetHit | null;
}
export type Phase =
  | { kind: "camp" }
  | { kind: "travel"; remaining: number }
  | BattlePhase
  | { kind: "choice"; options: PerkId[] }
  | { kind: "defeat"; enemy: string }
  | { kind: "victory"; reward: number };
export interface GameState {
  quests: QuestLedger;
  meta: {
    gold: number;
    earnedGold: number;
    unlockedChapter: number;
    victories: number;
    defeats: number;
    upgrades: Record<UpgradeId, number>;
    loadout: Loadout;
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
    skillCooldown: number;
    shield: number;
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
  rangedResistance: number;
  companionDamage: number;
  companionInterval: number;
  petDamage: number;
  petInterval: number;
  cleave: number;
  pierce: number;
}
export type GameEvent =
  | { type: "swing"; side: "hero" | "enemy"; actor: ActorId; target: ActorId; projectile: boolean }
  | {
      type: "hit";
      side: "hero" | "enemy";
      actor: ActorId;
      target: ActorId;
      damage: number;
      critical: boolean;
      lightning?: boolean;
    }
  | { type: "heal"; amount: number }
  | { type: "kill"; gold: number; target: ActorId }
  | { type: "level"; level: number }
  | { type: "defeat" }
  | { type: "victory"; gold: number }
  | { type: "skill"; skill: SkillId }
  | { type: "interrupt"; actor: ActorId; target: ActorId }
  | { type: "shield"; amount: number };
export const DEFAULT_LOADOUT: Loadout = {
  companion: "mira",
  pet: "fox",
  weapon: "sword",
  armor: "mail",
  skill: "whirlwind",
};
export function initialState(seed = 927113): GameState {
  return {
    quests: initialQuests(),
    meta: {
      gold: 0,
      earnedGold: 0,
      unlockedChapter: 1,
      victories: 0,
      defeats: 0,
      upgrades: { blade: 0, mail: 0, charm: 0 },
      loadout: { ...DEFAULT_LOADOUT },
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
      skillCooldown: 0,
      shield: 0,
    },
    phase: { kind: "camp" },
  };
}
export function rank(state: GameState, id: PerkId) {
  return state.run.perks[id] ?? 0;
}
export function heroStats(state: GameState): HeroStats {
  const l = state.meta.loadout;
  const companion = COMPANIONS.find((c) => c.id === l.companion)!;
  const pet = PETS.find((p) => p.id === l.pet)!;
  return {
    hp:
      180 +
      state.meta.upgrades.mail * 25 +
      rank(state, "heart") * 35 +
      (l.pet === "hound" ? 20 : 0) +
      (l.armor === "plate" ? 20 : 0),
    damage:
      (23 + state.meta.upgrades.blade * 4) *
      (1 + rank(state, "edge") * 0.25) *
      (l.weapon === "greatsword" ? 1.3 : 1),
    interval:
      (0.95 / (1 + rank(state, "tempo") * 0.18)) *
      (l.weapon === "greatsword" ? 1.2 : l.weapon === "spear" ? 0.9 : 1) *
      (l.armor === "plate" ? 1.1 : l.armor === "cloak" ? 0.9 : 1),
    armor:
      state.meta.upgrades.mail +
      rank(state, "bastion") * 3 +
      (l.companion === "bram" ? 2 : 0) +
      (l.armor === "plate" ? 3 : 0),
    crit: Math.min(0.5, 0.12 + state.meta.upgrades.charm * 0.025),
    lifesteal: rank(state, "blood") * 0.1,
    rangedResistance: Math.min(0.8, rank(state, "ward") * 0.35 + (l.armor === "cloak" ? 0.2 : 0)),
    companionDamage: companion.damage + state.meta.upgrades.blade * 1.5,
    companionInterval: companion.interval,
    petDamage: pet.damage + state.meta.upgrades.charm,
    petInterval: pet.interval,
    cleave: rank(state, "cleave") * 0.45 + (l.weapon === "greatsword" ? 0.25 : 0),
    pierce: rank(state, "pierce") * 0.4 + (l.weapon === "spear" ? 0.2 : 0),
  };
}
export function equip<K extends keyof Loadout>(state: GameState, slot: K, id: Loadout[K]): boolean {
  if (state.phase.kind !== "camp") return false;
  const registry: Record<keyof Loadout, readonly Unlock[]> = {
    companion: COMPANIONS,
    pet: PETS,
    weapon: WEAPONS,
    armor: ARMORS,
    skill: SKILLS,
  };
  const item = registry[slot].find((i) => i.id === id);
  if (!item || item.chapter > state.meta.unlockedChapter) return false;
  state.meta.loadout[slot] = id;
  state.run.hp = heroStats(state).hp;
  return true;
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
export function buyUpgrade(state: GameState, id: UpgradeId) {
  if (state.phase.kind !== "camp" || state.meta.upgrades[id] >= UPGRADE_CAP) return false;
  const cost = upgradeCost(state, id);
  if (state.meta.gold < cost) return false;
  state.meta.gold -= cost;
  state.meta.upgrades[id]++;
  state.run.hp = heroStats(state).hp;
  return true;
}
export function startRun(state: GameState, chapter = state.meta.unlockedChapter) {
  if (
    !["camp", "victory", "defeat"].includes(state.phase.kind) ||
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
    skillCooldown: 0,
    shield: 0,
  };
  state.run.hp = heroStats(state).hp;
  state.phase = { kind: "travel", remaining: 1.25 };
  return true;
}
export function returnToCamp(state: GameState) {
  if (!["victory", "defeat"].includes(state.phase.kind)) return false;
  if (state.phase.kind === "victory")
    state.run.chapter = Math.min(state.meta.unlockedChapter, state.run.chapter + 1);
  state.phase = { kind: "camp" };
  state.run.perks = {};
  state.run.shield = 0;
  state.run.skillCooldown = 0;
  state.run.hp = heroStats(state).hp;
  return true;
}

export function retreatToCamp(state: GameState): boolean {
  if (!["travel", "battle", "choice"].includes(state.phase.kind)) return false;
  const chapter = state.run.chapter;
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
    skillCooldown: 0,
    shield: 0,
  };
  state.run.hp = heroStats(state).hp;
  state.phase = { kind: "camp" };
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
          archer: "Briar archer",
        }[kind],
    hp,
    maxHp: hp,
    damage: Math.round((boss ? 22 : kind === "hexer" ? 13 : 6 + cleared * 0.75) * factor),
    interval: boss ? 1.6 : kind === "hexer" ? 1.9 : kind === "raider" ? 1.45 : 1.7,
    armor: kind === "sentinel" || boss ? 2 + chapter : 0,
    gold: boss ? 30 + chapter * 8 : 5 + Math.floor(cleared / 3) + chapter,
  };
}

export function encounterGroup(chapter: number, cleared: number): EnemyFighter[] {
  const base = encounter(chapter, cleared);
  const boss = base.kind === "warden";
  const count = boss ? 3 : cleared < 3 ? 2 : cleared < 8 ? 3 : 4;
  return Array.from({ length: count }, (_, slot) => {
    const row = slot < (count === 4 ? 2 : 1) ? "front" : "back";
    const kind: EnemyKind =
      row === "front"
        ? slot === 0
          ? base.kind === "hexer"
            ? "raider"
            : base.kind
          : "sentinel"
        : slot === count - 1 && (cleared % 3 === 2 || base.kind === "hexer")
          ? "hexer"
          : "archer";
    const hp = Math.round(
      base.maxHp *
        (slot === 0
          ? boss
            ? 0.8
            : 0.58
          : boss
            ? 0.25
            : count === 2
              ? 0.55
              : count === 3
                ? 0.38
                : 0.3),
    );
    return {
      ...base,
      id: `enemy-${slot}`,
      slot,
      row,
      kind,
      name:
        slot === 0
          ? base.kind === "hexer"
            ? "Briar raider"
            : base.name
          : kind === "sentinel"
            ? "Hollow guard"
            : kind === "hexer"
              ? "Cinder hexer"
              : "Briar archer",
      hp,
      maxHp: hp,
      damage: Math.max(2, Math.round(base.damage * (row === "front" ? 0.55 : 0.25))),
      interval: row === "back" ? 2.25 + slot * 0.15 : base.interval,
      armor: kind === "sentinel" || kind === "warden" ? 2 + chapter : 0,
      gold: Math.floor(base.gold / count) + (slot < base.gold % count ? 1 : 0),
      cooldown: 0.9 + slot * 0.35,
      pendingHit: null,
    };
  });
}
export function beginBattle(state: GameState): BattlePhase {
  return {
    kind: "battle",
    formation: "squad",
    enemies: encounterGroup(state.run.chapter, state.run.cleared),
    heroCooldown: 0.22,
    companionCooldown: 0.45,
    petCooldown: 0.8,
    heroHit: null,
    companionHit: null,
    petHit: null,
  };
}
export function livingEnemies(battle: BattlePhase) {
  return battle.enemies.filter((e) => e.hp > 0);
}
export function frontTarget(battle: BattlePhase) {
  return livingEnemies(battle).find((e) => e.row === "front") ?? livingEnemies(battle)[0];
}
function rearTarget(battle: BattlePhase) {
  return livingEnemies(battle).find((e) => e.row === "back") ?? frontTarget(battle);
}
function weakestTarget(battle: BattlePhase) {
  return livingEnemies(battle).sort((a, b) => a.hp - b.hp || a.slot - b.slot)[0];
}
export function choosePerk(state: GameState, id: PerkId) {
  if (state.phase.kind !== "choice" || !state.phase.options.includes(id)) return false;
  const perk = PERKS.find((p) => p.id === id);
  if (!perk || rank(state, id) >= perk.max) return false;
  state.run.perks[id] = rank(state, id) + 1;
  if (id === "heart") state.run.hp = Math.min(heroStats(state).hp, state.run.hp + 35);
  state.phase = { kind: "travel", remaining: 0.9 };
  return true;
}
export function skipPerk(state: GameState) {
  if (state.phase.kind !== "choice") return false;
  state.phase = { kind: "travel", remaining: 0.9 };
  return true;
}
function offeredPerks(state: GameState): PerkId[] {
  const weights: Record<Rarity, number> = { common: 5, rare: 4, epic: 3, legendary: 1 };
  const pool = PERKS.filter((p) => rank(state, p.id) < p.max).map((p) => ({
    id: p.id,
    score: -Math.log(Math.max(0.000001, random(state))) / weights[p.rarity],
  }));
  return pool
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((p) => p.id);
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
function damageEnemy(
  state: GameState,
  enemy: EnemyFighter,
  damage: number,
  actor: ActorId,
  events: GameEvent[],
  critical = false,
  lightning = false,
) {
  if (enemy.hp <= 0) return;
  const actual = Math.min(enemy.hp, Math.max(1, damage - enemy.armor));
  enemy.hp = Math.max(0, enemy.hp - actual);
  events.push({
    type: "hit",
    side: "enemy",
    actor,
    target: enemy.id,
    damage: actual,
    critical,
    ...(lightning ? { lightning: true } : {}),
  });
  if (actor === "hero") heal(state, actual * heroStats(state).lifesteal, events);
  if (enemy.hp === 0) {
    enemy.pendingHit = null;
    awardGold(state, enemy.gold);
    events.push({ type: "kill", gold: enemy.gold, target: enemy.id });
  }
}
function finishWave(state: GameState, battle: BattlePhase, events: GameEvent[]): boolean {
  if (livingEnemies(battle).length) return false;
  state.run.cleared++;
  state.run.xp += 2;
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
  } else state.phase = { kind: "travel", remaining: 1.05 };
  return true;
}
function interrupt(enemy: EnemyFighter, delay: number, actor: ActorId, events: GameEvent[]) {
  if (enemy.hp <= 0) return;
  enemy.pendingHit = null;
  enemy.cooldown = Math.max(enemy.cooldown, delay);
  events.push({ type: "interrupt", actor, target: enemy.id });
}
export function useSkill(state: GameState): GameEvent[] {
  if (state.phase.kind !== "battle" || state.run.skillCooldown > 0) return [];
  const skill = SKILLS.find((s) => s.id === state.meta.loadout.skill)!;
  if (skill.chapter > state.meta.unlockedChapter) return [];
  const battle = state.phase;
  const stats = heroStats(state);
  const events: GameEvent[] = [{ type: "skill", skill: skill.id }];
  state.run.skillCooldown = skill.cooldown;
  if (skill.id === "aegis") {
    state.run.shield = stats.hp * 0.3;
    events.push({ type: "shield", amount: state.run.shield });
    for (const foe of livingEnemies(battle)) interrupt(foe, 0.9, "hero", events);
  } else {
    const row = skill.id === "volley" ? "back" : "front";
    const targets = livingEnemies(battle).filter((e) => e.row === row);
    for (const foe of targets.length ? targets : livingEnemies(battle)) {
      if (skill.id === "volley") interrupt(foe, 1, "hero", events);
      damageEnemy(state, foe, stats.damage * (skill.id === "volley" ? 1.75 : 1.35), "hero", events);
    }
    finishWave(state, battle, events);
  }
  return events;
}
function resolveHero(state: GameState, battle: BattlePhase, hit: TargetHit, events: GameEvent[]) {
  const target = battle.enemies.find((e) => e.id === hit.target && e.hp > 0);
  if (!target) return;
  state.run.strikes++;
  const third = state.run.strikes % 3 === 0;
  const stats = heroStats(state);
  const extra = third ? rank(state, "storm") * 18 : 0;
  damageEnemy(state, target, hit.damage + extra, "hero", events, hit.critical, extra > 0);
  if (stats.cleave)
    for (const foe of livingEnemies(battle).filter((e) => e.row === "front" && e.id !== target.id))
      damageEnemy(state, foe, hit.damage * stats.cleave, "hero", events);
  if (stats.pierce) {
    const rear = livingEnemies(battle).find((e) => e.row === "back" && e.id !== target.id);
    if (rear) damageEnemy(state, rear, hit.damage * stats.pierce, "hero", events);
  }
  if (third && rank(state, "chain"))
    for (const foe of livingEnemies(battle).filter((e) => e.id !== target.id))
      damageEnemy(state, foe, 14 * rank(state, "chain"), "hero", events, false, true);
  if (third && rank(state, "interrupt"))
    for (const foe of livingEnemies(battle))
      interrupt(foe, 1.2 * rank(state, "interrupt"), "hero", events);
}
function resolveAlly(
  state: GameState,
  battle: BattlePhase,
  actor: "companion" | "pet",
  hit: TargetHit,
  events: GameEvent[],
) {
  const target = battle.enemies.find((e) => e.id === hit.target && e.hp > 0);
  if (!target) return;
  if (actor === "pet" && state.meta.loadout.pet === "owl") interrupt(target, 1, actor, events);
  const targets =
    actor === "companion" && state.meta.loadout.companion === "sable"
      ? livingEnemies(battle)
      : [target];
  for (const foe of targets)
    damageEnemy(
      state,
      foe,
      hit.damage,
      actor,
      events,
      false,
      actor === "companion" && state.meta.loadout.companion === "sable",
    );
}
export function stepGame(state: GameState, dt: number): GameEvent[] {
  const events: GameEvent[] = [];
  if (
    !Number.isFinite(dt) ||
    dt <= 0 ||
    dt > 0.25 ||
    !["travel", "battle"].includes(state.phase.kind)
  )
    return events;
  state.run.time += dt;
  state.run.skillCooldown = Math.max(0, state.run.skillCooldown - dt);
  if (state.phase.kind === "travel") {
    state.run.distance += dt;
    state.phase.remaining -= dt;
    if (state.phase.remaining <= 0) state.phase = beginBattle(state);
    return events;
  }
  if (state.phase.kind !== "battle") return events;
  const battle = state.phase;
  const stats = heroStats(state);
  battle.heroCooldown -= dt;
  battle.companionCooldown -= dt;
  battle.petCooldown -= dt;
  for (const actor of ["hero", "companion", "pet"] as const) {
    const field = actor === "hero" ? "heroHit" : actor === "companion" ? "companionHit" : "petHit";
    const hit = battle[field];
    if (hit) {
      hit.remaining -= dt;
      if (hit.remaining <= 0) {
        battle[field] = null;
        if (actor === "hero") resolveHero(state, battle, hit, events);
        else resolveAlly(state, battle, actor, hit, events);
        if (finishWave(state, battle, events)) return events;
      }
    }
  }
  for (const foe of battle.enemies) {
    if (foe.hp <= 0) continue;
    foe.cooldown -= dt;
    if (foe.pendingHit) {
      foe.pendingHit.remaining -= dt;
      if (foe.pendingHit.remaining <= 0) {
        const raw = foe.pendingHit.damage * (foe.row === "back" ? 1 - stats.rangedResistance : 1);
        foe.pendingHit = null;
        const incoming = Math.max(1, raw - stats.armor);
        const absorbed = Math.min(state.run.shield, incoming);
        state.run.shield -= absorbed;
        const damage = Math.min(state.run.hp, incoming - absorbed);
        state.run.hp = Math.max(0, state.run.hp - damage);
        events.push({
          type: "hit",
          side: "hero",
          actor: foe.id,
          target: "hero",
          damage,
          critical: false,
        });
        if (state.run.hp <= 0) {
          state.meta.defeats++;
          state.phase = { kind: "defeat", enemy: foe.name };
          events.push({ type: "defeat" });
          return events;
        }
        if (rank(state, "thorns")) {
          damageEnemy(state, foe, rank(state, "thorns") * 5, "hero", events);
          if (finishWave(state, battle, events)) return events;
        }
      }
    }
  }
  const front = frontTarget(battle);
  if (!front) return events;
  if (battle.heroCooldown <= 0 && !battle.heroHit) {
    const critical = random(state) < stats.crit;
    const execution = front.hp < front.maxHp / 2 ? 1 + rank(state, "execution") * 0.4 : 1;
    battle.heroHit = {
      remaining: 0.22,
      damage: stats.damage * (critical ? 1.8 : 1) * execution,
      critical,
      target: front.id,
      projectile: false,
    };
    battle.heroCooldown = stats.interval;
    events.push({
      type: "swing",
      side: "hero",
      actor: "hero",
      target: front.id,
      projectile: false,
    });
  }
  if (battle.companionCooldown <= 0 && !battle.companionHit) {
    const target = state.meta.loadout.companion === "mira" ? rearTarget(battle) : front;
    const projectile = state.meta.loadout.companion !== "bram";
    if (target) {
      battle.companionHit = {
        remaining: projectile ? 0.5 : 0.25,
        damage: stats.companionDamage,
        critical: false,
        target: target.id,
        projectile,
      };
      battle.companionCooldown = stats.companionInterval;
      events.push({
        type: "swing",
        side: "hero",
        actor: "companion",
        target: target.id,
        projectile,
      });
    }
  }
  if (battle.petCooldown <= 0 && !battle.petHit) {
    const target =
      state.meta.loadout.pet === "fox"
        ? weakestTarget(battle)
        : state.meta.loadout.pet === "owl"
          ? rearTarget(battle)
          : front;
    if (target) {
      battle.petHit = {
        remaining: 0.3,
        damage: stats.petDamage,
        critical: false,
        target: target.id,
        projectile: false,
      };
      battle.petCooldown = stats.petInterval;
      events.push({
        type: "swing",
        side: "hero",
        actor: "pet",
        target: target.id,
        projectile: false,
      });
    }
  }
  for (const foe of livingEnemies(battle)) {
    if (foe.cooldown <= 0 && !foe.pendingHit) {
      const projectile = foe.row === "back";
      foe.pendingHit = { remaining: projectile ? 0.65 : 0.29, damage: foe.damage, critical: false };
      foe.cooldown = foe.interval;
      events.push({ type: "swing", side: "enemy", actor: foe.id, target: "hero", projectile });
    }
  }
  return events;
}

export type LegacyState = {
  meta: Omit<GameState["meta"], "loadout">;
  run: Omit<GameState["run"], "skillCooldown" | "shield">;
  phase:
    | Exclude<Phase, BattlePhase>
    | {
        kind: "battle";
        enemy: Enemy;
        heroCooldown: number;
        enemyCooldown: number;
        heroHit: PendingHit | null;
        enemyHit: PendingHit | null;
      };
};
const LEGACY_IDS: readonly PerkId[] = [
  "edge",
  "tempo",
  "blood",
  "heart",
  "bastion",
  "storm",
  "thorns",
  "renewal",
  "execution",
];
const LEGACY_PERKS = PERKS.filter((p) => LEGACY_IDS.includes(p.id));
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

export function validLegacyState(value: unknown): value is LegacyState {
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
      LEGACY_PERKS.some((perk) => perk.id === id && number(count, 1, perk.max, true)),
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
        LEGACY_PERKS.some(
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

export function migrateV1State(value: unknown): GameState {
  if (!validLegacyState(value))
    throw new Error("The existing journey has an invalid version-one state.");
  const old = structuredClone(value);
  let phase: Phase;
  if (old.phase.kind === "battle") {
    const battle = old.phase;
    phase = {
      kind: "battle",
      formation: "legacy",
      enemies: [
        {
          ...battle.enemy,
          id: "enemy-0",
          slot: 0,
          row: battle.enemy.kind === "hexer" ? "back" : "front",
          cooldown: battle.enemyCooldown,
          pendingHit: battle.enemyHit,
        },
      ],
      heroCooldown: battle.heroCooldown,
      companionCooldown: 0.45,
      petCooldown: 0.8,
      heroHit: battle.heroHit ? { ...battle.heroHit, target: "enemy-0", projectile: false } : null,
      companionHit: null,
      petHit: null,
    };
  } else phase = old.phase;
  const state: GameState = {
    quests: initialQuests(
      0,
      knownStoryChapters(old.meta.unlockedChapter, phase.kind, old.run.chapter),
    ),
    meta: { ...old.meta, loadout: { ...DEFAULT_LOADOUT } },
    run: { ...old.run, skillCooldown: 0, shield: 0 },
    phase,
  };
  if (!validState(state)) throw new Error("The existing journey could not be migrated safely.");
  return state;
}
function validPending(value: unknown, maxTime: number) {
  return (
    value === null ||
    (record(value) &&
      number(value.remaining, -0.25, maxTime) &&
      number(value.damage, 0, 10000) &&
      typeof value.critical === "boolean")
  );
}
function validAllyHit(value: unknown, battle: BattlePhase) {
  return (
    validPending(value, 0.7) &&
    (value === null ||
      (record(value) &&
        battle.enemies.some((e) => e.id === value.target) &&
        typeof value.projectile === "boolean"))
  );
}
export function validState(value: unknown): value is GameState {
  if (!record(value)) return false;
  const quests = value.quests;
  if (!validQuestLedger(quests) || !validV2State(value)) return false;
  return quests.story.completed.every(
    (chapter) =>
      chapter < value.meta.unlockedChapter ||
      (chapter === CHAPTERS.length && value.meta.unlockedChapter === CHAPTERS.length),
  );
}
function knownStoryChapters(unlocked: number, phase: string, chapter: number) {
  const chapters = Array.from({ length: unlocked - 1 }, (_, i) => i + 1);
  if (phase === "victory" && !chapters.includes(chapter)) chapters.push(chapter);
  return chapters;
}
export function migrateV2State(value: unknown): GameState {
  if (!validV2State(value)) throw new Error("The existing version-two journey is invalid.");
  const state = {
    ...structuredClone(value),
    quests: initialQuests(
      0,
      knownStoryChapters(value.meta.unlockedChapter, value.phase.kind, value.run.chapter),
    ),
  };
  if (!validState(state))
    throw new Error("The journey's mission progress could not be initialized safely.");
  return state;
}
export function validV2State(value: unknown): value is Omit<GameState, "quests"> {
  if (!record(value) || !record(value.meta) || !record(value.run) || !record(value.phase))
    return false;
  const m = value.meta,
    r = value.run,
    p = value.phase;
  if (!record(m.upgrades) || !record(m.loadout) || !record(r.perks)) return false;
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
  const registry: Record<keyof Loadout, readonly Unlock[]> = {
    companion: COMPANIONS,
    pet: PETS,
    weapon: WEAPONS,
    armor: ARMORS,
    skill: SKILLS,
  };
  if (
    !Object.entries(registry).every(([slot, items]) =>
      items.some(
        (item) =>
          item.id === (m.loadout as Record<string, unknown>)[slot] &&
          item.chapter <= (m.unlockedChapter as number),
      ),
    )
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
    !number(r.distance, 0, 1e9) ||
    !number(r.skillCooldown, 0, 12) ||
    !number(r.shield, 0, 3000)
  )
    return false;
  if (
    !Object.entries(r.perks).every(([id, count]) =>
      PERKS.some((perk) => perk.id === id && number(count, 1, perk.max, true)),
    )
  )
    return false;
  const state = value as unknown as GameState;
  const maxHp = heroStats(state).hp;
  if (r.hp > maxHp || r.shield > maxHp * 0.3) return false;
  if (p.kind === "camp") return r.hp > 0;
  if (p.kind === "travel")
    return r.hp > 0 && r.cleared < ENCOUNTERS_PER_CHAPTER && number(p.remaining, -0.25, 2);
  if (p.kind === "choice")
    return (
      r.hp > 0 &&
      r.cleared < ENCOUNTERS_PER_CHAPTER &&
      Array.isArray(p.options) &&
      p.options.length >= 1 &&
      p.options.length <= 3 &&
      new Set(p.options).size === p.options.length &&
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
      typeof p.enemy === "string" &&
      (p.enemy === encounter(r.chapter, r.cleared).name ||
        encounterGroup(r.chapter, r.cleared).some((e) => e.name === p.enemy))
    );
  if (p.kind === "victory")
    return r.cleared === ENCOUNTERS_PER_CHAPTER && r.hp > 0 && p.reward === 35 + r.chapter * 15;
  if (
    p.kind !== "battle" ||
    r.hp <= 0 ||
    r.cleared >= ENCOUNTERS_PER_CHAPTER ||
    !["legacy", "squad"].includes(p.formation as string) ||
    !Array.isArray(p.enemies)
  )
    return false;
  const expected =
    p.formation === "legacy"
      ? [
          {
            ...encounter(r.chapter, r.cleared),
            id: "enemy-0",
            slot: 0,
            row: encounter(r.chapter, r.cleared).kind === "hexer" ? "back" : "front",
          },
        ]
      : encounterGroup(r.chapter, r.cleared);
  if (
    p.enemies.length !== expected.length ||
    !p.enemies.some((e) => record(e) && number(e.hp, 0, 10000) && e.hp > 0)
  )
    return false;
  for (let i = 0; i < expected.length; i++) {
    const e = p.enemies[i],
      template = expected[i];
    if (!record(e) || !template) return false;
    for (const key of [
      "id",
      "slot",
      "row",
      "kind",
      "name",
      "maxHp",
      "damage",
      "interval",
      "armor",
      "gold",
    ] as const)
      if (e[key] !== template[key]) return false;
    if (
      !number(e.hp, 0, template.maxHp) ||
      !number(e.cooldown, -0.25, 5) ||
      !validPending(e.pendingHit, 0.7)
    )
      return false;
    if (e.hp === 0 && e.pendingHit !== null) return false;
    if (
      record(e.pendingHit) &&
      (e.pendingHit.damage !== template.damage || e.pendingHit.critical !== false)
    )
      return false;
  }
  const battle = state.phase as BattlePhase;
  return (
    number(p.heroCooldown, -0.25, 5) &&
    number(p.companionCooldown, -0.25, 5) &&
    number(p.petCooldown, -0.25, 5) &&
    validAllyHit(p.heroHit, battle) &&
    validAllyHit(p.companionHit, battle) &&
    validAllyHit(p.petHit, battle)
  );
}
