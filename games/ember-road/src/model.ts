import {
  type ActivityKind,
  type AdventureLedger,
  activityPreview,
  advanceAdventures,
  currentRoute,
  DISCOVERY_CHAPTERS,
  EXPEDITIONS,
  initialAdventures,
  nextJunction,
  type RouteId,
  type RunContext,
  routeOptions,
  runLength,
  TIERS,
  type Tier,
  validAdventureLedger,
  validRunContext,
} from "./adventures.ts";
import { type Experience, initialExperience, validExperience } from "./experience.ts";
import {
  awardRenown,
  awardWave,
  initialProgression,
  LEVEL_THRESHOLDS,
  type Progression,
  prepareProgression,
  progressionOf,
  systemUnlocked,
  validProgression,
} from "./progression.ts";
import { initialQuests, type QuestLedger, validQuestLedger } from "./quests.ts";

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
    description: "Attack 18% faster. Breakthrough recovers 12% faster per rank.",
    family: "steel",
    rarity: "common",
    max: 3,
  },
  {
    id: "blood",
    title: "Blood oath",
    caption: "VITALITY / LIFESTEAL",
    description:
      "Restore 10% of Rook’s damage per rank, including ordinary chain lightning and Briar mail. Build-combo reactions never heal.",
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
    description:
      "Return 5 damage per rank on hit. Perfect Brace counters gain +20% sword damage per rank.",
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
      "Every third strike cancels attacks and delays foes by 1.2s per rank. Interrupted foes brace until they resolve one attack; further cancels cannot delay them.",
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
    description:
      "Fires every 1.8s. With discovered Cinder, her next arrow favors his 4s mark and consumes it for +50% arrow damage. Flying arrows keep their target.",
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
    description:
      "Bites the weakest foe every 2s. With discovered Mira, surviving targets receive one 4s Hunter’s Signal mark; marks never stack.",
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
    description:
      "Dives at archers and interrupts unbraced foes. They resist further cancels until one attack resolves.",
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
    description:
      "10% faster. Pierces a rear foe for 20% damage. Every third strike can relay Stormbound or Storm’s covenant from that contact.",
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
      "Deal 175% sword damage to the rear line and interrupt unbraced foes. Hits all foes if no rear line remains. Bracing ends after one attack resolves.",
    chapter: 2,
    cooldown: 10,
  },
  {
    id: "aegis",
    name: "Aegis",
    description:
      "Shield 30% maximum health and interrupt unbraced foes. From chapter 3, a broken shield fires Shatterguard shards. Recasting forfeits stored charge.",
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
export type CommandId = "brace" | "breakthrough";
export interface BattleCommands {
  brace: number;
  braceCooldown: number;
  breakthroughCooldown: number;
  focus: ActorId | null;
  focusTime: number;
  exposed: number;
  feedback: string;
  feedbackTime: number;
}
export const ENEMY_INTENTS: Record<
  EnemyKind,
  { label: string; answer: string; windup: number; recovery: number }
> = {
  raider: { label: "Lunge", answer: "Brace as the blade falls", windup: 0.8, recovery: 2.1 },
  sentinel: {
    label: "Shield crush",
    answer: "Break through its raised shield",
    windup: 1.25,
    recovery: 2.5,
  },
  archer: {
    label: "Aimed shot",
    answer: "Brace the arrow or break the rear line",
    windup: 1.6,
    recovery: 2.8,
  },
  hexer: {
    label: "Expose curse",
    answer: "Break the channel before it finishes",
    windup: 2.2,
    recovery: 3.4,
  },
  warden: {
    label: "Crownfall",
    answer: "Time a brace, then punish the opening",
    windup: 1.5,
    recovery: 3,
  },
};
export function enemyIntent(enemy: EnemyFighter) {
  const intent = ENEMY_INTENTS[enemy.kind];
  return enemy.kind === "warden" &&
    (enemy.pendingHit?.windup !== undefined
      ? enemy.pendingHit.windup < ENEMY_INTENTS.warden.windup
      : enemy.hp < enemy.maxHp / 2)
    ? { ...intent, label: "Desperate crownfall", windup: 1.05, recovery: 2.3 }
    : intent;
}
export interface PendingHit {
  remaining: number;
  damage: number;
  critical: boolean;
  legacy?: boolean;
  windup?: number;
}
export type SynergyId = "shatterguard" | "storm-relay" | "hunters-signal";
export interface TargetHit extends PendingHit {
  source?: "hero" | CompanionId | PetId;
  signalMark?: number;
  signalBonus?: number;
  target: ActorId;
  projectile: boolean;
}
export interface EnemyFighter extends Enemy {
  id: `enemy-${number}`;
  slot: number;
  row: "front" | "back";
  cooldown: number;
  pendingHit: PendingHit | null;
  braced?: boolean;
}
export interface BattlePhase {
  kind: "battle";
  formation: "legacy" | "squad";
  mark?: { target: ActorId; remaining: number; serial: number } | null;
  markSerial?: number;
  commands?: BattleCommands;
  reactions?: {
    target: ActorId;
    remaining: number;
    damage: number;
    actor: ActorId;
    effect: "shatterguard";
  }[];
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
  | { kind: "route"; at: number }
  | { kind: "choice"; options: PerkId[]; rerolls?: number }
  | { kind: "defeat"; enemy: string }
  | {
      kind: "victory";
      reward: number;
      bonus?: number;
      bonusStatus?: "earned" | "claimed" | "expired";
    };
export interface GameState {
  adventures?: AdventureLedger;
  quests: QuestLedger;
  meta: {
    experience?: Experience;
    progression?: Progression;
    gold: number;
    earnedGold: number;
    unlockedChapter: number;
    victories: number;
    defeats: number;
    upgrades: Record<UpgradeId, number>;
    loadout: Loadout;
  };
  run: {
    rules?: 1;
    context?: RunContext;
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
    shieldCast?: { absorbed: number; attack: number } | null;
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
  | {
      type: "swing";
      side: "hero" | "enemy";
      actor: ActorId;
      target: ActorId;
      projectile: boolean;
      contact?: number;
    }
  | {
      type: "command";
      command: CommandId;
      result: "ready" | "block" | "perfect" | "interrupt";
      target: ActorId;
    }
  | {
      type: "hit";
      side: "hero" | "enemy";
      actor: ActorId;
      target: ActorId;
      damage: number;
      critical: boolean;
      lightning?: boolean;
      effect?: SynergyId;
    }
  | { type: "combo"; effect: SynergyId | "mark" | "brace"; actor: ActorId; target: ActorId }
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
    adventures: initialAdventures(),
    quests: initialQuests(),
    meta: {
      experience: initialExperience(),
      progression: initialProgression(),
      gold: 0,
      earnedGold: 0,
      unlockedChapter: 1,
      victories: 0,
      defeats: 0,
      upgrades: { blade: 0, mail: 0, charm: 0 },
      loadout: { ...DEFAULT_LOADOUT },
    },
    run: {
      rules: 1,
      context: { kind: "campaign", routes: [], junctionFloor: 0 },
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
      shieldCast: null,
    },
    phase: { kind: "camp" },
  };
}
function companyLevelBonus(state: GameState) {
  if (!state.adventures) return 0;
  return LEVEL_THRESHOLDS.filter((t) => t <= progressionOf(state).renown).length - 1;
}
export function rank(state: GameState, id: PerkId) {
  return state.run.perks[id] ?? 0;
}
export function heroStats(state: GameState): HeroStats {
  const l = state.meta.loadout;
  const companion = COMPANIONS.find((c) => c.id === l.companion)!;
  const pet = PETS.find((p) => p.id === l.pet)!;
  const companyReady = systemUnlocked(state, "company");
  const petReady = systemUnlocked(state, "pets");
  const training = progressionOf(state).training;
  return {
    hp:
      180 +
      companyLevelBonus(state) * 5 +
      state.meta.upgrades.mail * 25 +
      rank(state, "heart") * 35 +
      (petReady && l.pet === "hound" ? 20 : 0) +
      (l.armor === "plate" ? 20 : 0),
    damage:
      (23 + state.meta.upgrades.blade * 4 + companyLevelBonus(state) * 2) *
      (state.run.context?.kind === "campaign" &&
      state.run.context.routes.some((r) => r.path === "shrine")
        ? 1.2
        : 1) *
      (1 + rank(state, "edge") * 0.25) *
      (l.weapon === "greatsword" ? 1.3 : 1),
    interval:
      (0.95 / (1 + rank(state, "tempo") * 0.18)) *
      (l.weapon === "greatsword" ? 1.2 : l.weapon === "spear" ? 0.9 : 1) *
      (l.armor === "plate" ? 1.1 : l.armor === "cloak" ? 0.9 : 1),
    armor:
      state.meta.upgrades.mail +
      rank(state, "bastion") * 3 +
      (companyReady && l.companion === "bram" ? 2 : 0) +
      (l.armor === "plate" ? 3 : 0),
    crit: Math.min(0.5, 0.12 + state.meta.upgrades.charm * 0.025),
    lifesteal: rank(state, "blood") * 0.1,
    rangedResistance: Math.min(0.8, rank(state, "ward") * 0.35 + (l.armor === "cloak" ? 0.2 : 0)),
    companionDamage: companyReady
      ? (companion.damage + state.meta.upgrades.blade * 1.5) * (1 + training.companion * 0.15)
      : 0,
    companionInterval: companion.interval,
    petDamage: petReady ? (pet.damage + state.meta.upgrades.charm) * (1 + training.pet * 0.18) : 0,
    petInterval: pet.interval,
    cleave: rank(state, "cleave") * 0.45 + (l.weapon === "greatsword" ? 0.25 : 0),
    pierce: rank(state, "pierce") * 0.4 + (l.weapon === "spear" ? 0.2 : 0),
  };
}
/** Bounded one-hop reactions; future content adds a named rule, never a recursive proc bus. */
export const COMBO_TUNING = {
  shatterAbsorbed: 0.6,
  shatterAttackCap: 1,
  shatterTargets: 3,
  shardFlight: 0.28,
  relayEntryAttack: 0.35,
  relayTargets: 3,
  relayDecay: 0.65,
  markSeconds: 4,
  signalBonus: 0.5,
} as const;
export const SYNERGIES = [
  {
    id: "shatterguard",
    name: "Shatterguard",
    badge: (state: GameState) => (state.run.shieldCast ? "Armed" : "Cast"),
    reveal: (state: GameState) => state.meta.unlockedChapter >= 3,
    status: (state: GameState) =>
      state.run.shieldCast
        ? `Armed · ${Math.ceil(state.run.shieldCast.absorbed)} absorbed · ${Math.ceil(state.run.shield)} barrier. Recasting forfeits stored charge.`
        : "Needs a fresh Aegis cast · Recasting replaces the barrier and forfeits stored charge.",
    description:
      "When enemy damage breaks Aegis, fire up to 3 shards. Total raw damage is the lesser of 60% absorbed damage and 100% cast-time Rook damage. Recasts never shatter; shards cannot heal.",
    requirements: [
      { label: "Reach chapter 3", met: (state: GameState) => state.meta.unlockedChapter >= 3 },
      {
        label: "Equip Aegis and unlock skills",
        met: (state: GameState) =>
          state.meta.loadout.skill === "aegis" && systemUnlocked(state, "skills"),
      },
    ],
  },
  {
    id: "storm-relay",
    name: "Storm Relay",
    badge: () => "✓",
    reveal: (state: GameState) => state.meta.unlockedChapter >= 3,
    status: () => "Ready on a piercing third strike",
    description:
      "Every third strike, a real piercing contact relays lightning to up to 3 other living foes with fading power. Storm’s covenant redistributes its existing chain budget; Stormbound alone grants a small 35% Rook-damage budget. Reactions cannot heal or repeat.",
    requirements: [
      { label: "Reach chapter 3", met: (state: GameState) => state.meta.unlockedChapter >= 3 },
      {
        label: "Equip a spear or choose Through the ranks",
        met: (state: GameState) => heroStats(state).pierce > 0,
      },
      {
        label: "Choose Stormbound or Storm’s covenant",
        met: (state: GameState) => rank(state, "storm") > 0 || rank(state, "chain") > 0,
      },
    ],
  },
  {
    id: "hunters-signal",
    name: "Hunter’s Signal",
    badge: () => "✓",
    reveal: (state: GameState) =>
      !!state.adventures?.discoveries.mira &&
      !!state.adventures?.discoveries.cinder &&
      systemUnlocked(state, "company") &&
      systemUnlocked(state, "pets"),
    status: () => "Ready when Cinder marks a surviving foe",
    description:
      "Cinder’s bite marks one surviving foe for 4s. Mira aims her next arrow at that foe; one successful marked hit consumes the mark for +50% of that arrow’s snapshotted damage. In-flight arrows keep their target; expired or replaced marks give no bonus.",
    requirements: [
      {
        label: "Discover Mira and Cinder",
        met: (state: GameState) =>
          !!state.adventures?.discoveries.mira &&
          !!state.adventures?.discoveries.cinder &&
          systemUnlocked(state, "company") &&
          systemUnlocked(state, "pets"),
      },
      {
        label: "Equip Mira and Cinder",
        met: (state: GameState) =>
          state.meta.loadout.companion === "mira" && state.meta.loadout.pet === "fox",
      },
    ],
  },
] as const;
export function synergyStatus(state: GameState) {
  return SYNERGIES.map((rule) => {
    const missing = rule.requirements
      .filter((requirement) => !requirement.met(state))
      .map((requirement) => requirement.label);
    return {
      ...rule,
      revealed: rule.reveal(state),
      badge: missing.length ? "+" : rule.badge(state),
      active: missing.length === 0,
      missing,
      status: missing.length ? `Requires: ${missing.join(" · ")}` : rule.status(state),
    };
  });
}
export function activeSynergies(state: GameState): SynergyId[] {
  return synergyStatus(state)
    .filter((rule) => rule.active)
    .map((rule) => rule.id);
}
export function equip<K extends keyof Loadout>(state: GameState, slot: K, id: Loadout[K]): boolean {
  if (state.phase.kind !== "camp") return false;
  if (
    (slot === "companion" && !systemUnlocked(state, "company")) ||
    (slot === "pet" && !systemUnlocked(state, "pets")) ||
    (slot === "skill" && !systemUnlocked(state, "skills"))
  )
    return false;
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
  return state.run.rules === 1 ? (state.run.level === 1 ? 6 : 10) : 3 + state.run.level;
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
    rules: state.adventures ? 1 : undefined,
    context: state.adventures ? { kind: "campaign", routes: [], junctionFloor: 0 } : undefined,
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
    shieldCast: null,
  };
  state.run.hp = heroStats(state).hp;
  state.phase = { kind: "travel", remaining: 1.25 };
  return true;
}
export function returnToCamp(state: GameState) {
  if (!["victory", "defeat"].includes(state.phase.kind)) return false;
  if (
    state.phase.kind === "victory" &&
    (!state.run.context || state.run.context.kind === "campaign")
  )
    state.run.chapter = Math.min(state.meta.unlockedChapter, state.run.chapter + 1);
  const context = state.run.context;
  if (context && context.kind !== "campaign") state.run.chapter = context.returnChapter;
  state.run.context = { kind: "campaign", routes: [], junctionFloor: state.run.cleared };
  state.phase = { kind: "camp" };
  state.run.perks = {};
  state.run.shield = 0;
  state.run.shieldCast = null;
  state.run.skillCooldown = 0;
  state.run.hp = heroStats(state).hp;
  return true;
}

export function retreatToCamp(state: GameState): boolean {
  if (!["travel", "battle", "choice", "route"].includes(state.phase.kind)) return false;
  const context = state.run.context;
  const chapter =
    context && context.kind !== "campaign" ? context.returnChapter : state.run.chapter;
  const seed = state.run.seed;
  state.run = {
    rules: state.adventures ? 1 : undefined,
    context: state.adventures ? { kind: "campaign", routes: [], junctionFloor: 0 } : undefined,
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
    shieldCast: null,
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
      braced: false,
    };
  });
}
export function tacticalEncounterGroup(chapter: number, cleared: number): EnemyFighter[] {
  const base = encounterGroup(chapter, cleared);
  const lessons: EnemyKind[][] = [
    ["raider"],
    ["raider", "archer"],
    ["sentinel", "archer"],
    ["raider", "hexer"],
    ["sentinel", "hexer"],
    ["raider", "archer", "hexer"],
    ["sentinel", "archer"],
    ["raider", "sentinel", "hexer"],
    ["sentinel", "archer", "archer"],
    ["raider", "hexer", "archer"],
    ["sentinel", "hexer", "archer"],
    ["warden", "archer", "hexer"],
  ];
  const later: EnemyKind[][] = [
    ["sentinel", "hexer"],
    ["raider", "archer", "archer"],
    ["sentinel", "raider", "hexer"],
    ["raider", "hexer", "hexer"],
    ["sentinel", "archer", "hexer"],
  ];
  const kinds =
    chapter === 1 || cleared === 11
      ? lessons[Math.min(11, cleared)]!
      : later[(cleared + chapter * 2) % later.length]!;
  return kinds.map((kind, slot) => {
    const original = base[Math.min(slot, base.length - 1)]!;
    const factor = 1 + (chapter - 1) * 0.34;
    const maxHp = Math.round(
      (kind === "warden" ? 285 : slot === 0 ? 62 + cleared * 5 : 40 + cleared * 3) * factor,
    );
    return {
      ...original,
      id: `enemy-${slot}`,
      slot,
      kind,
      row: kind === "archer" || kind === "hexer" ? "back" : "front",
      name:
        kind === "warden"
          ? CHAPTERS[chapter - 1]!.boss
          : {
              raider: "Briar raider",
              sentinel: "Hollow shieldbearer",
              archer: "Briar sharpshot",
              hexer: "Cinder hexer",
            }[kind],
      hp: maxHp,
      maxHp,
      damage: Math.round(
        (kind === "warden"
          ? 32
          : kind === "hexer"
            ? 13
            : kind === "archer"
              ? 10
              : kind === "sentinel"
                ? 13
                : cleared === 0
                  ? 5
                  : 8) * factor,
      ),
      armor: kind === "sentinel" ? 3 + chapter : kind === "warden" ? 2 + chapter : 0,
      interval: ENEMY_INTENTS[kind].recovery,
      cooldown: 1 + slot * 0.7,
      pendingHit: null,
      braced: false,
    };
  });
}
export function startActivity(
  state: GameState,
  kind: ActivityKind,
  tier: Tier,
  period: number,
  id: number,
  now: number,
  returnChapter = state.run.context && state.run.context.kind !== "campaign"
    ? state.run.context.returnChapter
    : state.run.chapter,
): boolean {
  advanceAdventures(state, now);
  if (!["daily", "hunt"].includes(kind) || ![1, 2, 3].includes(tier)) return false;
  const offer = activityPreview(state, kind, tier);
  if (
    !Number.isInteger(returnChapter) ||
    returnChapter < 1 ||
    returnChapter > state.meta.unlockedChapter ||
    !offer.unlocked ||
    offer.period !== period ||
    offer.id !== id ||
    !startRun(state, Math.min(state.meta.unlockedChapter, TIERS[tier - 1]!.chapter))
  )
    return false;
  state.run.context = { kind, tier, period, id, returnChapter };
  state.run.seed = ((period + 1) * 2654435761 + id * 97 + tier * 17) >>> 0 || 1;
  return true;
}
export function chooseRoute(state: GameState, path: RouteId): boolean {
  const context = state.run.context;
  if (
    state.phase.kind !== "route" ||
    context?.kind !== "campaign" ||
    nextJunction(state) !== state.phase.at ||
    !routeOptions(state.phase.at).includes(path) ||
    !state.adventures
  )
    return false;
  context.routes.push({ at: state.phase.at, path });
  const p = prepareProgression(state),
    discoveries = state.adventures.discoveries;
  if (path === "spring") {
    state.run.hp = Math.min(heroStats(state).hp, state.run.hp + heroStats(state).hp * 0.35);
    p.trailmarks = Math.min(1e9, p.trailmarks + 2);
  }
  if (path === "rescue") {
    if (discoveries.mira) p.trailmarks = Math.min(1e9, p.trailmarks + 5);
    else if (state.run.chapter >= DISCOVERY_CHAPTERS.mira) discoveries.mira = true;
    else p.trailmarks = Math.min(1e9, p.trailmarks + 3);
  }
  if (path === "tracks") {
    if (discoveries.cinder) p.trailmarks = Math.min(1e9, p.trailmarks + 5);
    else if (state.run.chapter >= DISCOVERY_CHAPTERS.cinder) discoveries.cinder = true;
    else p.trailmarks = Math.min(1e9, p.trailmarks + 3);
  }
  if (path === "shrine") discoveries.whirlwind = true;
  state.phase = { kind: "travel", remaining: 0.9 };
  return true;
}
function resumeTrail(state: GameState, remaining = 0.9) {
  const at = state.adventures ? nextJunction(state) : undefined;
  state.phase = at === undefined ? { kind: "travel", remaining } : { kind: "route", at };
}
export function adventureEnemies(state: GameState): EnemyFighter[] {
  const context = state.run.context;
  if (!context || context.kind === "campaign") {
    const enemies = (state.run.rules === 1 ? tacticalEncounterGroup : encounterGroup)(
        state.run.chapter,
        state.run.cleared,
      ),
      route = currentRoute(state);
    for (const enemy of enemies) {
      if (route === "spring") {
        enemy.maxHp = Math.round(enemy.maxHp * 0.8);
        enemy.damage = Math.max(1, Math.round(enemy.damage * 0.8));
      }
      if (route === "elite") {
        enemy.maxHp = Math.round(enemy.maxHp * 1.35);
        enemy.armor += 2;
        enemy.gold *= 2;
        if (enemy.row === "back") {
          enemy.kind = "hexer";
          enemy.name = "Elite emberguard";
        }
      }
      enemy.hp = enemy.maxHp;
    }
    return enemies;
  }
  const tier = TIERS[context.tier - 1]!,
    round = state.run.cleared;
  let enemies: EnemyFighter[];
  if (context.kind === "hunt") {
    enemies = encounterGroup(context.id + 1, 11).slice(0, round + 1);
    for (const enemy of enemies) {
      if (enemy.slot === 0) {
        enemy.maxHp = Math.round((120 + round * 35) * tier.factor);
        enemy.damage = Math.round((12 + round * 3) * tier.factor);
        enemy.interval = round === 0 ? 2.6 : round === 1 ? 2 : 1.6;
        enemy.name = CHAPTERS[context.id]!.boss;
      } else {
        enemy.kind = round === 1 ? "sentinel" : "hexer";
        enemy.name = round === 1 ? "Hunt shieldbearer" : "Hunt embercaller";
        enemy.row = round === 1 ? "front" : "back";
        enemy.maxHp = Math.round(38 * tier.factor);
        enemy.damage = Math.round(6 * tier.factor);
        enemy.interval = round === 1 ? 1.8 : 2.8;
        enemy.armor = round === 1 ? 4 : 0;
      }
      enemy.hp = enemy.maxHp;
      enemy.gold = 5 + context.tier * 2;
    }
    return enemies;
  }
  enemies = encounterGroup(state.run.chapter, round + 2);
  const style = EXPEDITIONS[context.id]!.style;
  for (const enemy of enemies) {
    enemy.maxHp = Math.round(enemy.maxHp * tier.factor);
    enemy.damage = Math.round(enemy.damage * tier.factor);
    if (style === "arrows" && enemy.row === "back") {
      enemy.kind = "archer";
      enemy.name = "Storm archer";
      enemy.interval = 1.15;
    }
    if (style === "armor") {
      enemy.kind = "sentinel";
      enemy.name = "Ironwatch sentinel";
      enemy.armor += 4;
      enemy.maxHp = Math.round(enemy.maxHp * 1.2);
    }
    if (style === "glass") {
      enemy.maxHp = Math.round(enemy.maxHp * 0.65);
      enemy.damage *= 2;
      enemy.armor = 0;
    }
    if (style === "feral") {
      enemy.kind = "raider";
      enemy.name = "Feral raider";
      enemy.row = "front";
      enemy.interval = 0.95;
      enemy.armor = 0;
    }
    if (style === "lantern" && enemy.row === "back") {
      enemy.kind = "hexer";
      enemy.name = "Lantern hexer";
      enemy.damage *= 2;
      enemy.interval = 2.8;
    }
    enemy.hp = enemy.maxHp;
  }
  return enemies;
}
export function beginBattle(state: GameState): BattlePhase {
  return {
    kind: "battle",
    formation: "squad",
    mark: null,
    markSerial: 0,
    reactions: [],
    ...(state.run.rules === 1
      ? {
          commands: {
            brace: 0,
            braceCooldown: 0,
            breakthroughCooldown: 0,
            focus: null,
            focusTime: 0,
            exposed: 0,
            feedback: "Read the windup. W braces; E breaks a channel.",
            feedbackTime: 5,
          },
        }
      : {}),
    enemies: adventureEnemies(state),
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
  if (state.adventures) {
    const d = state.adventures.discoveries;
    d.oaths = Math.min(2, d.oaths + 1);
    if (d.oaths === 2) d.whirlwind = true;
  }
  resumeTrail(state);
  return true;
}
export function skipPerk(state: GameState) {
  if (state.phase.kind !== "choice") return false;
  resumeTrail(state);
  return true;
}
export function rerollPerks(state: GameState) {
  if (state.phase.kind !== "choice" || (state.phase.rerolls ?? 1) <= 0) return false;
  const old = state.phase.options;
  const alternatives = PERKS.filter((p) => rank(state, p.id) < p.max && !old.includes(p.id));
  if (!alternatives.length) return false;
  const options = offeredPerks(
    state,
    alternatives.map((p) => p.id),
  );
  state.phase = { kind: "choice", options, rerolls: 0 };
  return true;
}
function offeredPerks(state: GameState, allowed?: PerkId[]): PerkId[] {
  const weights: Record<Rarity, number> = { common: 5, rare: 4, epic: 3, legendary: 1 };
  const pool = PERKS.filter(
    (p) =>
      rank(state, p.id) < p.max &&
      (!allowed || allowed.includes(p.id)) &&
      !(state.run.rules === 1 && p.id === "renewal" && state.run.cleared >= runLength(state) - 2),
  ).map((p) => ({
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
  reaction?: SynergyId,
) {
  if (enemy.hp <= 0) return;
  const raisedShield =
    state.run.rules === 1 &&
    enemy.kind === "sentinel" &&
    enemy.pendingHit !== null &&
    actor === "hero" &&
    !reaction;
  const actual = Math.min(
    enemy.hp,
    Math.max(reaction ? 0 : 1, damage * (raisedShield ? 0.35 : 1) - enemy.armor),
  );
  enemy.hp = Math.max(0, enemy.hp - actual);
  events.push({
    type: "hit",
    side: "enemy",
    actor,
    target: enemy.id,
    damage: actual,
    critical,
    ...(lightning ? { lightning: true } : {}),
    ...(reaction ? { effect: reaction } : {}),
  });
  if (actor === "hero" && !reaction) heal(state, actual * heroStats(state).lifesteal, events);
  if (enemy.hp === 0) {
    if (state.phase.kind === "battle" && state.phase.mark?.target === enemy.id)
      state.phase.mark = null;
    awardRenown(state, 1);
    enemy.pendingHit = null;
    awardGold(state, enemy.gold);
    events.push({ type: "kill", gold: enemy.gold, target: enemy.id });
  }
}
function finishWave(state: GameState, battle: BattlePhase, events: GameEvent[]): boolean {
  if (livingEnemies(battle).length) return false;
  state.run.cleared++;
  const campaign = !state.run.context || state.run.context.kind === "campaign";
  const finished = state.run.cleared >= runLength(state);
  awardWave(state, finished && campaign);
  if (currentRoute(state) === "elite")
    prepareProgression(state).trailmarks = Math.min(1e9, prepareProgression(state).trailmarks + 2);
  state.run.xp += 2;
  heal(state, heroStats(state).hp * 0.08 * rank(state, "renewal"), events);
  if (finished) {
    state.run.shieldCast = null;
    let reward = 35 + state.run.chapter * 15;
    let bonus = 0;
    let bonusStatus: "earned" | "claimed" | "expired" | undefined;
    if (campaign) {
      state.meta.victories++;
      state.meta.unlockedChapter = Math.max(
        state.meta.unlockedChapter,
        Math.min(CHAPTERS.length, state.run.chapter + 1),
      );
    } else {
      const context = state.run.context!;
      if (context.kind !== "campaign" && state.adventures) {
        const preview = activityPreview(state, context.kind, context.tier),
          ledger = state.adventures[context.kind];
        reward = context.kind === "daily" ? 20 : 35;
        bonusStatus =
          context.period !== preview.period
            ? "expired"
            : ledger.includes(context.tier)
              ? "claimed"
              : "earned";
        if (bonusStatus === "earned") {
          ledger.push(context.tier);
          bonus = preview.reward.gold;
          reward += bonus;
          const p = prepareProgression(state);
          p.trailmarks = Math.min(1e9, p.trailmarks + preview.reward.marks);
          p.embers = Math.min(1e9, p.embers + preview.reward.embers);
          awardRenown(state, context.kind === "hunt" ? 12 : 6);
        }
      }
    }
    awardGold(state, reward);
    state.phase = { kind: "victory", reward, ...(bonusStatus ? { bonus, bonusStatus } : {}) };
    events.push({ type: "victory", gold: reward });
  } else if (state.run.xp >= xpNeeded(state)) {
    state.run.xp -= xpNeeded(state);
    state.run.level++;
    const options = offeredPerks(state);
    if (options.length) state.phase = { kind: "choice", options, rerolls: 1 };
    else resumeTrail(state);
    events.push({ type: "level", level: state.run.level });
  } else resumeTrail(state, 1.05);
  return true;
}
function interrupt(enemy: EnemyFighter, delay: number, actor: ActorId, events: GameEvent[]) {
  if (enemy.hp <= 0 || enemy.braced) return;
  enemy.braced = true;
  enemy.pendingHit = null;
  enemy.cooldown = Math.max(enemy.cooldown, delay);
  events.push({ type: "interrupt", actor, target: enemy.id });
  events.push({ type: "combo", effect: "brace", actor, target: enemy.id });
}
export function effectiveSkillCooldown(state: GameState, id: SkillId = state.meta.loadout.skill) {
  return (
    SKILLS.find((skill) => skill.id === id)!.cooldown *
    (1 - progressionOf(state).training.skill * 0.08)
  );
}
export function issueCommand(state: GameState, command: CommandId): GameEvent[] {
  if (state.phase.kind !== "battle" || !state.phase.commands) return [];
  const battle = state.phase,
    commands = battle.commands!;
  const events: GameEvent[] = [];
  if (command === "brace") {
    if (commands.braceCooldown > 0) return [];
    commands.brace = 0.9;
    commands.braceCooldown = 3.2;
    commands.feedback = "Brace raised · last-moment contact counters";
    commands.feedbackTime = 1.2;
    events.push({ type: "command", command, result: "ready", target: "hero" });
  } else {
    if (commands.breakthroughCooldown > 0) return [];
    const foes = livingEnemies(battle);
    const target =
      foes.find((foe) => foe.kind === "hexer" && foe.pendingHit && !foe.braced) ??
      foes.find((foe) => foe.kind === "sentinel" && foe.pendingHit && !foe.braced) ??
      foes.find((foe) => foe.row === "back" && foe.pendingHit && !foe.braced) ??
      foes.find((foe) => foe.row === "back") ??
      foes[0];
    if (!target) return [];
    const channel = target.pendingHit !== null && !target.braced;
    commands.breakthroughCooldown = 6.5 * (1 - rank(state, "tempo") * 0.12);
    commands.focus = target.id;
    commands.focusTime = 2.4;
    if (channel) interrupt(target, 1.2, "hero", events);
    damageEnemy(state, target, heroStats(state).damage * (channel ? 1.25 : 0.7), "hero", events);
    commands.feedback = channel
      ? `${target.name} interrupted · opening!`
      : `Breaking toward ${target.name}`;
    commands.feedbackTime = 1.6;
    events.push({
      type: "command",
      command,
      result: channel ? "interrupt" : "ready",
      target: target.id,
    });
    finishWave(state, battle, events);
  }
  return events;
}
export function useSkill(state: GameState): GameEvent[] {
  if (
    state.phase.kind !== "battle" ||
    state.run.skillCooldown > 0 ||
    !systemUnlocked(state, "skills")
  )
    return [];
  const skill = SKILLS.find((s) => s.id === state.meta.loadout.skill)!;
  if (skill.chapter > state.meta.unlockedChapter) return [];
  const battle = state.phase;
  const stats = heroStats(state);
  const events: GameEvent[] = [{ type: "skill", skill: skill.id }];
  state.run.skillCooldown = effectiveSkillCooldown(state);
  if (skill.id === "aegis") {
    state.run.shield = stats.hp * 0.3;
    state.run.shieldCast = activeSynergies(state).includes("shatterguard")
      ? { absorbed: 0, attack: stats.damage }
      : null;
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
  let pierced: EnemyFighter | undefined;
  if (stats.pierce) {
    pierced = livingEnemies(battle).find((e) => e.row === "back" && e.id !== target.id);
    if (pierced) damageEnemy(state, pierced, hit.damage * stats.pierce, "hero", events);
  }
  const chainTargets = livingEnemies(battle).filter((e) => e.id !== target.id);
  const targets = pierced
    ? livingEnemies(battle)
        .filter((e) => e.id !== pierced.id)
        .slice(0, COMBO_TUNING.relayTargets)
    : [];
  if (
    third &&
    pierced &&
    targets.length &&
    !hit.legacy &&
    activeSynergies(state).includes("storm-relay")
  ) {
    const budget = rank(state, "chain")
      ? 14 * rank(state, "chain") * chainTargets.length
      : stats.damage * COMBO_TUNING.relayEntryAttack;
    const totalWeight = targets.reduce((sum, _, i) => sum + COMBO_TUNING.relayDecay ** i, 0);
    let origin: ActorId = pierced.id;
    for (const [i, foe] of (budget > 0 ? targets : []).entries()) {
      events.push({ type: "combo", effect: "storm-relay", actor: origin, target: foe.id });
      damageEnemy(
        state,
        foe,
        (budget * COMBO_TUNING.relayDecay ** i) / totalWeight,
        "hero",
        events,
        false,
        true,
        "storm-relay",
      );
      origin = foe.id;
    }
  } else if (third && rank(state, "chain"))
    for (const foe of chainTargets)
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
  const source =
    hit.source ?? (actor === "pet" ? state.meta.loadout.pet : state.meta.loadout.companion);
  if (actor === "pet" && source === "owl") interrupt(target, 1, actor, events);
  let bonus = 0;
  if (
    actor === "companion" &&
    source === "mira" &&
    hit.signalMark !== undefined &&
    battle.mark?.serial === hit.signalMark &&
    battle.mark.target === target.id &&
    battle.mark.remaining > 0
  ) {
    bonus = hit.signalBonus ?? 0;
    battle.mark = null;
    events.push({ type: "combo", effect: "hunters-signal", actor, target: target.id });
  }
  const targets = actor === "companion" && source === "sable" ? livingEnemies(battle) : [target];
  for (const foe of targets)
    damageEnemy(
      state,
      foe,
      hit.damage + bonus,
      actor,
      events,
      false,
      actor === "companion" && source === "sable",
    );
  if (
    actor === "pet" &&
    source === "fox" &&
    !hit.legacy &&
    target.hp > 0 &&
    activeSynergies(state).includes("hunters-signal")
  ) {
    battle.markSerial = (battle.markSerial ?? 0) + 1;
    battle.mark = {
      target: target.id,
      remaining: COMBO_TUNING.markSeconds,
      serial: battle.markSerial,
    };
    events.push({ type: "combo", effect: "mark", actor, target: target.id });
  }
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
  const commands = battle.commands;
  if (commands) {
    for (const key of [
      "brace",
      "braceCooldown",
      "breakthroughCooldown",
      "focusTime",
      "exposed",
      "feedbackTime",
    ] as const)
      commands[key] = Math.max(0, commands[key] - dt);
    if (commands.focusTime <= 0) commands.focus = null;
  }
  if (battle.mark) {
    battle.mark.remaining -= dt;
    if (
      battle.mark.remaining <= 0 ||
      !battle.enemies.some((foe) => foe.id === battle.mark?.target && foe.hp > 0)
    )
      battle.mark = null;
  }
  for (const reaction of [...(battle.reactions ?? [])]) {
    reaction.remaining -= dt;
    if (reaction.remaining > 0) continue;
    battle.reactions = battle.reactions!.filter((queued) => queued !== reaction);
    const target = battle.enemies.find((foe) => foe.id === reaction.target && foe.hp > 0);
    if (target)
      damageEnemy(
        state,
        target,
        reaction.damage,
        reaction.actor,
        events,
        false,
        false,
        reaction.effect,
      );
    if (finishWave(state, battle, events)) return events;
  }
  battle.heroCooldown -= dt;
  if (systemUnlocked(state, "company")) battle.companionCooldown -= dt;
  if (systemUnlocked(state, "pets")) battle.petCooldown -= dt;
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
        const hit = foe.pendingHit;
        const perfect = !!commands && commands.brace > 0.6;
        const guarded = !!commands && commands.brace > 0;
        const curse = state.run.rules === 1 && foe.kind === "hexer";
        const raw =
          hit.damage *
          (foe.row === "back" ? 1 - stats.rangedResistance : 1) *
          (commands && commands.exposed > 0 ? 1.5 : 1) *
          (guarded ? (perfect ? 0 : 0.25) : 1);
        foe.pendingHit = null;
        foe.braced = false;
        // Only an attack already in flight at the v4 upgrade retains armor-first mitigation.
        const incoming = perfect ? 0 : Math.max(1, raw - (hit.legacy ? stats.armor : 0));
        const absorbed = Math.min(state.run.shield, incoming);
        state.run.shield -= absorbed;
        if (state.run.shieldCast) state.run.shieldCast.absorbed += absorbed;
        const unshielded = incoming - absorbed;
        const damage = Math.min(
          state.run.hp,
          hit.legacy ? unshielded : unshielded > 0 ? Math.max(1, unshielded - stats.armor) : 0,
        );
        state.run.hp = Math.max(0, state.run.hp - damage);
        if (commands && guarded) {
          commands.feedback = perfect
            ? "PERFECT BRACE · counterstrike"
            : "BRACED · damage softened";
          commands.feedbackTime = 1.5;
          events.push({
            type: "command",
            command: "brace",
            result: perfect ? "perfect" : "block",
            target: foe.id,
          });
          if (perfect) {
            damageEnemy(
              state,
              foe,
              stats.damage * (0.8 + rank(state, "thorns") * 0.2),
              "hero",
              events,
            );
            if (finishWave(state, battle, events)) return events;
          }
        }
        if (commands && curse && !guarded) {
          commands.exposed = 4;
          commands.feedback = "EXPOSED · brace the next hit";
          commands.feedbackTime = 2;
        }
        events.push({
          type: "hit",
          side: "hero",
          actor: foe.id,
          target: "hero",
          damage,
          critical: false,
        });
        if (state.run.hp <= 0) {
          state.run.shieldCast = null;
          state.meta.defeats++;
          state.phase = { kind: "defeat", enemy: foe.name };
          events.push({ type: "defeat" });
          return events;
        }
        if (absorbed > 0 && state.run.shield === 0 && state.run.shieldCast) {
          const cast = state.run.shieldCast;
          state.run.shieldCast = null;
          const targets = livingEnemies(battle).slice(0, COMBO_TUNING.shatterTargets);
          const budget = Math.min(
            cast.absorbed * COMBO_TUNING.shatterAbsorbed,
            cast.attack * COMBO_TUNING.shatterAttackCap,
          );
          battle.reactions = targets.map((target) => ({
            target: target.id,
            remaining: COMBO_TUNING.shardFlight,
            damage: budget / targets.length,
            actor: "hero",
            effect: "shatterguard",
          }));
          for (const target of targets)
            events.push({
              type: "combo",
              effect: "shatterguard",
              actor: "hero",
              target: target.id,
            });
        }
        if (rank(state, "thorns")) {
          damageEnemy(state, foe, rank(state, "thorns") * 5, "hero", events);
          if (finishWave(state, battle, events)) return events;
        }
      }
    }
  }
  const front =
    (commands?.focus
      ? livingEnemies(battle).find((foe) => foe.id === commands.focus)
      : undefined) ?? frontTarget(battle);
  if (!front) return events;
  if (battle.heroCooldown <= 0 && !battle.heroHit) {
    const critical = random(state) < stats.crit;
    const execution = front.hp < front.maxHp / 2 ? 1 + rank(state, "execution") * 0.4 : 1;
    battle.heroHit = {
      remaining: 0.22,
      damage: stats.damage * (critical ? 1.8 : 1) * execution,
      source: "hero",
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
  if (systemUnlocked(state, "company") && battle.companionCooldown <= 0 && !battle.companionHit) {
    const mark = battle.mark;
    const marked = mark && livingEnemies(battle).find((foe) => foe.id === mark.target);
    const target = state.meta.loadout.companion === "mira" ? (marked ?? rearTarget(battle)) : front;
    const projectile = state.meta.loadout.companion !== "bram";
    if (target) {
      battle.companionHit = {
        remaining: projectile ? 0.5 : 0.25,
        damage: stats.companionDamage,
        source: state.meta.loadout.companion,
        ...(state.meta.loadout.companion === "mira" && marked && mark
          ? {
              signalMark: mark.serial,
              signalBonus: stats.companionDamage * COMBO_TUNING.signalBonus,
            }
          : {}),
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
  if (systemUnlocked(state, "pets") && battle.petCooldown <= 0 && !battle.petHit) {
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
        source: state.meta.loadout.pet,
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
      const intent = enemyIntent(foe);
      const windup = commands ? intent.windup : projectile ? 0.65 : 0.29;
      foe.pendingHit = {
        remaining: windup,
        damage: foe.damage,
        critical: false,
        ...(commands ? { windup } : {}),
      };
      foe.cooldown = commands
        ? intent.windup +
          foe.interval * (foe.kind === "warden" && foe.hp < foe.maxHp / 2 ? 0.75 : 1)
        : foe.interval;
      events.push({
        type: "swing",
        side: "enemy",
        actor: foe.id,
        target: "hero",
        projectile,
        contact: windup,
      });
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
      (p.rerolls === undefined || number(p.rerolls, 0, 1, true)) &&
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
  if (!validV3State(state)) throw new Error("The existing journey could not be migrated safely.");
  return state;
}
function validPending(value: unknown, maxTime: number) {
  return (
    value === null ||
    (record(value) &&
      number(value.remaining, -0.25, maxTime) &&
      number(value.damage, 0, 10000) &&
      (value.windup === undefined || number(value.windup, 0.29, 2.2)) &&
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
export function validV3State(value: unknown): value is GameState {
  if (!record(value)) return false;
  if (
    !record(value.meta) ||
    (value.meta.experience !== undefined && !validExperience(value.meta.experience)) ||
    (value.meta.progression !== undefined && !validProgression(value.meta.progression))
  )
    return false;
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
  if (!validV3State(state))
    throw new Error("The journey's mission progress could not be initialized safely.");
  return state;
}
export function validV2State(value: unknown): value is Omit<GameState, "quests"> {
  return validCoreState(value, false);
}
function validCoreState(value: unknown, adventure: boolean): value is GameState {
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
    (r.rules !== undefined && r.rules !== 1) ||
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
  const maxHp = heroStats(
    adventure
      ? state
      : { ...state, adventures: undefined, run: { ...state.run, context: undefined } },
  ).hp;
  const length = adventure ? runLength(state) : ENCOUNTERS_PER_CHAPTER;
  const templates = adventure ? adventureEnemies(state) : encounterGroup(r.chapter, r.cleared);
  const legacyCheckpoint =
    !adventure ||
    (state.run.context?.kind === "campaign" &&
      state.run.context.routes.length === 0 &&
      state.run.context.junctionFloor === r.cleared);
  if (r.hp > maxHp || r.shield > maxHp * 0.3) return false;
  if (p.kind === "camp") return r.hp > 0;
  if (p.kind === "travel") return r.hp > 0 && r.cleared < length && number(p.remaining, -0.25, 2);
  if (p.kind === "choice")
    return (
      (p.rerolls === undefined || number(p.rerolls, 0, 1, true)) &&
      r.hp > 0 &&
      r.cleared < length &&
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
      r.cleared < length &&
      typeof p.enemy === "string" &&
      ((legacyCheckpoint && p.enemy === encounter(r.chapter, r.cleared).name) ||
        templates.some((e) => e.name === p.enemy))
    );
  if (p.kind === "route")
    return (
      adventure && r.hp > 0 && [3, 6, 9].includes(p.at as number) && p.at === nextJunction(state)
    );
  if (p.kind === "victory") {
    if (r.cleared !== length || r.hp <= 0) return false;
    const context = state.run.context;
    if (!adventure || context?.kind === "campaign")
      return (
        p.reward === 35 + r.chapter * 15 && p.bonus === undefined && p.bonusStatus === undefined
      );
    if (
      !context ||
      !state.adventures ||
      !["earned", "claimed", "expired"].includes(p.bonusStatus as string)
    )
      return false;
    const reward = activityPreview(state, context.kind, context.tier).reward.gold;
    const earned = p.bonusStatus === "earned";
    return (
      p.bonus === (earned ? reward : 0) &&
      p.reward === (context.kind === "daily" ? 20 : 35) + (earned ? reward : 0) &&
      (!earned ||
        context.period <
          (context.kind === "daily" ? state.adventures.day : state.adventures.week) ||
        state.adventures[context.kind].includes(context.tier))
    );
  }
  if (
    p.kind !== "battle" ||
    r.hp <= 0 ||
    r.cleared >= length ||
    !["legacy", "squad"].includes(p.formation as string) ||
    (p.formation === "legacy" && !legacyCheckpoint) ||
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
      : templates;
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
      !number(e.cooldown, -0.25, r.rules === 1 ? 6 : 5) ||
      !validPending(e.pendingHit, r.rules === 1 ? 2.2 : 0.7)
    )
      return false;
    if (e.hp === 0 && e.pendingHit !== null) return false;
    if (
      record(e.pendingHit) &&
      (e.pendingHit.damage !== template.damage || e.pendingHit.critical !== false)
    )
      return false;
  }
  if (r.rules === 1 && !record(p.commands)) return false;
  if (p.commands !== undefined) {
    const c = p.commands;
    if (
      r.rules !== 1 ||
      !record(c) ||
      !number(c.brace, 0, 0.9) ||
      !number(c.braceCooldown, 0, 3.2) ||
      !number(c.breakthroughCooldown, 0, 6.5) ||
      !number(c.focusTime, 0, 2.4) ||
      !number(c.exposed, 0, 4) ||
      !number(c.feedbackTime, 0, 5) ||
      typeof c.feedback !== "string" ||
      c.feedback.length > 160 ||
      !(c.focus === null || p.enemies.some((enemy) => record(enemy) && enemy.id === c.focus))
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

export function validV4State(value: unknown): value is GameState {
  if (
    !record(value) ||
    !validAdventureLedger(value.adventures) ||
    !record(value.meta) ||
    !record(value.run) ||
    !record(value.phase)
  )
    return false;
  if (
    (value.meta.experience !== undefined && !validExperience(value.meta.experience)) ||
    (value.meta.progression !== undefined && !validProgression(value.meta.progression, true)) ||
    !validQuestLedger(value.quests)
  )
    return false;
  const state = value as unknown as GameState;
  return (
    validRunContext(state) &&
    validCoreState(state, true) &&
    (["companion", "pet", "skill"] as const).every(
      (id) =>
        progressionOf(state).training[id] === 0 ||
        systemUnlocked(
          state,
          { companion: "company", pet: "pets", skill: "skills" }[id] as "company",
        ),
    ) &&
    state.quests.story.completed.every(
      (chapter) =>
        chapter < state.meta.unlockedChapter || (chapter === 5 && state.meta.unlockedChapter === 5),
    )
  );
}
export function migrateV3State(value: unknown): GameState {
  if (!validV3State(value)) throw new Error("The existing version-three journey is invalid.");
  const state = structuredClone(value);
  const legacyLevel = LEVEL_THRESHOLDS.filter((t) => t <= progressionOf(state).renown).length;
  state.adventures = initialAdventures();
  state.adventures.discoveries = {
    mira: legacyLevel >= 2,
    whirlwind: legacyLevel >= 3,
    cinder: legacyLevel >= 4,
    daily: legacyLevel >= 5,
    weekly: legacyLevel >= 6,
    oaths: 0,
  };
  state.run.context = { kind: "campaign", routes: [], junctionFloor: state.run.cleared };
  if (!validV4State(state)) throw new Error("The journey could not be upgraded safely.");
  return state;
}

/** Released v4 rules above intentionally ignore v5 combat fields. Migrations never reset a journey. */
export function migrateV4State(value: unknown): GameState {
  if (!validV4State(value)) throw new Error("The existing version-four journey is invalid.");
  const state = structuredClone(value);
  state.run.shieldCast = null;
  if (state.phase.kind === "battle") {
    const battle = state.phase;
    battle.mark = null;
    battle.markSerial = 0;
    battle.reactions = [];
    for (const enemy of battle.enemies) {
      enemy.braced = false;
      if (enemy.pendingHit) enemy.pendingHit.legacy = true;
    }
    for (const [field, source] of [
      ["heroHit", "hero"],
      ["companionHit", state.meta.loadout.companion],
      ["petHit", state.meta.loadout.pet],
    ] as const) {
      const hit = battle[field];
      if (hit) {
        hit.source = source;
        hit.legacy = true;
      }
    }
  }
  if (!validState(state))
    throw new Error("The journey's combat checkpoint could not be upgraded safely.");
  return state;
}
export function validState(value: unknown): value is GameState {
  if (!validV4State(value)) return false;
  const state = value;
  const cast = state.run.shieldCast;
  if (
    !(
      cast === null ||
      (record(cast) &&
        state.run.shield > 0 &&
        number(cast.absorbed, 0, 3000) &&
        number(cast.attack, 0, heroStats(state).damage) &&
        cast.absorbed + state.run.shield <= heroStats(state).hp * 0.3 + 1e-8)
    )
  )
    return false;
  if (state.phase.kind !== "battle")
    return cast === null || ["travel", "choice", "route"].includes(state.phase.kind);
  const battle = state.phase;
  if (
    !battle.enemies.every(
      (foe) =>
        typeof foe.braced === "boolean" &&
        (!foe.pendingHit || foe.pendingHit.legacy === undefined || foe.pendingHit.legacy === true),
    ) ||
    !number(battle.markSerial, 0, 1e9, true)
  )
    return false;
  const target = (id: unknown) => battle.enemies.some((foe) => foe.id === id);
  if (
    !(
      battle.mark === null ||
      (record(battle.mark) &&
        target(battle.mark.target) &&
        battle.enemies.some((foe) => foe.id === battle.mark?.target && foe.hp > 0) &&
        number(battle.mark.remaining, Number.MIN_VALUE, COMBO_TUNING.markSeconds) &&
        number(battle.mark.serial, 1, battle.markSerial, true))
    )
  )
    return false;
  if (
    !Array.isArray(battle.reactions) ||
    battle.reactions.length > COMBO_TUNING.shatterTargets ||
    !battle.reactions.every(record) ||
    new Set(battle.reactions.map((reaction) => reaction.target)).size !== battle.reactions.length
  )
    return false;
  if (
    battle.reactions.reduce(
      (sum, reaction) =>
        sum +
        (record(reaction) && typeof reaction.damage === "number" ? reaction.damage : Infinity),
      0,
    ) >
    heroStats(state).damage * COMBO_TUNING.shatterAttackCap + 1e-8
  )
    return false;
  if (
    !battle.reactions.every(
      (reaction) =>
        record(reaction) &&
        target(reaction.target) &&
        reaction.actor === "hero" &&
        reaction.effect === "shatterguard" &&
        number(reaction.remaining, Number.MIN_VALUE, COMBO_TUNING.shardFlight) &&
        number(reaction.damage, 0, 10000),
    )
  )
    return false;
  for (const [field, source] of [
    ["heroHit", "hero"],
    ["companionHit", state.meta.loadout.companion],
    ["petHit", state.meta.loadout.pet],
  ] as const) {
    const hit = battle[field];
    if (!hit) continue;
    if (hit.source !== source || (hit.legacy !== undefined && hit.legacy !== true)) return false;
    if (hit.signalMark !== undefined || hit.signalBonus !== undefined) {
      if (
        hit.source !== "mira" ||
        hit.legacy ||
        !number(hit.signalMark, 1, battle.markSerial, true) ||
        hit.signalBonus !== hit.damage * COMBO_TUNING.signalBonus
      )
        return false;
    }
  }
  return true;
}
