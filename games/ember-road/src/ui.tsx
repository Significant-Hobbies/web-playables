import { Badge } from "@saas-maker/ui/components/badge";
import { Button } from "@saas-maker/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@saas-maker/ui/components/card";
import {
  NativeDialog,
  NativeInput,
  NativeProgress,
} from "@saas-maker/ui/components/native-controls";
import { Switch } from "@saas-maker/ui/components/switch";
import {
  ArrowRight,
  BookOpen,
  Check,
  Coins,
  Flame,
  Heart,
  LockKeyhole,
  Pause,
  Play,
  Settings,
  Sparkles,
  Sword,
  Tent,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import {
  type CSSProperties,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import {
  type ActivityKind,
  activityPreview,
  activityUnlocked,
  DAY_MS,
  ROUTES,
  type RouteId,
  routeDetails,
  routeOptions,
  runLength,
  TIERS,
  type Tier,
} from "./adventures";
import type { AudioStatus, SoundCue } from "./audio";
import { CombatCommands, ThreatReadout } from "./combat-ui";
import { discoveriesOnRoad } from "./discoveries";
import { DiscoveryJournal } from "./discovery-ui";
import { EMBER_MARCH, isEmberMarch } from "./ember-march";
import { EmberMarchUi, MarchBuild, MarchChoices, MarchForge, MarchGift } from "./ember-march-ui";
import { type AudioPreferences, experienceOf, isFirstJourney, type Lesson } from "./experience";
import { StoryOpening } from "./experience-ui";
import { type GearId, isFirstLight } from "./first-light";
import { FirstLightUi, FirstLightWardrobe } from "./first-light-ui";
import { GameIcon } from "./game-icon";
import { heroAtlas } from "./hero-art";
import { LoadoutArt } from "./loadout-art";
import {
  ARMORS,
  CHAPTERS,
  COMPANIONS,
  type CommandId,
  ENCOUNTERS_PER_CHAPTER,
  effectiveSkillCooldown,
  type GameState,
  heroStats,
  type Loadout,
  PERKS,
  PETS,
  type Perk,
  type PerkId,
  type Rarity,
  rank,
  SKILLS,
  UPGRADE_CAP,
  type UpgradeId,
  upgradeCost,
  WEAPONS,
  xpNeeded,
} from "./model";
import { synergyStatus } from "./model.ts";
import { OathOffering } from "./oath-offering";
import { OverlaySuspended } from "./overlay";
import { companyPower } from "./power";
import {
  companyLevel,
  levelProgress,
  nextUnlock,
  progressionOf,
  systemUnlocked,
  TRAINING_CAP,
  type TrainingId,
  trainingCost,
} from "./progression";
import { type QuestCard, type QuestScope, questBoard, resetAt } from "./quests";
import { journeyStory } from "./story";

const campWorld = new URL("../assets/living-camp-v1.webp", import.meta.url).href;
const partyAtlas = new URL("../assets/toon-party.png", import.meta.url).href;
const petAtlas = new URL("../assets/toon-pets.png", import.meta.url).href;
const roadAtlas = new URL("../assets/toon-roads.png", import.meta.url).href;
const loadoutDescriptions: Readonly<Record<string, string>> = {
  mira: "Her arrows follow Cinder’s mark. A marked foe takes 50% more arrow damage.",
  bram: "A steadfast front-line fighter. Grants Rook 2 armor while he travels with you.",
  sable: "Calls ember bolts down on every living enemy. A whole formation feels her fury.",
  fox: "Hunts the weakest foe. Surviving targets are marked for Mira’s next arrow for 4 seconds.",
  hound: "Bites the front line and grants Rook 20 maximum health. Loyal through every battle.",
  owl: "Dives at enemy archers, interrupting unbraced attacks. Enemies resist repeated interrupts until they strike.",
};
const loadoutSummaries: Readonly<Record<string, string>> = {
  mira: "Follows Cinder’s mark for a stronger arrow.",
  bram: "Front-line strikes. More armor for Rook.",
  sable: "Ember bolts strike the whole formation.",
  fox: "Hunts the weakest foe. Marks it for Mira.",
  hound: "Front-line bites. More health for Rook.",
  owl: "Dives at archers and interrupts their attacks.",
  whirlwind: "Sweep the front line with your blade.",
  volley: "Pierce the rear line. Interrupt a cast.",
  aegis: "Absorb damage. A broken shield strikes back.",
};
function PerkSymbol({ family }: { family: Perk["family"] }) {
  return family === "steel" ? <Sword /> : family === "vitality" ? <Heart /> : <Flame />;
}

export interface UiSnapshot {
  state: GameState;
  loaded: boolean;
  saveMessage: string;
  saveWarning: boolean;
  paused: boolean;
  overlaySuspended: boolean;
  motionPaused: boolean;
  presentationPaused: boolean;
  audioStatus: AudioStatus;
  audioPermitted: boolean;
  audioControls: boolean;
  reducedMotion: boolean;
  decisionReady: boolean;
  note: string;
  web: boolean;
}
export interface UiActions {
  canvas(canvas: HTMLCanvasElement): void;
  stage(camp: boolean): void;
  inspect(open: boolean): void;
  pause(): void;
  start(chapter: number): void;
  startFirstLight(returnChapter?: number): boolean;
  startMarch(returnChapter?: number): boolean;
  selectMarchCamp(selected: boolean): void;
  marchGift(id: PerkId, offerId: string): void;
  equipGear(id: GearId | null): void;
  continueLoot(): void;
  route(path: RouteId): void;
  adventure(
    kind: ActivityKind,
    tier: Tier,
    period: number,
    id: number,
    returnChapter: number,
  ): boolean;
  choose(id: PerkId, offerId?: string): void;
  skip(offerId?: string): void;
  reroll(offerId?: string): void;
  train(id: TrainingId): void;
  equip<K extends keyof Loadout>(slot: K, id: Loadout[K]): void;
  upgrade(id: UpgradeId): void;
  retreat(): void;
  camp(): void;
  command(command: CommandId): void;
  skill(): void;
  refreshMissions(): void;
  claim(scope: QuestScope, id: string, period: number | null): void;
  reduce(value: boolean): void;
  unlockAudio(): void;
  uiSound(cue?: SoundCue): void;
  finishIntro(): void;
  toggleSound(): void;
  learn(lesson: Lesson): void;
  skipGuidance(): void;
  audioPreference(key: keyof AudioPreferences, value: boolean | number): void;
}
type Section = "Camp" | "Companions" | "Pets" | "Equipment" | "Skills" | "Journey";
const rarityNames: Record<Rarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};
function RarityBadge({ rarity }: { rarity: Rarity }) {
  return (
    <Badge variant="outline" className={`rarity rarity-${rarity}`}>
      {rarityNames[rarity]}
    </Badge>
  );
}
function Modal({
  open,
  title,
  children,
  close,
  className = "",
  heading = true,
  initialFocus,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  close?: () => void;
  className?: string;
  heading?: boolean;
  initialFocus?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const suspended = useContext(OverlaySuspended);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !suspended && !node.open) {
      node.showModal();
      if (initialFocus)
        node.querySelector<HTMLElement>(initialFocus)?.focus({ preventScroll: true });
    }
    if ((!open || suspended) && node.open) node.close();
  }, [open, suspended, initialFocus]);
  return (
    <NativeDialog
      ref={ref}
      aria-label={title}
      className={`game-dialog ${className}`}
      onCancel={(event) => {
        event.preventDefault();
        close?.();
      }}
    >
      {heading && (
        <div className="dialog-heading">
          <h2>{title}</h2>
          {close && (
            <Button variant="ghost" size="icon" aria-label={`Close ${title}`} onClick={close}>
              <X />
            </Button>
          )}
        </div>
      )}
      {children}
    </NativeDialog>
  );
}
function StatList({ state }: { state: GameState }) {
  const s = heroStats(state);
  const power = companyPower(state);
  const rows = [
    ["Health", `${Math.ceil(state.run.hp)} / ${s.hp}`],
    ["Damage", s.damage.toFixed(1)],
    ["Attacks / sec", (1 / s.interval).toFixed(2)],
    ["Armor", s.armor],
    ["Critical chance", `${Math.round(s.crit * 100)}%`],
    ["Lifesteal", `${Math.round(s.lifesteal * 100)}%`],
    ["Ranged resistance", `${Math.round(s.rangedResistance * 100)}%`],
    ["Front-line cleave", `${Math.round(s.cleave * 100)}%`],
    ["Rear-line pierce", `${Math.round(s.pierce * 100)}%`],
    ["Companion damage", `${Number(s.companionDamage.toFixed(1))} / ${s.companionInterval}s`],
    ["Pet damage", `${Number(s.petDamage.toFixed(1))} / ${s.petInterval}s`],
    ["Current shield", Math.ceil(state.run.shield)],
  ];
  return (
    <div className="character-sheet">
      <div className="power-summary">
        <span className="sheet-rook" aria-hidden="true" />
        <div>
          <span className="sheet-kicker">ROOK & COMPANY</span>
          <h3>
            {power.total.toLocaleString()} <small>POWER</small>
          </h3>
          <p>A rating of your whole build, including this journey’s oaths.</p>
        </div>
      </div>
      <div className="power-breakdown">
        {(
          [
            ["Offense", power.offense],
            ["Defense", power.defense],
            ["Company", power.company],
            ["Skill", power.technique],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <b>{value}</b>
            <NativeProgress aria-label={`${label} contribution`} value={value} max={power.total} />
          </div>
        ))}
      </div>
      <p className="power-explainer">
        Power compares builds. It is not damage per hit; lost health and skill cooldowns do not
        lower it.
      </p>
      <h3 className="sheet-section-title">Combat attributes</h3>
      <dl className="stats-grid">
        {rows.map(([name, value]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
function Powers({ state }: { state: GameState }) {
  const skill = SKILLS.find((s) => s.id === state.meta.loadout.skill)!;
  const powers = PERKS.filter((p) => rank(state, p.id) > 0);
  return (
    <div className="powers-list">
      {synergyStatus(state)
        .filter((rule) => rule.revealed)
        .map((rule) => (
          <div className="power-row" key={rule.id}>
            <div>
              <strong>
                {rule.name} · {rule.active ? "Active" : "Build combo"}
              </strong>
              <p>{rule.description}</p>
              <small>{rule.status}</small>
            </div>
          </div>
        ))}
      {systemUnlocked(state, "skills") && (
        <div className="power-row">
          <LoadoutArt slot="skill" id={skill.id} />
          <div>
            <strong>{skill.name}</strong>
            <p>{skill.description}</p>
            <small>
              Equipped skill ·{" "}
              {state.run.skillCooldown > 0
                ? `${state.run.skillCooldown.toFixed(1)}s remaining`
                : "Ready in combat"}
            </small>
          </div>
        </div>
      )}
      <h3>Oaths on this journey</h3>
      {powers.length ? (
        powers.map((p) => (
          <div className="power-row" key={p.id}>
            <PerkSymbol family={p.family} />
            <div>
              <strong>
                {p.title}{" "}
                <small>
                  Rank {rank(state, p.id)} / {p.max}
                </small>
              </strong>
              <p>{p.description}</p>
              <RarityBadge rarity={p.rarity} />
            </div>
          </div>
        ))
      ) : (
        <p className="muted">No oaths yet. Defeat a wave to earn your first choice.</p>
      )}
    </div>
  );
}
function PowerChip({
  children,
  description,
  label,
  className,
}: {
  children: ReactNode;
  description: ReactNode;
  label: string;
  className: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLButtonElement>(null);
  const lastPointer = useRef("mouse");
  const id = useId();
  function show() {
    const p = panel.current,
      b = anchor.current;
    if (!p || !b) return;
    for (const other of document.querySelectorAll<HTMLElement>(".power-tooltip:popover-open"))
      if (other !== p) other.hidePopover();
    if (!p.matches(":popover-open")) p.showPopover();
    const rect = b.getBoundingClientRect();
    const size = p.getBoundingClientRect();
    p.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - size.width - 12))}px`;
    const above = rect.top - size.height - 10;
    p.style.top = `${above >= 12 ? above : Math.min(rect.bottom + 10, window.innerHeight - size.height - 12)}px`;
  }
  function hide() {
    if (panel.current?.matches(":popover-open")) panel.current.hidePopover();
  }
  return (
    <>
      <Button
        ref={anchor}
        variant="ghost"
        className={`power-chip ${className}`}
        aria-label={label}
        aria-describedby={id}
        onPointerDown={(event) => {
          lastPointer.current = event.pointerType;
        }}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") show();
        }}
        onPointerLeave={hide}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) show();
        }}
        onBlur={hide}
        onKeyDown={(event) => {
          if (event.key === "Escape" && panel.current?.matches(":popover-open")) {
            event.preventDefault();
            event.stopPropagation();
            hide();
          }
        }}
        onClick={(event) => {
          if (
            (event.detail === 0 || lastPointer.current === "touch") &&
            panel.current?.matches(":popover-open")
          )
            hide();
          else show();
        }}
      >
        {children}
      </Button>
      <Card ref={panel} id={id} popover="manual" role="tooltip" className="power-tooltip">
        {description}
      </Card>
    </>
  );
}
function PowerBelt({ state }: { state: GameState }) {
  const skill = SKILLS.find((s) => s.id === state.meta.loadout.skill)!;
  const powers = PERKS.filter((p) => rank(state, p.id) > 0);
  return (
    <section className="powers-belt" aria-label="Current powers" data-powers-belt="">
      <span className="powers-belt-label">POWERS</span>
      {systemUnlocked(state, "skills") && (
        <PowerChip
          className="active-power"
          label={`${skill.name}, active skill`}
          description={
            <>
              <strong>{skill.name} · Active</strong>
              <p>{skill.description}</p>
              <small>
                Skill level {progressionOf(state).training.skill + 1} ·{" "}
                {effectiveSkillCooldown(state).toFixed(1)}s cooldown
              </small>
            </>
          }
        >
          <Zap />
          <span>{skill.name}</span>
          <b>Q</b>
        </PowerChip>
      )}
      {powers.map((p) => (
        <PowerChip
          key={p.id}
          className={`rarity-${p.rarity}`}
          label={`${p.title}, rank ${rank(state, p.id)}`}
          description={
            <>
              <strong>
                {p.title} · {rarityNames[p.rarity]}
              </strong>
              <p>{p.description}</p>
              <small>
                Rank {rank(state, p.id)} / {p.max} · This journey
              </small>
            </>
          }
        >
          <PerkSymbol family={p.family} />
          <span>{p.title}</span>
          <b>{rank(state, p.id)}</b>
        </PowerChip>
      ))}
      {synergyStatus(state)
        .filter((rule) => rule.revealed)
        .map((rule) => (
          <PowerChip
            key={rule.id}
            className={`synergy-${rule.id} ${rule.active ? "synergy-active" : "synergy-locked"}`}
            label={`${rule.name}, ${rule.status}`}
            description={
              <>
                <strong>
                  {rule.name} · {rule.active ? "Active combo" : "Build combo"}
                </strong>
                <p>{rule.description}</p>
                <small>{rule.status}</small>
              </>
            }
          >
            <Zap />
            <span>{rule.name}</span>
            <b>{rule.badge}</b>
          </PowerChip>
        ))}
      {!powers.length && (
        <span className="powers-empty">Defeat waves to discover your first oath.</span>
      )}
    </section>
  );
}
function Training({
  state,
  id,
  actions,
}: {
  state: GameState;
  id: TrainingId;
  actions: UiActions;
}) {
  const p = progressionOf(state),
    level = p.training[id] + 1,
    cost = trainingCost(state, id);
  const currency = id === "skill" ? "Embers" : "Trailmarks";
  const balance = id === "skill" ? p.embers : p.trailmarks;
  const capped = p.training[id] >= TRAINING_CAP;
  const levelLocked = companyLevel(state) < p.training[id] + 2;
  return (
    <section className="training-panel" aria-label={`${id} training`}>
      <div>
        <span className="sheet-kicker">PERMANENT TRAINING</span>
        <h3>
          Level {level} / {TRAINING_CAP + 1}
        </h3>
        <p>
          {id === "skill"
            ? "Each level reduces active skill cooldown by 8%."
            : `Each level improves ${id === "companion" ? "companion damage by 15%" : "pet damage by 18%"}.`}
        </p>
        <small>
          {balance} {currency} kept ·{" "}
          {id === "skill" ? "Earn 4 from each chapter victory." : "Earn 1 from each cleared wave."}
        </small>
      </div>
      <Button
        data-train={id}
        disabled={state.phase.kind !== "camp" || capped || levelLocked || balance < cost}
        onClick={() => actions.train(id)}
      >
        {capped
          ? "Fully trained"
          : state.phase.kind !== "camp"
            ? "Train at camp"
            : levelLocked
              ? `Company level ${p.training[id] + 2}`
              : `Train · ${cost} ${currency}`}
      </Button>
    </section>
  );
}
function GameUi({ snapshot: v, actions: a }: { snapshot: UiSnapshot; actions: UiActions }) {
  const { state } = v;
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current) a.canvas(canvas.current);
  }, [a]);
  const [replayIntro, setReplayIntro] = useState(false);
  const [firstLightDismissed, setFirstLightDismissed] = useState(false);
  const [firstLightWardrobe, setFirstLightWardrobe] = useState(false);
  const [marchPreview, setMarchPreview] = useState(() =>
    new URLSearchParams(location.search).has("march"),
  );
  const [marchDismissed, setMarchDismissed] = useState(false);
  const [marchForgeOpen, setMarchForgeOpen] = useState(false);
  const explicitOtherRoad =
    new URLSearchParams(location.search).has("campaign") ||
    new URLSearchParams(location.search).has("first-light");
  const marchFocused =
    isEmberMarch(state) ||
    (state.phase.kind === "camp" &&
      (marchPreview || (!explicitOtherRoad && state.meta.emberMarch?.selected === true)) &&
      !marchDismissed);
  const marchContext = state.run.context?.kind === "ember-march" ? state.run.context : null;
  const firstLightFocused =
    !marchFocused &&
    (isFirstLight(state) ||
      (state.phase.kind === "camp" &&
        !firstLightDismissed &&
        !new URLSearchParams(location.search).has("campaign") &&
        ((state.meta.unlockedChapter === 1 && !state.meta.firstLight?.cleared) ||
          new URLSearchParams(location.search).has("first-light"))));
  const experience = experienceOf(state);
  const level = levelProgress(state);
  const progression = progressionOf(state);
  const upcoming = nextUnlock(state);
  const activity =
    state.run.context?.kind === "daily" || state.run.context?.kind === "hunt"
      ? activityPreview(state, state.run.context.kind, state.run.context.tier, state.run.context)
      : null;
  const discoveries = state.adventures?.discoveries;
  const miraFound = discoveries?.mira ?? false;
  const cinderFound = discoveries?.cinder ?? false;
  const knownCompany = useRef<{ mira: boolean; cinder: boolean } | null>(null);
  const [newDiscovery, setNewDiscovery] = useState<"mira" | "cinder" | null>(null);
  useEffect(() => {
    if (!v.loaded) return;
    const before = knownCompany.current;
    if (before && !before.mira && miraFound) setNewDiscovery("mira");
    else if (before && !before.cinder && cinderFound) setNewDiscovery("cinder");
    knownCompany.current = { mira: miraFound, cinder: cinderFound };
  }, [v.loaded, miraFound, cinderFound]);
  const companyReady = systemUnlocked(state, "company");
  const skillReady = systemUnlocked(state, "skills");
  const petsReady = systemUnlocked(state, "pets");
  const dailyReady = systemUnlocked(state, "daily");
  const weeklyReady = systemUnlocked(state, "weekly");
  const previousLevel = useRef<number | null>(null);
  const [unlockMessage, setUnlockMessage] = useState<{ title: string; until: number } | null>(null);
  useEffect(() => {
    if (!v.loaded) return;
    const before = previousLevel.current;
    previousLevel.current = level.level;
    if (!["travel", "battle", "choice"].includes(state.phase.kind)) {
      setUnlockMessage(null);
      return;
    }
    if (before !== null && level.level > before) {
      setUnlockMessage({
        title: `Company level ${level.level} · +2 damage, +5 health`,
        until: state.run.time + 6,
      });
    }
  }, [v.loaded, level.level, state.run.time, state.phase.kind]);
  const [tip, setTip] = useState<Lesson | null>(null);
  const showPrologue =
    v.loaded && ((!experience.introSeen && !firstLightFocused && !marchFocused) || replayIntro);
  const [section, setSection] = useState<Section>("Camp");
  const [inspectedLoadout, setInspectedLoadout] = useState<Partial<Loadout>>({});
  const [equipmentTab, setEquipmentTab] = useState<"weapon" | "armor" | "forge">("weapon");
  const [missionTab, setMissionTab] = useState<QuestScope | "discoveries">("story");
  const [campOpen, setCampOpen] = useState(false);
  const [adventureOpen, setAdventureOpen] = useState(false);
  const [adventureKind, setAdventureKind] = useState<ActivityKind>("daily");
  const [adventureTier, setAdventureTier] = useState<Tier>(1);
  const offer = activityPreview(state, adventureKind, adventureTier);
  const eventReset = new Date(
    (offer.kind === "daily" ? offer.period + 1 : offer.period * 7 + 4) * DAY_MS,
  ).toLocaleDateString("en", { day: "numeric", month: "short", timeZone: "UTC" });
  const [settings, setSettings] = useState(false);
  const [detail, setDetail] = useState<"stats" | "powers" | null>(null);
  const [retreat, setRetreat] = useState(false);
  const [retreatFromForge, setRetreatFromForge] = useState(false);
  function cancelRetreat() {
    setRetreat(false);
    if (retreatFromForge) setMarchForgeOpen(true);
    setRetreatFromForge(false);
  }
  const [introChapter, setIntroChapter] = useState<number | null>(null);
  const [chapter, setChapter] = useState(state.run.chapter);
  const inCamp = state.phase.kind === "camp";
  const dashboard = inCamp || campOpen;
  const hubChapter = inCamp ? Math.min(chapter, state.meta.unlockedChapter) : state.run.chapter;
  useEffect(() => a.stage(dashboard), [a, dashboard]);
  const active = state.phase.kind === "travel" || state.phase.kind === "battle";
  const company = COMPANIONS.find((c) => c.id === state.meta.loadout.companion)!;
  const pet = PETS.find((p) => p.id === state.meta.loadout.pet)!;
  const weapon = WEAPONS.find((w) => w.id === state.meta.loadout.weapon)!;
  const armor = ARMORS.find((x) => x.id === state.meta.loadout.armor)!;
  const skill = SKILLS.find((s) => s.id === state.meta.loadout.skill)!;
  const stats = heroStats(state);
  const power = companyPower(state);
  const place = CHAPTERS[state.run.chapter - 1]!;
  const story = journeyStory(state.run.chapter);
  const missions = questBoard(state.quests);
  const readyRewards = missions.story.filter((q) => q.ready).length;
  useEffect(
    () =>
      a.inspect(
        v.loaded &&
          (showPrologue ||
            settings ||
            firstLightWardrobe ||
            marchForgeOpen ||
            adventureOpen ||
            detail !== null ||
            campOpen ||
            retreat ||
            introChapter !== null ||
            newDiscovery !== null ||
            section !== "Camp"),
      ),
    [
      a,
      v.loaded,
      settings,
      firstLightWardrobe,
      marchForgeOpen,
      detail,
      campOpen,
      retreat,
      introChapter,
      newDiscovery,
      section,
      showPrologue,
      adventureOpen,
    ],
  );
  useEffect(() => {
    if (inCamp) {
      setCampOpen(false);
      setChapter(state.run.chapter);
    }
  }, [inCamp, state.run.chapter]);
  useEffect(() => {
    if (
      !v.loaded ||
      firstLightFocused ||
      marchFocused ||
      showPrologue ||
      tip ||
      settings ||
      detail ||
      section !== "Camp"
    )
      return;
    const lesson: Lesson | null =
      !dashboard && state.phase.kind === "battle"
        ? !experience.lessons.battle
          ? "battle"
          : skillReady && !experience.lessons.skill
            ? "skill"
            : null
        : !dashboard && state.phase.kind === "choice" && !experience.lessons.oath
          ? "oath"
          : dashboard && state.meta.earnedGold > 0 && !experience.lessons.camp
            ? "camp"
            : null;
    if (lesson) {
      setTip(lesson);
      a.learn(lesson);
    }
  }, [
    a,
    v.loaded,
    showPrologue,
    firstLightFocused,
    marchFocused,
    tip,
    settings,
    detail,
    section,
    dashboard,
    state.phase.kind,
    state.meta.earnedGold,
    experience.lessons,
    skillReady,
  ]);
  useEffect(() => {
    if (
      ((tip === "battle" || tip === "skill") && state.phase.kind !== "battle") ||
      (tip === "oath" && state.phase.kind !== "choice") ||
      (tip === "camp" && !dashboard) ||
      (tip === "skill" && state.run.skillCooldown > 0)
    )
      setTip(null);
  }, [tip, state.phase.kind, dashboard, state.run.skillCooldown]);
  const go = (next: Section) => {
    if (next === "Journey") a.refreshMissions();
    setTip(null);
    setInspectedLoadout({});
    setSection(next);
    if (!inCamp) setCampOpen(true);
  };
  function dismissTip() {
    setTip(null);
  }
  function skipTips() {
    setTip(null);
    a.skipGuidance();
  }
  function launch() {
    setIntroChapter(hubChapter);
  }
  function selection<K extends keyof Loadout>(
    slot: K,
    items: readonly { id: Loadout[K]; name: string; description: string; chapter: number }[],
  ) {
    const location = slot === "companion" || slot === "pet" || slot === "skill";
    const equipped = items.find(
      (item) =>
        item.id === ((location ? inspectedLoadout[slot] : undefined) ?? state.meta.loadout[slot]),
    )!;
    const equippedIndex = items.indexOf(equipped);
    const previewEquipped = equipped.id === state.meta.loadout[slot];
    const previewLocked = equipped.chapter > state.meta.unlockedChapter;
    const role = (index: number) =>
      slot === "companion"
        ? COMPANIONS[index]!.role
        : slot === "pet"
          ? PETS[index]!.kind
          : slot === "weapon"
            ? ["Balanced blade", "Heavy blade", "Piercing reach"][index]
            : slot === "armor"
              ? ["Balanced protection", "Heavy protection", "Evasive protection"][index]
              : ["Front-line sweep", "Rear-line strike", "Company defense"][index];
    return (
      <div className={`loadout-workbench workbench-${slot}`}>
        <aside
          className="loadout-showcase"
          aria-label={`${location ? "Inspect" : "Equipped"} ${slot}`}
        >
          {location && (
            <span className="location-kicker">
              {slot === "companion"
                ? "THE COMPANY PAVILION"
                : slot === "pet"
                  ? "THE WILDWOOD REFUGE"
                  : "THE OLD TRAINING GROUND"}
            </span>
          )}
          <span className="showcase-label">
            {previewLocked ? (
              <LockKeyhole size={15} />
            ) : previewEquipped ? (
              <Check size={15} />
            ) : (
              <Sparkles size={15} />
            )}
            {previewLocked
              ? `CHAPTER ${equipped.chapter}`
              : previewEquipped
                ? "EQUIPPED"
                : "PREVIEW"}
          </span>
          <div
            className={`showcase-art ${previewLocked ? "showcase-locked" : ""}`}
            key={equipped.id}
          >
            {slot === "companion" || slot === "pet" ? (
              <span
                className="showcase-character"
                role="img"
                aria-label={`${equipped.name} at camp`}
                style={{
                  backgroundImage: `url("${slot === "pet" ? petAtlas : partyAtlas}")`,
                  backgroundSize: `400% ${slot === "pet" ? 300 : 400}%`,
                  backgroundPosition: `0 ${(equippedIndex / (slot === "pet" ? 2 : 3)) * 100}%`,
                }}
              />
            ) : (
              <LoadoutArt slot={slot} id={equipped.id} />
            )}
          </div>
          {location && <span className="showcase-role">{role(equippedIndex)}</span>}
          <h3>{equipped.name}</h3>
          <p>
            {location
              ? (loadoutDescriptions[equipped.id] ?? equipped.description)
              : equipped.description}
          </p>
          {location && (
            <p className="showcase-flavor">
              {slot === "companion"
                ? [
                    "“You carry the lantern. I’ll watch the treeline.”",
                    "“Stay behind my shield. We get home together.”",
                    "“Even the storm remembers how to be a spark.”",
                  ][equippedIndex]
                : slot === "pet"
                  ? [
                      "A small spark, a fierce heart. The road feels less lonely.",
                      "A steady shadow at your heel, wherever the trail leads.",
                      "Two bright eyes keep watch while the company sleeps.",
                    ][equippedIndex]
                  : "One practiced move can turn the whole battle."}
            </p>
          )}
          <span className="showcase-power">
            <GameIcon kind="battle" />
            <b>{power.total.toLocaleString()}</b>
            <small>COMPANY POWER</small>
          </span>
        </aside>
        <section
          className="selection-grid"
          aria-label={location ? `Choose a ${slot} to inspect` : undefined}
        >
          {location && (
            <div className="roster-heading">
              <span>{slot === "skill" ? "PREPARE YOUR ART" : "TRAVEL TOGETHER"}</span>
              <b>
                {items.filter((item) => item.chapter <= state.meta.unlockedChapter).length} /{" "}
                {items.length} available
              </b>
            </div>
          )}
          {items.map((item, index) => {
            const locked = item.chapter > state.meta.unlockedChapter,
              selected = state.meta.loadout[slot] === item.id;
            return (
              <Card
                key={item.id}
                className={`selection-card slot-${slot} item-${index} ${selected ? "selected" : ""} ${locked ? "is-locked" : ""} ${equipped.id === item.id ? "is-inspected" : ""}`}
              >
                <CardHeader>
                  <div className="selection-top">
                    <Badge variant="outline">
                      {locked ? (
                        <>
                          <LockKeyhole /> Chapter {item.chapter}
                        </>
                      ) : selected ? (
                        <>
                          <Check /> Equipped
                        </>
                      ) : (
                        "Available"
                      )}
                    </Badge>
                  </div>
                  <div className="item-stage">
                    <span className="stage-ring" />
                    {slot === "companion" || slot === "pet" ? (
                      <span
                        role="img"
                        aria-label={`${item.name} portrait`}
                        className="loadout-portrait"
                        style={{
                          backgroundImage: `url("${slot === "pet" ? petAtlas : partyAtlas}")`,
                          backgroundSize: `400% ${slot === "pet" ? 300 : 400}%`,
                          backgroundPosition: `0 ${(index / (slot === "pet" ? 2 : 3)) * 100}%`,
                        }}
                      />
                    ) : (
                      <LoadoutArt slot={slot} id={item.id} />
                    )}
                    {locked && (
                      <span className="item-lock">
                        <LockKeyhole /> Chapter {item.chapter}
                      </span>
                    )}
                  </div>
                  {location && (
                    <Button
                      className="inspect-loadout"
                      variant="ghost"
                      aria-label={`Inspect ${item.name}`}
                      aria-pressed={equipped.id === item.id}
                      onClick={() =>
                        setInspectedLoadout((before) => ({ ...before, [slot]: item.id }))
                      }
                    />
                  )}
                  <span className="item-role">{role(index)}</span>
                  <CardTitle>{item.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="item-facts">
                    {(() => {
                      const preview = {
                        ...state,
                        meta: {
                          ...state.meta,
                          loadout: { ...state.meta.loadout, [slot]: item.id },
                        },
                      };
                      const attributes = heroStats(preview);
                      const facts =
                        slot === "weapon"
                          ? [
                              `${attributes.damage.toFixed(1)} damage`,
                              `${(1 / attributes.interval).toFixed(2)} hits / sec`,
                            ]
                          : slot === "armor"
                            ? [`${attributes.hp} health`, `${attributes.armor} armor`]
                            : slot === "companion"
                              ? [
                                  `${Number(attributes.companionDamage.toFixed(1))} damage`,
                                  `${attributes.companionInterval}s attack`,
                                ]
                              : slot === "pet"
                                ? [
                                    `${Number(attributes.petDamage.toFixed(1))} damage`,
                                    `${attributes.petInterval}s attack`,
                                  ]
                                : [
                                    `${effectiveSkillCooldown(state, SKILLS[index]!.id).toFixed(1)}s cooldown`,
                                    "Q · active",
                                  ];
                      return facts.map((fact) => <span key={fact}>{fact}</span>);
                    })()}
                  </div>
                  <p>
                    {location ? (loadoutSummaries[item.id] ?? item.description) : item.description}
                  </p>
                  <span className="item-power">
                    Build power{" "}
                    <b>
                      {companyPower({
                        ...state,
                        meta: {
                          ...state.meta,
                          loadout: { ...state.meta.loadout, [slot]: item.id },
                        },
                      }).total.toLocaleString()}
                    </b>
                  </span>
                  <Button
                    variant={selected ? "secondary" : "outline"}
                    data-equip={`${slot}:${item.id}`}
                    disabled={locked || selected || !inCamp}
                    onClick={() => {
                      if (location)
                        setInspectedLoadout((before) => ({ ...before, [slot]: item.id }));
                      a.equip(slot, item.id);
                    }}
                  >
                    {selected
                      ? "Equipped"
                      : locked
                        ? `Unlock in chapter ${item.chapter}`
                        : !inCamp
                          ? "Change at camp"
                          : "Equip"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    );
  }
  const saveWarning = v.saveWarning && (
    <p className="save-warning" data-save-warning role="status">
      {v.saveMessage}
    </p>
  );
  const journeyShortcuts = (
    <>
      <Button
        variant="ghost"
        onClick={() => {
          setSettings(false);
          setMarchPreview(true);
          setMarchDismissed(false);
          a.selectMarchCamp(true);
          a.finishIntro();
        }}
      >
        Ember March
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          setSettings(false);
          setFirstLightDismissed(false);
          a.finishIntro();
          a.startFirstLight(hubChapter);
        }}
      >
        First Light
      </Button>
      {state.meta.gear?.owned.includes("sunfang") && (
        <Button
          variant="ghost"
          onClick={() => {
            setSettings(false);
            setFirstLightWardrobe(true);
          }}
        >
          Your blade
        </Button>
      )}
    </>
  );
  return (
    <div
      data-company-level={level.level}
      style={{ "--hero-atlas": `url("${heroAtlas(state)}")` } as CSSProperties}
      className={`app-shell toon-shell ${firstLightFocused ? "is-first-light" : ""} ${marchFocused ? "is-ember-march" : ""} ${dashboard ? "is-dashboard" : "is-road"} ${v.motionPaused ? "motion-paused" : ""} ${v.presentationPaused ? "presentation-paused" : ""} ${v.reducedMotion ? "reduced-motion" : ""}`}
    >
      <header className="game-topbar">
        <Button
          className="hero-profile"
          variant="ghost"
          aria-label="Show current stats"
          onClick={() => setDetail("stats")}
        >
          <span className="toon-portrait" />
          <span>
            <strong>ROOK</strong>
            <small>Company Lv. {level.level}</small>
          </span>
        </Button>
        <Button
          variant="ghost"
          className="damage-score"
          aria-label={`Company power ${power.total}`}
          onClick={() => setDetail("stats")}
        >
          <GameIcon kind="battle" />
          <b>{power.total.toLocaleString()}</b>
          <small>POWER</small>
        </Button>
        <span className="game-wordmark">EMBER ROAD</span>
        {inCamp && (
          <nav className="wide-journey-shortcuts" aria-label="Other journeys">
            {journeyShortcuts}
          </nav>
        )}
        <div className="header-actions">
          <span className="gold">
            <GameIcon kind="gold" />
            <b id="gold">{state.meta.gold}</b>
          </span>
          {companyReady && (
            <span
              className="currency trailmarks"
              title="Trailmarks · Earned from cleared waves. Train companions and pets."
            >
              <Tent />
              <b data-currency="trailmarks">{progression.trailmarks}</b>
            </span>
          )}
          {skillReady && (
            <span
              className="currency embers"
              title="Embers · Earned from chapter victories. Train active skills."
            >
              <Flame />
              <b data-currency="embers">{progression.embers}</b>
            </span>
          )}
          {v.web && (
            <span
              data-playables-account-slot=""
              style={
                { "--playables-account-avatar": `url("${heroAtlas(state)}")` } as CSSProperties
              }
            />
          )}
          {v.audioControls && (
            <Button
              className="sound-toggle"
              variant="ghost"
              size="icon"
              aria-label="Open sound settings"
              onClick={() => setSettings(true)}
            >
              {experience.audio.musicEnabled || experience.audio.effectsEnabled ? (
                <Volume2 />
              ) : (
                <VolumeX />
              )}
            </Button>
          )}
          <Button
            id="settings-toggle"
            variant="ghost"
            size="icon"
            aria-label="Open game settings"
            onClick={() => setSettings(true)}
          >
            <Settings />
          </Button>
        </div>
      </header>
      <div className="workspace">
        <main
          data-section={section}
          className={`main-content ${dashboard ? "dashboard" : "battle-layout"}`}
        >
          <div className={`world-stage ${dashboard ? "camp-canvas" : "combat-canvas"}`}>
            <canvas
              id="world"
              ref={canvas}
              aria-label={`Rook${companyReady && !firstLightFocused ? " and his companion" : ""}${petsReady && !firstLightFocused ? " with his pet" : ""} on the old road`}
              role="img"
            />
          </div>
          {firstLightFocused && (
            <FirstLightUi
              state={state}
              loaded={v.loaded}
              settled={v.decisionReady}
              paused={v.paused}
              sound={experience.audio.musicEnabled || experience.audio.effectsEnabled}
              audioControls={v.audioControls}
              reducedMotion={v.reducedMotion}
              saveWarning={v.saveWarning ? v.saveMessage : null}
              start={() => {
                a.finishIntro();
                setTip(null);
                a.startFirstLight(hubChapter);
              }}
              equip={() => {
                a.equipGear("sunfang");
                a.continueLoot();
              }}
              continueLoot={() => a.continueLoot()}
              camp={() => {
                a.camp();
                setFirstLightDismissed(false);
              }}
              campaign={() => {
                a.finishIntro();
                setFirstLightDismissed(true);
                setFirstLightWardrobe(false);
              }}
              pause={() => a.pause()}
              settings={() => setSettings(true)}
              toggleSound={() => a.toggleSound()}
              wardrobe={() => setFirstLightWardrobe(true)}
              reveal={() => a.uiSound("claim")}
            />
          )}
          {marchFocused && (
            <EmberMarchUi
              state={state}
              loaded={v.loaded}
              paused={v.paused}
              audioControls={v.audioControls}
              sound={experience.audio.musicEnabled || experience.audio.effectsEnabled}
              atCamp={inCamp}
              kills={marchContext?.kills ?? 0}
              total={EMBER_MARCH.total}
              earnedGold={marchContext?.earnedGold ?? 0}
              firstClear={state.phase.kind === "victory" && state.phase.bonusStatus === "earned"}
              saveWarning={v.saveWarning ? v.saveMessage : null}
              start={() => {
                a.finishIntro();
                setTip(null);
                a.startMarch(hubChapter);
              }}
              pause={a.pause}
              settings={() => setSettings(true)}
              soundToggle={a.toggleSound}
              equipment={() => setMarchForgeOpen(true)}
              inspectBuild={() => setDetail("stats")}
              retreat={() => setRetreat(true)}
              otherRoads={() => {
                setMarchDismissed(true);
                setMarchPreview(false);
                a.selectMarchCamp(false);
                setFirstLightDismissed(true);
                a.finishIntro();
              }}
              finish={() => {
                setMarchPreview(true);
                setMarchDismissed(false);
                a.camp();
                setMarchForgeOpen(true);
              }}
            />
          )}
          {dashboard && (
            <section className="chapter-hub living-camp" aria-label="Chapter selection">
              <img
                className="camp-world"
                src={campWorld}
                alt="A woodland camp with a glowing forge, company tent, training ground and a path through the old gate"
              />
              <div className="camp-shade" aria-hidden="true" />
              <div className="camp-identity" aria-hidden="true">
                <span>THE LAST LIGHT</span>
                <strong>Wayfarer’s camp</strong>
                <small>A place to rest. A reason to return.</small>
              </div>
              <Button
                className="camp-renown"
                variant="ghost"
                aria-label="Missions and quests"
                onClick={() => {
                  setMissionTab(dailyReady ? "daily" : "story");
                  go("Journey");
                }}
              >
                <GameIcon kind="quests" />
                <span>
                  <strong>COMPANY LEVEL {level.level}</strong>
                  <small>{upcoming ? upcoming.title : "A seasoned company"}</small>
                  <NativeProgress
                    max={level.needed ?? 1}
                    value={level.needed === null ? 1 : level.current}
                    aria-label="Company renown"
                  />
                </span>
                <b>{level.needed === null ? "MAX" : `${level.current}/${level.needed}`}</b>
              </Button>
              <nav className="game-dock camp-locations" aria-label="Camp sections">
                <Button
                  className="camp-sign sign-forge"
                  variant="ghost"
                  aria-label="Equipment"
                  onClick={() => go("Equipment")}
                >
                  <GameIcon kind="forge" />
                  <span>
                    Forge<small>Gear & upgrades</small>
                  </span>
                </Button>
                {companyReady && (
                  <Button
                    className="camp-sign sign-company"
                    aria-label="Company"
                    variant="ghost"
                    onClick={() => go("Companions")}
                  >
                    <GameIcon kind="company" />
                    <span>
                      Company<small>{company.name}</small>
                    </span>
                  </Button>
                )}
                {petsReady && (
                  <Button
                    className="camp-sign sign-pets"
                    aria-label="Pets"
                    variant="ghost"
                    onClick={() => go("Pets")}
                  >
                    <GameIcon kind="pet" />
                    <span>
                      Pets<small>{pet.name}</small>
                    </span>
                  </Button>
                )}
                {skillReady && (
                  <Button
                    className="camp-sign sign-skills"
                    aria-label="Skills"
                    variant="ghost"
                    onClick={() => go("Skills")}
                  >
                    <GameIcon kind="skills" />
                    <span>
                      Skills<small>Train & prepare</small>
                    </span>
                  </Button>
                )}
                <Button
                  className="camp-sign sign-discoveries"
                  variant="ghost"
                  aria-label="Discoveries"
                  onClick={() => {
                    setMissionTab("discoveries");
                    go("Journey");
                  }}
                >
                  <GameIcon kind="discoveries" />
                  <span>
                    Discoveries<small>The valley remembers</small>
                  </span>
                </Button>
              </nav>
              <span className="camp-ember ember-one" aria-hidden="true" />
              <span className="camp-ember ember-two" aria-hidden="true" />
              <span className="camp-ember ember-three" aria-hidden="true" />
              <div className="camp-company">
                <span
                  className="camp-rook toon-actor"
                  role="img"
                  aria-label="Rook ready for the journey"
                />
                {companyReady && (
                  <span
                    className="camp-companion toon-actor"
                    role="img"
                    aria-label={`${company.name} ready for the journey`}
                    style={{
                      backgroundPosition: `0 ${{ mira: 0, bram: 100 / 3, sable: 200 / 3 }[state.meta.loadout.companion]}%`,
                    }}
                  />
                )}
                {petsReady && (
                  <span
                    className="camp-pet toon-actor"
                    role="img"
                    aria-label={`${pet.name} ready for the journey`}
                    style={{
                      backgroundPosition: `0 ${{ fox: 0, hound: 50, owl: 100 }[state.meta.loadout.pet]}%`,
                    }}
                  />
                )}
                <div className="camp-company-caption">
                  <span>{companyReady ? "YOUR COMPANY" : "THE LANTERN BEARER"}</span>
                  <strong>{companyReady ? `Rook & ${company.name}` : "Rook"}</strong>
                  <small>
                    {petsReady
                      ? `${pet.name} is ready to follow.`
                      : companyReady
                        ? "No one walks the road alone."
                        : "Every great journey begins with one small light."}
                  </small>
                </div>
              </div>
              <aside className="camp-contracts" aria-label="Missions and rewards">
                <Button
                  variant="ghost"
                  aria-label="Open story missions"
                  onClick={() => {
                    setMissionTab("story");
                    go("Journey");
                  }}
                >
                  <GameIcon kind="quests" />
                  <span>Missions</span>
                  {readyRewards > 0 && <b className="notification">{readyRewards}</b>}
                </Button>
                {dailyReady && (
                  <Button
                    variant="ghost"
                    aria-label="Open daily quests"
                    onClick={() => {
                      setMissionTab("daily");
                      go("Journey");
                    }}
                  >
                    <GameIcon kind="daily" />
                    <span>Daily quests</span>
                    {missions.daily.some((q) => q.ready) && <b className="notification">!</b>}
                  </Button>
                )}
                {weeklyReady && (
                  <Button
                    variant="ghost"
                    aria-label="Open weekly quests"
                    onClick={() => {
                      setMissionTab("weekly");
                      go("Journey");
                    }}
                  >
                    <GameIcon kind="weekly" />
                    <span>Weekly quests</span>
                    {missions.weekly.some((q) => q.ready) && <b className="notification">!</b>}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  data-open-adventures=""
                  onClick={() => {
                    a.refreshMissions();
                    setAdventureOpen(true);
                  }}
                >
                  <GameIcon kind="rewards" />
                  <span>Adventures</span>
                </Button>
              </aside>
              <div className="camp-departure">
                <div className="camp-route-preview" aria-hidden="true">
                  <img
                    src={roadAtlas}
                    alt=""
                    style={{
                      transform: `translate(-${((hubChapter - 1) % 2) * 50}%, -${(Math.floor((hubChapter - 1) / 2) * 100) / 3}%)`,
                    }}
                  />
                </div>
                <div
                  className="camp-story-track"
                  role="img"
                  aria-label={`Chapter ${hubChapter} of ${CHAPTERS.length}`}
                >
                  {CHAPTERS.map((entry, index) => (
                    <span
                      key={entry.name}
                      className={`${index + 1 === hubChapter ? "is-current" : ""} ${index + 1 <= state.meta.unlockedChapter ? "is-open" : ""}`}
                      title={`Chapter ${index + 1}: ${entry.name}`}
                    />
                  ))}
                </div>
                <div className="camp-destination">
                  <Button
                    className="camp-arrow"
                    variant="ghost"
                    aria-label="Previous chapter"
                    disabled={!inCamp || hubChapter <= 1}
                    onClick={() => setChapter(hubChapter - 1)}
                  >
                    ◀
                  </Button>
                  <span>
                    <small>
                      CHAPTER {hubChapter} · {state.meta.unlockedChapter} OF {CHAPTERS.length} OPEN
                    </small>
                    <strong>{CHAPTERS[hubChapter - 1]!.name}</strong>
                  </span>
                  <Button
                    className="camp-arrow"
                    variant="ghost"
                    aria-label="Next chapter"
                    disabled={!inCamp || hubChapter >= state.meta.unlockedChapter}
                    onClick={() => setChapter(hubChapter + 1)}
                  >
                    ▶
                  </Button>
                </div>
                <p className="chapter-goal">{journeyStory(hubChapter).goal}</p>
                {saveWarning}
                <Button
                  id="start"
                  className="camp-start"
                  disabled={!v.loaded}
                  onClick={inCamp ? launch : () => setCampOpen(false)}
                >
                  <GameIcon kind="battle" />
                  <span>
                    {inCamp ? "SET OUT" : "RESUME JOURNEY"}
                    <small>
                      {inCamp ? "Leave camp. Carry the light." : "Your company is waiting."}
                    </small>
                  </span>
                  <ArrowRight />
                </Button>
                {!inCamp && (
                  <Button
                    className="retreat-from-hub"
                    variant="ghost"
                    onClick={() => setRetreat(true)}
                  >
                    Return to camp and change build
                  </Button>
                )}
              </div>
            </section>
          )}
          {!dashboard && (
            <div className="battle-heading">
              <div>
                <span className="eyebrow" id="enemy-label">
                  {state.phase.kind === "battle"
                    ? `${activity ? (activity.kind === "hunt" ? "BOSS ROUND" : "EXPEDITION") : "ENCOUNTER"} ${state.run.cleared + 1} / ${runLength(state)}`
                    : "THE OLD ROAD"}
                </span>
                <h1>{activity?.name ?? place.name}</h1>
                <p>
                  {state.phase.kind === "battle"
                    ? state.phase.enemies
                        .filter((e) => e.hp > 0)
                        .map((e) => e.name)
                        .join(" · ")
                    : "Carry the light onward."}
                </p>
                <ol
                  className="encounter-track"
                  aria-label={`${state.run.cleared} of ${runLength(state)} encounters cleared`}
                >
                  {Array.from({ length: runLength(state) }, (_, index) => index + 1).map((i) => (
                    <li
                      key={i}
                      className={`${i <= state.run.cleared ? "cleared" : ""} ${i === state.run.cleared + 1 ? "current" : ""} ${i % 3 === 0 ? "milestone" : ""}`}
                    >
                      <span>{i}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="battle-actions">
                <Button variant="outline" onClick={() => go("Camp")}>
                  <Tent />
                  Camp
                </Button>
                <Button
                  id="pause"
                  variant="outline"
                  aria-label={v.paused ? "Resume game" : "Pause game"}
                  disabled={!v.loaded || !active}
                  onClick={a.pause}
                >
                  {v.paused ? <Play /> : <Pause />}
                </Button>
              </div>
            </div>
          )}
          {!dashboard && state.run.rules === 1 && <ThreatReadout state={state} />}
          {!dashboard && (
            <div className="battle-status">
              <div className="health-stat">
                <span>
                  <Heart /> Health{" "}
                  <b id="hp-text">
                    {Math.ceil(state.run.hp)} / {stats.hp}
                  </b>
                </span>
                <NativeProgress max={stats.hp} value={state.run.hp} aria-label="Health" />
              </div>
              <div className="health-stat">
                <span>
                  Journey level {state.run.level}
                  <small>
                    {state.run.xp} / {xpNeeded(state)} XP
                  </small>
                </span>
                <NativeProgress
                  max={xpNeeded(state)}
                  value={state.run.xp}
                  aria-label="Experience"
                />
              </div>
              <Button
                variant="outline"
                aria-label="Current stats"
                onClick={() => setDetail("stats")}
              >
                <Sword />
                Stats
              </Button>
              <Button
                variant="outline"
                aria-label="Current powers"
                onClick={() => setDetail("powers")}
              >
                <Flame />
                Powers
              </Button>
              {state.run.rules === 1 ? (
                <CombatCommands
                  state={state}
                  paused={v.paused || !active}
                  skillReady={skillReady}
                  command={a.command}
                  skill={a.skill}
                />
              ) : skillReady ? (
                <Button
                  className="cast-skill"
                  disabled={
                    !active ||
                    state.phase.kind !== "battle" ||
                    v.paused ||
                    state.run.skillCooldown > 0
                  }
                  onClick={a.skill}
                >
                  <Zap />
                  {skill.name}
                  <span>
                    {state.run.skillCooldown > 0 ? `${state.run.skillCooldown.toFixed(1)}s` : "Q"}
                  </span>
                </Button>
              ) : (
                <span className="skill-locked">
                  <LockKeyhole /> Choose 2 oaths to awaken Whirlwind
                </span>
              )}
            </div>
          )}
          {!showPrologue && !dashboard && (
            <div className="road-progression">
              <span>
                COMPANY LV. {level.level} ·{" "}
                {level.needed === null ? "MASTERED" : `${level.current}/${level.needed} RENOWN`}
              </span>
              {state.run.context?.kind === "campaign" && state.run.context.routes.length > 0 && (
                <span className="trail-history" title="Chosen trail">
                  {state.run.context.routes.map((r) => (
                    <span key={r.at}>
                      {ROUTES[r.path].symbol} {routeDetails(state, r.path).name}
                    </span>
                  ))}
                </span>
              )}
              {upcoming && (
                <small>
                  Next: {upcoming.title} · {upcoming.description}
                </small>
              )}
            </div>
          )}
          {!showPrologue &&
            !dashboard &&
            state.phase.kind === "travel" &&
            state.run.cleared === 0 &&
            state.run.time < 2.8 && (
              <div className="arrival-banner" aria-live="polite">
                <span>{activity ? "A NEW TRAIL" : `CHAPTER ${state.run.chapter}`}</span>
                <strong>{activity?.name ?? place.name}</strong>
                <small>{activity ? activity.rule : story.title}</small>
              </div>
            )}
          {!showPrologue &&
            !dashboard &&
            active &&
            unlockMessage &&
            state.run.time < unlockMessage.until && (
              <aside className="unlock-toast" role="status">
                <Sparkles />
                <span>
                  {unlockMessage.title}
                  <small>Permanent strength for every adventure</small>
                </span>
              </aside>
            )}

          {!showPrologue &&
            !dashboard &&
            state.phase.kind === "battle" &&
            state.run.rules !== 1 &&
            (tip === "battle" || tip === "skill") && (
              <aside className="tutorial-card" aria-label="First battle guidance">
                <span className={companyReady ? "guide-mira" : "guide-rook"} aria-hidden="true" />
                <div>
                  <span className="sheet-kicker">
                    {companyReady ? "MIRA’S FIELD NOTES" : "ROOK’S FIELD NOTES"}
                  </span>
                  <h3>
                    {tip === "battle" ? "The first steps are yours." : `${skill.name} is ready.`}
                  </h3>
                  <p>
                    {tip === "battle"
                      ? "Rook fights automatically. Clear the first waves to earn Renown and find your company."
                      : `Press Q or the skill button to cast ${skill.name}. ${skill.description}`}
                  </p>
                  <div>
                    <Button onClick={dismissTip}>
                      {tip === "battle" ? "Got it" : "Keep going"}
                    </Button>
                    <Button variant="ghost" onClick={skipTips}>
                      Skip tips
                    </Button>
                  </div>
                </div>
              </aside>
            )}
          {!showPrologue &&
            dashboard &&
            section === "Camp" &&
            state.meta.earnedGold > 0 &&
            tip === "camp" && (
              <aside className="tutorial-card camp-guide" aria-label="Camp guidance">
                <span className="guide-mira" aria-hidden="true" />
                <div>
                  <span className="sheet-kicker">A STRONGER COMPANY</span>
                  <h3>The road rewards preparation.</h3>
                  <p>
                    Your gold stays with you. Forge permanent upgrades and choose equipment before
                    your next march. Follow Mira’s signal and Cinder’s tracks to grow your company.
                  </p>
                  <div>
                    <Button
                      onClick={() => {
                        dismissTip();
                        setEquipmentTab("forge");
                        go("Equipment");
                      }}
                    >
                      Visit the forge
                    </Button>
                    <Button variant="ghost" onClick={dismissTip}>
                      Later
                    </Button>
                  </div>
                </div>
              </aside>
            )}
          {!dashboard && saveWarning}
          <p
            id="save-status"
            className={`save-status ${v.saveWarning ? "warning" : ""}`}
            role="status"
          >
            {v.saveMessage}
          </p>
        </main>
      </div>
      {!showPrologue && !firstLightFocused && !marchFocused && <PowerBelt state={state} />}
      <Modal
        open={v.loaded && marchForgeOpen && (marchFocused || inCamp)}
        title="Equipment & forge"
        className="march-forge-dialog"
        close={() => setMarchForgeOpen(false)}
      >
        <MarchForge
          state={state}
          upgrade={a.upgrade}
          equip={() => a.equipGear("sunfang")}
          retreat={() => {
            if (state.phase.kind === "victory" || state.phase.kind === "defeat") {
              a.camp();
              return;
            }
            setMarchForgeOpen(false);
            setRetreatFromForge(true);
            setRetreat(true);
          }}
        />
      </Modal>
      <Modal
        open={
          marchFocused &&
          !dashboard &&
          !settings &&
          !marchForgeOpen &&
          !detail &&
          !retreat &&
          !v.paused &&
          v.decisionReady &&
          state.phase.kind === "choice"
        }
        title="Choose a new power"
        className="march-decision"
        heading={false}
        initialFocus="[data-march-perk]"
      >
        {state.phase.kind === "choice" && (
          <MarchChoices
            state={state}
            options={state.phase.options}
            rerolls={state.phase.rerolls ?? 1}
            choose={(id) =>
              a.choose(id, state.phase.kind === "choice" ? state.phase.offerId : undefined)
            }
            reroll={() => a.reroll(state.phase.kind === "choice" ? state.phase.offerId : undefined)}
            skip={() => a.skip(state.phase.kind === "choice" ? state.phase.offerId : undefined)}
            inspect={() => setDetail("stats")}
          />
        )}
      </Modal>
      <Modal
        open={
          marchFocused &&
          !dashboard &&
          !settings &&
          !marchForgeOpen &&
          !detail &&
          !retreat &&
          !v.paused &&
          state.phase.kind === "march-gift"
        }
        title="A light along the road"
        className="march-decision"
        heading={false}
        initialFocus="[data-march-gift]"
      >
        {state.phase.kind === "march-gift" && (
          <MarchGift
            state={state}
            options={state.phase.options}
            choose={(id) => {
              if (state.phase.kind === "march-gift") a.marchGift(id, state.phase.offerId);
            }}
          />
        )}
      </Modal>
      <Modal
        open={v.loaded && firstLightWardrobe && (firstLightFocused || inCamp)}
        title="Rook’s equipment"
        className="fl-wardrobe"
        close={() => setFirstLightWardrobe(false)}
      >
        <FirstLightWardrobe
          state={state}
          canChange={state.phase.kind === "camp" || state.phase.kind === "loot"}
          equip={() => a.equipGear("sunfang")}
          ordinary={() => a.equipGear(null)}
        />
      </Modal>
      <Modal
        open={dashboard && section !== "Camp"}
        title={
          section === "Journey"
            ? missionTab === "discoveries"
              ? "The wayfarer’s journal"
              : "Missions & rewards"
            : section === "Companions"
              ? "Your company"
              : section === "Equipment"
                ? "Equipment & forge"
                : section === "Skills"
                  ? "Skills & powers"
                  : "Your pets"
        }
        className={`collection-dialog collection-${section.toLowerCase()} ${["Companions", "Pets", "Skills"].includes(section) ? "collection-location" : ""}`}
        close={() => {
          setSection("Camp");
        }}
      >
        {!inCamp && (
          <p className="section-note">
            Your journey is paused. Return to camp to change your build.
          </p>
        )}
        {section !== "Camp" && saveWarning}
        {dashboard && section === "Companions" && (
          <>
            {selection("companion", COMPANIONS)}
            <Training state={state} id="companion" actions={a} />
          </>
        )}
        {dashboard && section === "Pets" && (
          <>
            {selection("pet", PETS)}
            <Training state={state} id="pet" actions={a} />
          </>
        )}
        {dashboard && section === "Skills" && (
          <>
            <p className="section-note">Equip an art for Q. Earn new oaths on every journey.</p>
            {selection("skill", SKILLS)}
            <Training state={state} id="skill" actions={a} />
            <details className="oath-card location-oaths">
              <summary>Journey powers · inspect your current oaths</summary>
              <Powers state={state} />
            </details>
          </>
        )}
        {dashboard && section === "Equipment" && (
          <>
            <output
              className="workshop-wallet"
              aria-label={`${state.meta.gold} gold available at the forge`}
            >
              <GameIcon kind="gold" />
              <b>{state.meta.gold.toLocaleString()}</b>
              <span>GOLD</span>
            </output>
            <nav className="equipment-tabs" aria-label="Equipment categories">
              {(
                [
                  ["weapon", "Weapons"],
                  ["armor", "Armor"],
                  ["forge", "Forge"],
                ] as const
              ).map(([id, label]) => (
                <Button
                  key={id}
                  variant="ghost"
                  aria-pressed={equipmentTab === id}
                  onClick={() => setEquipmentTab(id)}
                >
                  <GameIcon
                    kind={id === "forge" ? "gold" : id === "weapon" ? "battle" : "equipment"}
                  />
                  {label}
                  {id !== "forge" && <span>{id === "weapon" ? weapon.name : armor.name}</span>}
                </Button>
              ))}
            </nav>
            {equipmentTab === "weapon" && selection("weapon", WEAPONS)}
            {equipmentTab === "armor" && selection("armor", ARMORS)}
            {equipmentTab === "forge" && (
              <div className="loadout-workbench forge-workbench">
                <aside className="loadout-showcase forge-showcase" aria-label="Permanent upgrades">
                  <span className="showcase-label">THE CAMP FORGE</span>
                  <div className="showcase-art">
                    <LoadoutArt slot="weapon" id={weapon.id} />
                  </div>
                  <h3>Tempered for the road.</h3>
                  <p>Every upgrade stays with your company, through every journey.</p>
                  <span className="showcase-power">
                    <GameIcon kind="battle" />
                    <b>{power.total.toLocaleString()}</b>
                    <small>COMPANY POWER</small>
                  </span>
                </aside>
                <div className="selection-grid forge">
                  {(["blade", "mail", "charm"] as const).map((id) => (
                    <Card key={id} className={`forge-card forge-${id}`}>
                      <CardHeader>
                        <div className="forge-emblem">
                          {id === "charm" ? (
                            <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
                              <path
                                d="M27 15q-5 39 23 45 28-6 23-45"
                                stroke="#202735"
                                strokeWidth="10"
                              />
                              <path
                                d="M27 15q-5 39 23 45 28-6 23-45"
                                stroke="#d5a859"
                                strokeWidth="5"
                              />
                              <path
                                d="m50 46 23 17-8 24H35l-8-24Z"
                                fill="#f5bf50"
                                stroke="#263041"
                                strokeWidth="4"
                              />
                              <path
                                d="m50 55 13 11-5 13H42l-5-13Z"
                                fill="#e86532"
                                stroke="#9d392d"
                                strokeWidth="3"
                              />
                              <path d="m49 58-5 12h7l-2 8 9-15h-8l3-5Z" fill="#ffe7a1" />
                            </svg>
                          ) : (
                            <LoadoutArt
                              slot={id === "blade" ? "weapon" : "armor"}
                              id={id === "blade" ? weapon.id : armor.id}
                            />
                          )}
                        </div>
                        <CardTitle>
                          {
                            {
                              blade: "Hone the blade",
                              mail: "Reinforce the mail",
                              charm: "Kindle the charm",
                            }[id]
                          }
                        </CardTitle>
                        <Badge variant="outline">
                          Rank {state.meta.upgrades[id]} / {UPGRADE_CAP}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <p>
                          {
                            {
                              blade: "+4 Rook damage and +1.5 companion damage per rank.",
                              mail: "+25 maximum health and +1 armor per rank.",
                              charm: "+2.5% critical chance and +1 pet damage per rank.",
                            }[id]
                          }
                        </p>
                        <div className="forge-ranks" aria-hidden="true">
                          {Array.from({ length: UPGRADE_CAP }, (_, index) => index + 1).map(
                            (rank) => (
                              <span
                                key={rank}
                                className={rank <= state.meta.upgrades[id] ? "is-forged" : ""}
                              />
                            ),
                          )}
                        </div>
                        <Button
                          variant="outline"
                          data-upgrade={id}
                          disabled={
                            !inCamp ||
                            state.meta.upgrades[id] >= UPGRADE_CAP ||
                            state.meta.gold < upgradeCost(state, id)
                          }
                          onClick={() => a.upgrade(id)}
                        >
                          {state.meta.upgrades[id] >= UPGRADE_CAP
                            ? "Fully forged"
                            : `Forge · ${upgradeCost(state, id)} gold`}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {dashboard && section === "Journey" && (
          <section className="mission-board" aria-label="Mission board">
            <nav className="mission-tabs" aria-label="Mission schedule">
              {(
                [
                  ["discoveries", "Discoveries"],
                  ["story", "Story missions"],
                  ["daily", "Daily quests"],
                  ["weekly", "Weekly quests"],
                ] as const
              )
                .filter(
                  ([scope]) =>
                    scope === "discoveries" ||
                    scope === "story" ||
                    (scope === "daily" ? dailyReady : weeklyReady),
                )
                .map(([scope, label]) => (
                  <Button
                    key={scope}
                    variant={missionTab === scope ? "secondary" : "ghost"}
                    aria-pressed={missionTab === scope}
                    onClick={() => {
                      a.refreshMissions();
                      setMissionTab(scope);
                    }}
                  >
                    {label}
                    {scope !== "discoveries" && (
                      <span className="mission-tab-count">
                        {missions[scope].filter((q) => q.claimed).length}/{missions[scope].length}
                      </span>
                    )}
                  </Button>
                ))}
            </nav>
            {missionTab === "discoveries" ? (
              <DiscoveryJournal
                state={state}
                onPlan={(targetChapter) => {
                  setChapter(targetChapter);
                  setSection("Camp");
                  setIntroChapter(targetChapter);
                }}
                onVisit={(id) =>
                  go(id === "mira" ? "Companions" : id === "cinder" ? "Pets" : "Skills")
                }
              />
            ) : (
              <>
                <div className="mission-schedule">
                  <p>
                    {missionTab === "story"
                      ? "Five chapters. Recover the light, then bring your company home."
                      : missionTab === "daily"
                        ? "Three small goals for today's journey. Progress counts across your runs."
                        : "Longer goals for your company. Replayed chapters count toward victories."}
                  </p>
                  {missionTab !== "story" && (
                    <span>
                      Resets{" "}
                      {new Intl.DateTimeFormat("en-GB", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "UTC",
                      }).format(new Date(resetAt(state.quests, missionTab)))}{" "}
                      UTC
                    </span>
                  )}
                </div>
                <div className="mission-list">
                  {missions[missionTab].map((quest: QuestCard, i) => {
                    const chapter = missionTab === "story" ? i + 1 : null;
                    const locked = chapter !== null && chapter > state.meta.unlockedChapter;
                    const progress =
                      chapter !== null
                        ? quest.progress > 0
                          ? ENCOUNTERS_PER_CHAPTER
                          : state.run.chapter === chapter
                            ? state.run.cleared
                            : 0
                        : quest.progress;
                    const target = chapter !== null ? ENCOUNTERS_PER_CHAPTER : quest.target;
                    return (
                      <Card
                        key={quest.id}
                        data-quest={quest.id}
                        className={`mission-row ${chapter !== null ? "is-story" : ""} ${quest.ready ? "is-ready" : ""} ${locked ? "is-locked" : ""}`}
                      >
                        {chapter !== null && (
                          <div className="mission-chapter-art" aria-hidden="true">
                            <img
                              src={roadAtlas}
                              alt=""
                              style={{
                                transform: `translate(-${((chapter - 1) % 2) * 50}%, -${(Math.floor((chapter - 1) / 2) * 100) / 3}%)`,
                              }}
                            />
                          </div>
                        )}
                        <div className="mission-marker">
                          {quest.claimed ? (
                            <Check />
                          ) : locked ? (
                            <LockKeyhole />
                          ) : (
                            (chapter ??
                            (quest.id.includes("foes") ? (
                              <Sword />
                            ) : quest.id.includes("skills") ? (
                              <Zap />
                            ) : (
                              <Flame />
                            )))
                          )}
                        </div>
                        <div className="mission-copy">
                          <div className="mission-title">
                            <h2>{chapter !== null ? CHAPTERS[i]!.name : quest.title}</h2>
                            <Badge variant="outline">
                              {quest.claimed
                                ? "Claimed"
                                : quest.ready
                                  ? "Reward ready"
                                  : locked
                                    ? "Locked"
                                    : chapter !== null
                                      ? `Chapter ${chapter}`
                                      : "In progress"}
                            </Badge>
                          </div>
                          <p>{chapter !== null ? journeyStory(chapter).goal : quest.description}</p>
                          <div className="mission-progress">
                            <NativeProgress
                              aria-label={`${chapter !== null ? CHAPTERS[i]!.name : quest.title} progress`}
                              max={target}
                              value={progress}
                            />
                            <small>
                              {progress}/{target} {chapter !== null ? "waves" : ""}
                            </small>
                          </div>
                        </div>
                        <div className="mission-reward">
                          <span>
                            <Coins /> {quest.reward} gold
                          </span>
                          {quest.ready ? (
                            <Button
                              data-claim-quest={quest.id}
                              disabled={!v.loaded || v.saveWarning}
                              onClick={() => a.claim(missionTab, quest.id, quest.period)}
                            >
                              Claim reward
                            </Button>
                          ) : chapter !== null && !locked ? (
                            <Button
                              variant="outline"
                              disabled={!inCamp}
                              onClick={() => {
                                setChapter(chapter);
                                go("Camp");
                              }}
                            >
                              {inCamp
                                ? quest.claimed
                                  ? "Revisit road"
                                  : "Prepare journey"
                                : "Journey underway"}
                            </Button>
                          ) : (
                            <Button variant="outline" disabled>
                              {quest.claimed
                                ? "Reward claimed"
                                : locked
                                  ? `Reach chapter ${chapter}`
                                  : "Keep adventuring"}
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
            {missionTab !== "discoveries" && (
              <p className="mission-feedback" role="status">
                {v.note}
              </p>
            )}
          </section>
        )}

        {!inCamp && (
          <div className="dialog-actions">
            <Button
              onClick={() => {
                setSection("Camp");
                setCampOpen(false);
              }}
            >
              <Play />
              Resume journey
            </Button>
            <Button variant="outline" onClick={() => setRetreat(true)}>
              Return to camp and change build
            </Button>
          </div>
        )}
      </Modal>
      <Modal
        open={introChapter !== null}
        title={journeyStory(introChapter ?? chapter).title}
        close={() => setIntroChapter(null)}
        className="chapter-opening"
      >
        <div className="departure-scene">
          <img
            className="departure-landscape"
            src={roadAtlas}
            alt=""
            style={{
              transform: `translate(-${(((introChapter ?? chapter) - 1) % 2) * 50}%, -${((Math.floor(((introChapter ?? chapter) - 1) / 2) + 0.5) * 100) / 3}%)`,
            }}
          />
          <span className="departure-rook" aria-hidden="true" />
          <div className="departure-location">
            <span>CHAPTER {introChapter ?? chapter} · THE ROAD AHEAD</span>
            <h3>{CHAPTERS[(introChapter ?? chapter) - 1]!.name}</h3>
          </div>
        </div>
        <div className="departure-brief">
          <span className="eyebrow">
            {companyReady ? "FROM MIRA’S JOURNAL" : "A LETTER LEFT FOR ROOK"}
          </span>
          <blockquote>{journeyStory(introChapter ?? chapter).opening}</blockquote>
          <p className="departure-goal">
            <GameIcon kind="quests" />
            {journeyStory(introChapter ?? chapter).goal}
          </p>
          <div className="departure-stakes">
            <span>12 encounters</span>
            <i /> <span>One consequential fork · two oath offerings</span>
            <i />
            <span>1 guardian</span>
          </div>
          {discoveriesOnRoad(state, introChapter ?? chapter).length > 0 && (
            <div className="departure-discoveries">
              <span className="sheet-kicker">OPTIONAL TRAILS · PERMANENT DISCOVERIES</span>
              {discoveriesOnRoad(state, introChapter ?? chapter).map((discovery) => (
                <p key={discovery.id}>
                  <Flame size={15} />
                  <span>
                    <strong>{discovery.character}</strong> · {discovery.route}
                  </span>
                </p>
              ))}
            </div>
          )}
          <small>
            Your journey level and oaths restart. Company levels, discoveries and gear stay with
            you.
          </small>
        </div>
        {introChapter !== null && saveWarning}
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => setIntroChapter(null)}>
            Back
          </Button>
          <Button
            id="depart"
            onClick={() => {
              if (introChapter === null) return;
              const next = introChapter;
              setIntroChapter(null);
              setCampOpen(false);
              a.start(next);
            }}
          >
            Begin chapter {introChapter ?? chapter}
            <ArrowRight />
          </Button>
        </div>
      </Modal>
      <Modal
        open={newDiscovery !== null}
        title={newDiscovery === "mira" ? "Mira joins the company." : "Cinder joins the company."}
        className={`company-arrival arrival-${newDiscovery ?? "mira"}`}
        close={() => setNewDiscovery(null)}
      >
        <div className="company-arrival-art" aria-hidden="true">
          <span className="join-ring" />
          <span className={`join-portrait join-${newDiscovery ?? "mira"}`} />
        </div>
        <span className="eyebrow">
          {newDiscovery === "mira" ? "A RANGER’S PROMISE" : "A SMALL FLAME, A LOYAL FRIEND"}
        </span>
        <h3>
          {newDiscovery === "mira"
            ? "You don’t have to walk alone."
            : "Some lights find their way to you."}
        </h3>
        <p>
          {newDiscovery === "mira"
            ? "Mira found your lantern. Her arrows now join Rook’s attacks. You can inspect and train your companion back at camp."
            : miraFound
              ? "Cinder followed the ember footprints home. Your first pet joins the fight; pair Cinder with Mira to mark targets for her next arrow."
              : "Cinder followed the ember footprints home. Your first pet joins Rook’s attacks. A loyal friend for every road ahead."}
        </p>
        <small>A permanent discovery. Your companion stays with the company across journeys.</small>
        <Button onClick={() => setNewDiscovery(null)}>
          Continue the journey <ArrowRight />
        </Button>
      </Modal>
      <Modal
        open={settings}
        title="The campfire."
        className="settings-dialog"
        close={() => setSettings(false)}
      >
        <div className="settings-company">
          <span className="settings-cinder" aria-hidden="true" />
          <div>
            <span className="sheet-kicker">MAKE YOURSELF AT HOME</span>
            <h3>Sound, story & a gentler road.</h3>
            <p>Your company will wait.</p>
          </div>
        </div>
        {v.audioControls && (
          <div className="audio-settings">
            <div className="audio-setting">
              <label htmlFor="music-enabled">
                <Volume2 /> Background music
              </label>
              <Switch
                id="music-enabled"
                aria-label="Background music"
                checked={experience.audio.musicEnabled}
                onCheckedChange={(value) => a.audioPreference("musicEnabled", value)}
              />
              <NativeInput
                aria-label="Music volume"
                type="range"
                min={0}
                max={100}
                value={Math.round(experience.audio.musicVolume * 100)}
                onChange={(event) =>
                  a.audioPreference("musicVolume", Number(event.target.value) / 100)
                }
              />
            </div>
            <div className="audio-setting">
              <label htmlFor="effects-enabled">
                <Sword /> Sound effects
              </label>
              <Switch
                id="effects-enabled"
                aria-label="Sound effects"
                checked={experience.audio.effectsEnabled}
                onCheckedChange={(value) => a.audioPreference("effectsEnabled", value)}
              />
              <NativeInput
                aria-label="Effects volume"
                type="range"
                min={0}
                max={100}
                value={Math.round(experience.audio.effectsVolume * 100)}
                onChange={(event) =>
                  a.audioPreference("effectsVolume", Number(event.target.value) / 100)
                }
              />
            </div>
            <p className="audio-state" role="status">
              {v.audioStatus === "locked"
                ? "Tap Enable sound to start the music."
                : v.audioStatus === "loading"
                  ? "Preparing the campfire score…"
                  : v.audioStatus === "ready"
                    ? "The Last Light · original music for Ember Road"
                    : v.audioStatus === "effects-only"
                      ? "Music could not load. Combat sounds are available."
                      : "This browser cannot play audio. Your journey still works."}
            </p>
            {v.audioStatus === "locked" && <Button onClick={a.unlockAudio}>Enable sound</Button>}
          </div>
        )}
        {inCamp && !firstLightFocused && !marchFocused && (
          <nav className="compact-journey-shortcuts" aria-label="Other journeys">
            {journeyShortcuts}
          </nav>
        )}
        <label className="motion-control" htmlFor="reduce-motion">
          <Switch
            id="reduce-motion"
            aria-label="Reduced motion"
            checked={v.reducedMotion}
            onCheckedChange={a.reduce}
          />
          Reduced motion
        </label>
        <div className="campfire-actions">
          <Button
            variant="outline"
            onClick={() => {
              setSettings(false);
              setReplayIntro(true);
            }}
          >
            <BookOpen />
            Watch the opening
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              a.skipGuidance();
              setSettings(false);
            }}
          >
            Skip combat tips
          </Button>
        </div>
        <p>
          {marchFocused
            ? "Fighting and skills are automatic. Space to pause · 1–3 to choose a power."
            : "Space to pause · Q to cast · 1–3 to choose an oath."}
        </p>
        <p>
          Gold, equipment, and unlocked chapters stay with you. Oaths belong to the current journey.
        </p>
        <Button onClick={() => setSettings(false)}>Return to the road</Button>
      </Modal>
      <Modal
        open={detail !== null}
        title={
          marchFocused ? "Current build" : detail === "stats" ? "Current stats" : "Current powers"
        }
        className={marchFocused ? "march-forge-dialog march-build-dialog" : ""}
        close={() => setDetail(null)}
      >
        {marchFocused ? (
          <MarchBuild state={state} />
        ) : detail === "stats" ? (
          <StatList state={state} />
        ) : (
          <Powers state={state} />
        )}
      </Modal>
      <Modal open={retreat} title="Return to camp?" close={cancelRetreat}>
        <p>
          This ends the unfinished journey and clears its oaths. Gold, forged gear, and chapter
          unlocks stay with you.
        </p>
        <div className="dialog-actions">
          <Button variant="outline" onClick={cancelRetreat}>
            Keep this journey
          </Button>
          <Button
            onClick={() => {
              a.retreat();
              setRetreatFromForge(false);
              setRetreat(false);
              setCampOpen(false);
            }}
          >
            Return to camp
          </Button>
        </div>
      </Modal>
      <Modal
        open={
          !firstLightFocused &&
          !marchFocused &&
          !dashboard &&
          v.paused &&
          !settings &&
          !detail &&
          !retreat
        }
        title="The road can wait."
        close={a.pause}
      >
        <p>Take a breath. Your company is waiting.</p>
        <Button onClick={a.pause}>
          <Play />
          Resume journey
        </Button>
      </Modal>
      <Modal
        open={adventureOpen}
        title="Beyond the old road"
        close={() => setAdventureOpen(false)}
        className="adventure-dialog"
      >
        <span className="eyebrow">NEW TRAILS · NO ENERGY · RETURN WHEN YOU WISH</span>
        <div className="adventure-tabs">
          <Button
            aria-pressed={adventureKind === "daily"}
            variant={adventureKind === "daily" ? "default" : "outline"}
            onClick={() => {
              a.refreshMissions();
              setAdventureKind("daily");
            }}
          >
            Daily expedition
          </Button>
          <Button
            aria-pressed={adventureKind === "hunt"}
            variant={adventureKind === "hunt" ? "default" : "outline"}
            onClick={() => {
              a.refreshMissions();
              setAdventureKind("hunt");
            }}
          >
            Weekly boss hunt
          </Button>
        </div>
        <div className={`adventure-poster adventure-${offer.kind}`} data-adventure-id={offer.id}>
          <GameIcon kind={offer.kind === "daily" ? "daily" : "battle"} />
          <div>
            <span className="eyebrow">
              {offer.fights} FIGHTS · CHANGES {eventReset.toUpperCase()} AT 00:00 UTC
            </span>
            <h2>{offer.name}</h2>
            <p>{offer.rule}</p>
          </div>
        </div>
        <div className="adventure-tiers">
          {TIERS.map((t) => (
            <Button
              key={t.tier}
              data-adventure-tier={t.tier}
              aria-pressed={adventureTier === t.tier}
              variant={adventureTier === t.tier ? "default" : "outline"}
              onClick={() => setAdventureTier(t.tier)}
            >
              {t.name}
              <small>{t.chapter === 1 ? "After chapter 1" : `Reach chapter ${t.chapter}`}</small>
            </Button>
          ))}
        </div>
        <p className="adventure-prize" data-adventure-reward="">
          {offer.claimed
            ? "First-clear bonus claimed for this tier"
            : `First clear · ${offer.reward.gold} Gold + ${offer.reward.marks} Trailmarks + ${offer.reward.embers} Embers`}
        </p>
        <p className="muted">
          Every clear also earns {offer.kind === "daily" ? 20 : 35} completion Gold plus foe Gold.
          Replays keep base rewards. Finish after rollover to keep base Gold; the expired
          first-clear bonus ends.
        </p>
        {!offer.unlocked && (
          <p className="adventure-locked">
            {!activityUnlocked(state, offer.kind)
              ? `Clear chapter ${offer.kind === "daily" ? 1 : 2} to open this trail.`
              : `Reach chapter ${TIERS[adventureTier - 1]!.chapter} for this difficulty.`}
          </p>
        )}
        <Button
          data-start-adventure=""
          disabled={!offer.unlocked || !inCamp}
          onClick={() => {
            if (a.adventure(offer.kind, offer.tier, offer.period, offer.id, hubChapter))
              setAdventureOpen(false);
          }}
        >
          {offer.claimed ? "Replay for base rewards" : "Start adventure"}
        </Button>
      </Modal>
      <Modal
        open={!dashboard && !detail && !settings && v.decisionReady && state.phase.kind === "route"}
        title="The road forks."
        className="decision--route"
      >
        <span className="eyebrow">AFTER FIGHT {state.run.cleared} · SHAPE THE ROAD AHEAD</span>
        <p>One trail, one consequence. Your choice stays with this journey.</p>
        <div className="trail-fork">
          {state.phase.kind === "route" &&
            routeOptions(state.phase.at).map((path, i) => (
              <Card key={path} className={`trail-option trail-${path}`}>
                <CardHeader>
                  <span className="trail-symbol">{ROUTES[path].symbol}</span>
                  <CardTitle>{routeDetails(state, path).name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{routeDetails(state, path).risk}</p>
                  <strong>{routeDetails(state, path).reward}</strong>
                  <Button autoFocus={i === 0} data-route={path} onClick={() => a.route(path)}>
                    Take this trail <ArrowRight />
                  </Button>
                </CardContent>
              </Card>
            ))}
        </div>
      </Modal>
      <Modal
        open={
          !marchFocused &&
          !dashboard &&
          !detail &&
          !settings &&
          v.decisionReady &&
          state.phase.kind === "choice"
        }
        title="Choose your next oath."
        className="decision--choice"
        heading={false}
        initialFocus="[data-oath]"
      >
        {state.phase.kind === "choice" && (
          <OathOffering
            key={`${state.run.chapter}-${state.run.level}-${state.phase.options.join("-")}`}
            state={state}
            options={state.phase.options}
            rerolls={state.phase.rerolls ?? 1}
            choose={(id) => {
              setTip(null);
              a.choose(id);
            }}
            reroll={a.reroll}
            stats={() => setDetail("stats")}
            powers={() => setDetail("powers")}
            skip={() => {
              setTip(null);
              a.skip();
            }}
          >
            {(PERKS.some((perk) => rank(state, perk.id) > 0) ||
              systemUnlocked(state, "skills")) && <PowerBelt state={state} />}
          </OathOffering>
        )}
      </Modal>
      <Modal
        open={
          !firstLightFocused &&
          !marchFocused &&
          !dashboard &&
          v.decisionReady &&
          (state.phase.kind === "defeat" || state.phase.kind === "victory")
        }
        title={state.phase.kind === "victory" ? "A light answers." : "Rest. Reforge. Return."}
        className={`${state.phase.kind === "victory" ? "decision--victory" : "decision--defeat"} chapter-result result-chapter-${state.run.chapter}`}
      >
        <div className="result-crest" aria-hidden="true">
          {state.phase.kind === "victory" ? <Flame /> : <Sword />}
        </div>
        <span className="eyebrow">
          {state.phase.kind === "victory"
            ? activity
              ? "ADVENTURE COMPLETE"
              : "CHAPTER COMPLETE"
            : "THE MARCH ENDS. THE OATH REMAINS."}
        </span>
        <p>
          {state.phase.kind === "victory"
            ? activity
              ? `${activity.name} complete. The story road waits for your return.`
              : story.outcome
            : `${state.phase.kind === "defeat" ? state.phase.enemy : "The road"} stopped you after ${state.run.cleared} waves. Your gold and forged gear are safe.`}
        </p>
        {state.phase.kind === "victory" && (
          <>
            <p>
              <Coins /> {state.phase.reward}{" "}
              {activity ? "total clear gold (includes first-clear bonus)" : "chapter gold"} ·{" "}
              {state.meta.gold} gold kept
            </p>
            {activity && (
              <p data-first-clear-result="">
                {state.phase.bonusStatus === "earned"
                  ? `First-clear bonus earned · ${state.phase.bonus} gold · ${activity.reward.marks} Trailmarks · ${activity.reward.embers} Embers`
                  : state.phase.bonusStatus === "expired"
                    ? "This event period ended. Base combat gold kept; no first-clear bonus."
                    : "First-clear bonus already claimed. Base combat gold kept."}
              </p>
            )}
            <div className="victory-progress" data-company-reward="" role="status">
              <Sparkles />
              <div>
                <strong>Company level {level.level}</strong>
                <p>
                  Permanent company strength · +{(level.level - 1) * 2} damage · +
                  {(level.level - 1) * 5} health
                </p>
                <p>
                  {[
                    discoveries?.mira ? "Mira found" : "Mira’s signal awaits",
                    discoveries?.cinder ? "Cinder found" : "Fox tracks await",
                    discoveries?.whirlwind ? "Whirlwind awakened" : "Whirlwind awaits",
                  ].join(" · ")}
                </p>
                <small>
                  Permanent progress · {progression.trailmarks} Trailmarks · {progression.embers}{" "}
                  Embers kept
                </small>
              </div>
            </div>
          </>
        )}
        <div className="dialog-actions">
          <Button
            onClick={() => {
              a.camp();
              setSection("Equipment");
            }}
          >
            <Tent />
            Return to the forge
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (activity) {
                a.camp();
                a.refreshMissions();
                setAdventureKind(activity.kind);
                setAdventureTier(activity.tier);
                setAdventureOpen(true);
              } else setIntroChapter(state.run.chapter);
            }}
          >
            {activity ? "Review adventure / replay" : "Try this chapter again"}
          </Button>
        </div>
      </Modal>
      <StoryOpening
        open={showPrologue}
        fresh={!firstLightFocused && !marchFocused && isFirstJourney(state)}
        companyReady={companyReady}
        petsReady={petsReady}
        paused={v.presentationPaused}
        audioStatus={v.audioStatus}
        audioPermitted={v.audioPermitted}
        soundOn={experience.audio.musicEnabled || experience.audio.effectsEnabled}
        audioControls={v.audioControls}
        toggleSound={a.toggleSound}
        skip={() => {
          a.finishIntro();
          setReplayIntro(false);
          if (firstLightFocused || marchFocused) {
            setSection("Camp");
            setCampOpen(false);
            return;
          }
          if (!inCamp) {
            setSection("Camp");
            setCampOpen(true);
          }
        }}
        finish={(start) => {
          a.finishIntro();
          setReplayIntro(false);
          if (firstLightFocused || marchFocused) {
            setSection("Camp");
            setCampOpen(false);
            return;
          }
          if (start) a.start(1);
          else if (!inCamp) {
            setSection("Camp");
            setCampOpen(true);
          }
        }}
      />
    </div>
  );
}
export function mountUi(element: HTMLElement, initial: UiSnapshot, actions: UiActions) {
  const root = createRoot(element);
  const render = (snapshot: UiSnapshot) =>
    root.render(
      <OverlaySuspended value={snapshot.overlaySuspended}>
        <GameUi snapshot={snapshot} actions={actions} />
      </OverlaySuspended>,
    );
  flushSync(() => render(initial));
  return render;
}
