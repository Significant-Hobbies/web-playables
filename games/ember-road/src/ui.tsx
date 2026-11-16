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
  RefreshCw,
  Settings,
  Sparkles,
  Sword,
  Tent,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import {
  type ActivityKind,
  activityPreview,
  activityUnlocked,
  DAY_MS,
  ROUTES,
  type RouteId,
  routeOptions,
  runLength,
  TIERS,
  type Tier,
} from "./adventures";
import type { AudioStatus, SoundCue } from "./audio";
import { type AudioPreferences, experienceOf, isFirstJourney, type Lesson } from "./experience";
import { StoryOpening } from "./experience-ui";
import { GameIcon } from "./game-icon";
import { LoadoutArt } from "./loadout-art";
import {
  ARMORS,
  CHAPTERS,
  COMPANIONS,
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

const chapterIsland = new URL("../assets/toon-island.png", import.meta.url).href;
const partyAtlas = new URL("../assets/toon-party.png", import.meta.url).href;
const petAtlas = new URL("../assets/toon-pets.png", import.meta.url).href;
function PerkSymbol({ family }: { family: Perk["family"] }) {
  return family === "steel" ? <Sword /> : family === "vitality" ? <Heart /> : <Flame />;
}

export interface UiSnapshot {
  state: GameState;
  loaded: boolean;
  saveMessage: string;
  saveWarning: boolean;
  paused: boolean;
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
  route(path: RouteId): void;
  adventure(
    kind: ActivityKind,
    tier: Tier,
    period: number,
    id: number,
    returnChapter: number,
  ): boolean;
  choose(id: PerkId): void;
  skip(): void;
  reroll(): void;
  train(id: TrainingId): void;
  equip<K extends keyof Loadout>(slot: K, id: Loadout[K]): void;
  upgrade(id: UpgradeId): void;
  retreat(): void;
  camp(): void;
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
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  close?: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);
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
      <div className="dialog-heading">
        <h2>{title}</h2>
        {close && (
          <Button variant="ghost" size="icon" aria-label={`Close ${title}`} onClick={close}>
            <X />
          </Button>
        )}
      </div>
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
  const experience = experienceOf(state);
  const level = levelProgress(state);
  const progression = progressionOf(state);
  const upcoming = nextUnlock(state);
  const activity =
    state.run.context?.kind === "daily" || state.run.context?.kind === "hunt"
      ? activityPreview(state, state.run.context.kind, state.run.context.tier, state.run.context)
      : null;
  const discoveries = state.adventures?.discoveries;
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
  const showPrologue = v.loaded && (!experience.introSeen || replayIntro);
  const [section, setSection] = useState<Section>("Camp");
  const [equipmentTab, setEquipmentTab] = useState<"weapon" | "armor" | "forge">("weapon");
  const [missionTab, setMissionTab] = useState<QuestScope>("story");
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
        showPrologue ||
          settings ||
          adventureOpen ||
          detail !== null ||
          campOpen ||
          retreat ||
          introChapter !== null ||
          section !== "Camp",
      ),
    [a, settings, detail, campOpen, retreat, introChapter, section, showPrologue, adventureOpen],
  );
  useEffect(() => {
    if (inCamp) {
      setCampOpen(false);
      setChapter(state.run.chapter);
    }
  }, [inCamp, state.run.chapter]);
  useEffect(() => {
    if (!v.loaded || showPrologue || tip || settings || detail || section !== "Camp") return;
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
    return (
      <div className="selection-grid">
        {items.map((item, index) => {
          const locked = item.chapter > state.meta.unlockedChapter,
            selected = state.meta.loadout[slot] === item.id;
          return (
            <Card
              key={item.id}
              className={`selection-card slot-${slot} item-${index} ${selected ? "selected" : ""} ${locked ? "is-locked" : ""}`}
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
                <span className="item-role">
                  {slot === "companion"
                    ? COMPANIONS[index]!.role
                    : slot === "pet"
                      ? PETS[index]!.kind
                      : slot === "weapon"
                        ? ["Balanced blade", "Heavy blade", "Piercing reach"][index]
                        : slot === "armor"
                          ? ["Balanced protection", "Heavy protection", "Evasive protection"][index]
                          : ["Front-line sweep", "Rear-line strike", "Company defense"][index]}
                </span>
                <CardTitle>{item.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="item-facts">
                  {(() => {
                    const preview = {
                      ...state,
                      meta: { ...state.meta, loadout: { ...state.meta.loadout, [slot]: item.id } },
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
                <p>{item.description}</p>
                <span className="item-power">
                  Build power{" "}
                  <b>
                    {companyPower({
                      ...state,
                      meta: { ...state.meta, loadout: { ...state.meta.loadout, [slot]: item.id } },
                    }).total.toLocaleString()}
                  </b>
                </span>
                <Button
                  variant={selected ? "secondary" : "outline"}
                  data-equip={`${slot}:${item.id}`}
                  disabled={locked || selected || !inCamp}
                  onClick={() => a.equip(slot, item.id)}
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
      </div>
    );
  }
  const saveWarning = v.saveWarning && (
    <p className="save-warning" data-save-warning role="status">
      {v.saveMessage}
    </p>
  );
  return (
    <div
      data-company-level={level.level}
      className={`app-shell toon-shell ${dashboard ? "is-dashboard" : "is-road"} ${v.motionPaused ? "motion-paused" : ""} ${v.presentationPaused ? "presentation-paused" : ""} ${v.reducedMotion ? "reduced-motion" : ""}`}
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
          {v.web && <span data-playables-account-slot="" />}
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
              aria-label="Rook, his companion and pet on the old road"
              role="img"
            />
          </div>
          {dashboard && (
            <section className="chapter-hub" aria-label="Chapter selection">
              <Button
                className="bounty-banner"
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
                  <small>
                    {upcoming
                      ? `${upcoming.title} · ${upcoming.description}`
                      : "A seasoned company. The road still calls."}
                  </small>
                  <span className="bounty-track">
                    <NativeProgress
                      max={level.needed ?? 1}
                      value={level.needed === null ? 1 : level.current}
                      aria-label="Company renown"
                    />
                    <b>
                      {level.needed === null
                        ? "MASTERED"
                        : `${level.current} / ${level.needed} RENOWN`}
                    </b>
                  </span>
                </span>
                <span className="bounty-reward">
                  <GameIcon kind="skills" />
                  <b>{level.level}</b>
                </span>
              </Button>
              <aside className="hub-rail rail-left" aria-label="Build your company">
                {companyReady && (
                  <Button variant="ghost" onClick={() => go("Companions")}>
                    <GameIcon kind="company" />
                    <span>Company</span>
                  </Button>
                )}
                {petsReady && (
                  <Button variant="ghost" onClick={() => go("Pets")}>
                    <GameIcon kind="pet" />
                    <span>Pets</span>
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setDetail("stats")}>
                  <GameIcon kind="battle" />
                  <span>Stats</span>
                </Button>
              </aside>
              <div className="chapter-center">
                <div className="chapter-title">
                  <span>CHAPTER {hubChapter}</span>
                  <h1>{CHAPTERS[hubChapter - 1]!.name}</h1>
                </div>
                <div className={`chapter-island island-${hubChapter}`}>
                  <div className="island-frame">
                    {hubChapter === 1 ? (
                      <img
                        className="island-art"
                        src={chapterIsland}
                        alt="The Cinder March woodland watchtower"
                      />
                    ) : (
                      <span
                        className="island-art chapter-tile"
                        role="img"
                        aria-label={`${CHAPTERS[hubChapter - 1]!.name}, the next road for your company`}
                        style={{
                          backgroundPosition: `${((hubChapter - 2) % 2) * 100}% ${Math.floor((hubChapter - 2) / 2) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                  <span className="island-spark spark-one" />
                  <span className="island-spark spark-two" />
                  <span
                    className="island-rook toon-actor"
                    role="img"
                    aria-label="Rook ready for the journey"
                  />
                  {companyReady && (
                    <span
                      className="island-companion toon-actor"
                      style={{
                        backgroundPosition: `0 ${{ mira: 0, bram: 100 / 3, sable: 200 / 3 }[state.meta.loadout.companion]}%`,
                      }}
                      role="img"
                      aria-label={`${company.name} ready for the journey`}
                    />
                  )}
                  {petsReady && (
                    <span
                      className="island-pet toon-actor"
                      style={{
                        backgroundPosition: `0 ${{ fox: 0, hound: 50, owl: 100 }[state.meta.loadout.pet]}%`,
                      }}
                      role="img"
                      aria-label={`${pet.name} ready for the journey`}
                    />
                  )}
                  <Button
                    className="chapter-prev chapter-arrow"
                    variant="ghost"
                    aria-label="Previous chapter"
                    disabled={!inCamp || hubChapter <= 1}
                    onClick={() => setChapter(hubChapter - 1)}
                  >
                    ◀
                  </Button>
                  <Button
                    className="chapter-next chapter-arrow"
                    variant="ghost"
                    aria-label="Next chapter"
                    disabled={!inCamp || hubChapter >= state.meta.unlockedChapter}
                    onClick={() => setChapter(hubChapter + 1)}
                  >
                    ▶
                  </Button>
                </div>
                <p className="chapter-goal">{journeyStory(hubChapter).goal}</p>
                <div className="chapter-mini-actions">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMissionTab("story");
                      go("Journey");
                    }}
                  >
                    <GameIcon kind="quests" />
                    <span>Story missions</span>
                  </Button>
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
                </div>
                {saveWarning}
                <Button
                  id="start"
                  className="start-adventure"
                  disabled={!v.loaded}
                  onClick={inCamp ? launch : () => setCampOpen(false)}
                >
                  {inCamp ? "START" : "RESUME"}
                  <small>{inCamp ? "Begin the march" : "Resume journey"}</small>
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
              <aside className="hub-rail rail-right" aria-label="Missions and rewards">
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
              </aside>
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
                  Level {state.run.level}
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
              <Button variant="outline" onClick={() => setDetail("stats")}>
                <Sword />
                Current stats
              </Button>
              <Button variant="outline" onClick={() => setDetail("powers")}>
                <Flame />
                Current powers
              </Button>
              {skillReady ? (
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
                      {ROUTES[r.path].symbol} {ROUTES[r.path].name}
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
            (tip === "battle" || tip === "skill") && (
              <aside className="tutorial-card" aria-label="First battle guidance">
                <span className="guide-mira" aria-hidden="true" />
                <div>
                  <span className="sheet-kicker">MIRA’S FIELD NOTES</span>
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
                    your next march. New company systems open as your Renown grows.
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
      {!showPrologue && <PowerBelt state={state} />}
      {dashboard && (
        <nav className="game-dock" aria-label="Camp sections">
          {(
            [
              ["Equipment", "equipment", "Equipment"],
              ["Companions", "company", "Company"],
              ["Camp", "battle", "Battle"],
              ["Skills", "skills", "Skills"],
              ["Pets", "pet", "Pets"],
            ] as const
          )
            .filter(([name]) => name !== "Companions" || companyReady)
            .filter(([name]) => name !== "Skills" || skillReady)
            .filter(([name]) => name !== "Pets" || petsReady)
            .map(([name, icon, label]) => (
              <Button
                key={name}
                variant="ghost"
                aria-current={section === name ? "page" : undefined}
                onClick={() => go(name)}
              >
                <GameIcon kind={icon} />
                <span>{label}</span>
              </Button>
            ))}
        </nav>
      )}
      <Modal
        open={dashboard && section !== "Camp"}
        title={
          section === "Journey"
            ? "Missions & rewards"
            : section === "Companions"
              ? "Your company"
              : section === "Equipment"
                ? "Equipment & forge"
                : section === "Skills"
                  ? "Skills & powers"
                  : "Your pets"
        }
        className={`collection-dialog collection-${section.toLowerCase()}`}
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
        <div className="collection-banner">
          <GameIcon
            kind={
              section === "Journey"
                ? missionTab === "daily"
                  ? "daily"
                  : missionTab === "weekly"
                    ? "weekly"
                    : "quests"
                : section === "Equipment"
                  ? "equipment"
                  : section === "Companions"
                    ? "company"
                    : section === "Skills"
                      ? "skills"
                      : "pet"
            }
          />
          <div>
            <span className="sheet-kicker">
              {section === "Journey" ? "THE WAYFARER’S JOURNAL" : "PREPARE FOR THE ROAD"}
            </span>
            <h3>
              {section === "Equipment"
                ? "Every adventure starts at the forge."
                : section === "Companions"
                  ? "No one walks this road alone."
                  : section === "Pets"
                    ? "Small paws. Brave hearts."
                    : section === "Skills"
                      ? "Give your next battle an edge."
                      : "A little further. A little stronger."}
            </h3>
            <p>
              {section === "Equipment"
                ? `${weapon.name} · ${armor.name}`
                : section === "Companions"
                  ? `${company.name}, your ${company.role.toLowerCase()}, is ready.`
                  : section === "Pets"
                    ? `${pet.name} is by your side.`
                    : section === "Skills"
                      ? `${skill.name} equipped · ${effectiveSkillCooldown(state).toFixed(1)}s cooldown`
                      : `${missions[missionTab].filter((q) => q.claimed).length} / ${missions[missionTab].length} rewards collected · ${missions[missionTab].filter((q) => q.ready).length} ready to claim`}
            </p>
          </div>
          {section !== "Journey" && (
            <span className="collection-power">
              <GameIcon kind="battle" />
              <b>{power.total.toLocaleString()}</b>
              <small>COMPANY POWER</small>
            </span>
          )}
        </div>
        {dashboard && section === "Companions" && (
          <>
            <Training state={state} id="companion" actions={a} />
            {selection("companion", COMPANIONS)}
          </>
        )}
        {dashboard && section === "Pets" && (
          <>
            <Training state={state} id="pet" actions={a} />
            {selection("pet", PETS)}
          </>
        )}
        {dashboard && section === "Skills" && (
          <>
            <p className="section-note">
              Equip one active skill. Press Q or tap its button during combat. Your oaths add
              passive powers on each journey.
            </p>
            <Training state={state} id="skill" actions={a} />
            {selection("skill", SKILLS)}
            <Card className="oath-card">
              <CardHeader>
                <CardTitle>Current powers</CardTitle>
              </CardHeader>
              <CardContent>
                <Powers state={state} />
              </CardContent>
            </Card>
          </>
        )}
        {dashboard && section === "Equipment" && (
          <>
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
              <>
                <h2 className="section-title">Make the whole company stronger.</h2>
                <p className="section-note">
                  {state.meta.gold.toLocaleString()} gold available. Permanent upgrades improve
                  every weapon, companion, and pet where stated.
                </p>
                <div className="selection-grid forge">
                  {(["blade", "mail", "charm"] as const).map((id) => (
                    <Card key={id} className={`forge-card forge-${id}`}>
                      <CardHeader>
                        <div className="forge-emblem">
                          <GameIcon
                            kind={
                              id === "blade" ? "battle" : id === "mail" ? "equipment" : "skills"
                            }
                          />
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
              </>
            )}
          </>
        )}
        {dashboard && section === "Journey" && (
          <section className="mission-board" aria-label="Mission board">
            <nav className="mission-tabs" aria-label="Mission schedule">
              {(
                [
                  ["story", "Story missions"],
                  ["daily", "Daily quests"],
                  ["weekly", "Weekly quests"],
                ] as const
              )
                .filter(
                  ([scope]) => scope === "story" || (scope === "daily" ? dailyReady : weeklyReady),
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
                    <span className="mission-tab-count">
                      {missions[scope].filter((q) => q.claimed).length}/{missions[scope].length}
                    </span>
                  </Button>
                ))}
            </nav>
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
                    className={`mission-row ${quest.ready ? "is-ready" : ""} ${locked ? "is-locked" : ""}`}
                  >
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
            <p className="mission-feedback" role="status">
              {v.note}
            </p>
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
        <div className="story-letter">
          <span className="story-ranger" role="img" aria-label="Mira, your ranger companion" />
          <div>
            <span className="eyebrow">FROM MIRA’S JOURNAL · CHAPTER {introChapter ?? chapter}</span>
            <blockquote>{journeyStory(introChapter ?? chapter).opening}</blockquote>
            <p className="story-goal">
              <BookOpen />
              {journeyStory(introChapter ?? chapter).goal}
            </p>
          </div>
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
        <p>Space to pause · Q to cast · 1–3 to choose an oath.</p>
        <p>
          Gold, equipment, and unlocked chapters stay with you. Oaths belong to the current journey.
        </p>
        <Button onClick={() => setSettings(false)}>Return to the road</Button>
      </Modal>
      <Modal
        open={detail !== null}
        title={detail === "stats" ? "Current stats" : "Current powers"}
        close={() => setDetail(null)}
      >
        {detail === "stats" ? <StatList state={state} /> : <Powers state={state} />}
      </Modal>
      <Modal open={retreat} title="Return to camp?" close={() => setRetreat(false)}>
        <p>
          This ends the unfinished journey and clears its oaths. Gold, forged gear, and chapter
          unlocks stay with you.
        </p>
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => setRetreat(false)}>
            Keep this journey
          </Button>
          <Button
            onClick={() => {
              a.retreat();
              setRetreat(false);
              setCampOpen(false);
            }}
          >
            Return to camp
          </Button>
        </div>
      </Modal>
      <Modal
        open={!dashboard && v.paused && !settings && !detail && !retreat}
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
        <span className="eyebrow">
          AFTER FIGHT {state.run.cleared} · CHOOSE YOUR NEXT THREE FIGHTS
        </span>
        <p>One trail, one consequence. Your choice stays with this journey.</p>
        <div className="trail-fork">
          {state.phase.kind === "route" &&
            routeOptions(state.phase.at).map((path, i) => (
              <Card key={path} className={`trail-option trail-${path}`}>
                <CardHeader>
                  <span className="trail-symbol">{ROUTES[path].symbol}</span>
                  <CardTitle>{ROUTES[path].name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{ROUTES[path].risk}</p>
                  <strong>{ROUTES[path].reward}</strong>
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
          !dashboard && !detail && !settings && v.decisionReady && state.phase.kind === "choice"
        }
        title="Choose your next oath."
        className="decision--choice"
      >
        <span className="eyebrow">LEVEL {state.run.level} · ONE CHOICE</span>
        {tip === "oath" && (
          <div className="oath-guidance">
            <span className="guide-mira" aria-hidden="true" />
            <p>
              These oaths shape this journey. Blue is rare, violet is epic, and gold is legendary.
              Pick a power that helps your build, inspect your stats, or skip the choice.
            </p>
            <Button variant="ghost" onClick={dismissTip}>
              Got it
            </Button>
          </div>
        )}
        <p>Every journey is a different build. Choose a power, or continue without one.</p>
        <PowerBelt state={state} />
        <div className="choice-tools">
          <Button
            variant="outline"
            data-reroll=""
            disabled={state.phase.kind !== "choice" || (state.phase.rerolls ?? 1) <= 0}
            onClick={a.reroll}
          >
            <RefreshCw />{" "}
            {state.phase.kind === "choice" && (state.phase.rerolls ?? 1) > 0
              ? "Refresh choices · 1 free"
              : "Refresh used"}
          </Button>
          <Button variant="outline" onClick={() => setDetail("stats")}>
            Current stats
          </Button>
          <Button variant="outline" onClick={() => setDetail("powers")}>
            Current powers
          </Button>
        </div>
        <div className="choice-grid">
          {state.phase.kind === "choice" &&
            state.phase.options.map((id, i) => {
              const p = PERKS.find((p) => p.id === id)!;
              return (
                <Card key={id} className={`choice-card rarity-${p.rarity}`}>
                  <CardHeader>
                    <div className="card-heading">
                      <PerkSymbol family={p.family} />
                      <RarityBadge rarity={p.rarity} />
                    </div>
                    <CardTitle>{p.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <small>{p.caption}</small>
                    <p>{p.description}</p>
                    <span>
                      Rank {rank(state, id) + 1} / {p.max}
                    </span>
                    <Button
                      data-perk={id}
                      autoFocus={i === 0}
                      onClick={() => {
                        setTip(null);
                        a.choose(id);
                      }}
                    >
                      Choose oath <kbd>{i + 1}</kbd>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
        </div>
        <Button
          variant="ghost"
          id="skip-perk"
          onClick={() => {
            setTip(null);
            a.skip();
          }}
        >
          Skip this choice <ArrowRight />
        </Button>
      </Modal>
      <Modal
        open={
          !dashboard &&
          v.decisionReady &&
          (state.phase.kind === "defeat" || state.phase.kind === "victory")
        }
        title={state.phase.kind === "victory" ? "A light answers." : "Rest. Reforge. Return."}
        className={state.phase.kind === "victory" ? "decision--victory" : "decision--defeat"}
      >
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
        fresh={isFirstJourney(state)}
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
          if (!inCamp) {
            setSection("Camp");
            setCampOpen(true);
          }
        }}
        finish={(start) => {
          a.finishIntro();
          setReplayIntro(false);
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
    root.render(<GameUi snapshot={snapshot} actions={actions} />);
  flushSync(() => render(initial));
  return render;
}
