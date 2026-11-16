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
import { type ReactNode, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
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
import { companyPower } from "./power";
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
  choose(id: PerkId): void;
  skip(): void;
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
  useEffect(() => {
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
    ["Companion damage", `${s.companionDamage} / ${s.companionInterval}s`],
    ["Pet damage", `${s.petDamage} / ${s.petInterval}s`],
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
function GameUi({ snapshot: v, actions: a }: { snapshot: UiSnapshot; actions: UiActions }) {
  const { state } = v;
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current) a.canvas(canvas.current);
  }, [a]);
  const [replayIntro, setReplayIntro] = useState(false);
  const experience = experienceOf(state);
  const showPrologue = v.loaded && (!experience.introSeen || replayIntro);
  const [section, setSection] = useState<Section>("Camp");
  const [equipmentTab, setEquipmentTab] = useState<"weapon" | "armor" | "forge">("weapon");
  const [missionTab, setMissionTab] = useState<QuestScope>("story");
  const [campOpen, setCampOpen] = useState(false);
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
  const readyRewards = [...missions.story, ...missions.daily, ...missions.weekly].filter(
    (q) => q.ready,
  ).length;
  useEffect(
    () =>
      a.inspect(
        showPrologue ||
          settings ||
          detail !== null ||
          campOpen ||
          retreat ||
          introChapter !== null ||
          section !== "Camp",
      ),
    [a, settings, detail, campOpen, retreat, introChapter, section, showPrologue],
  );
  useEffect(() => {
    if (inCamp) {
      setCampOpen(false);
      setChapter(state.run.chapter);
    }
  }, [inCamp, state.run.chapter]);
  const go = (next: Section) => {
    if (next === "Journey") a.refreshMissions();
    setSection(next);
    if (!inCamp) setCampOpen(true);
  };
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
                                `${attributes.companionDamage} damage`,
                                `${attributes.companionInterval}s attack`,
                              ]
                            : slot === "pet"
                              ? [
                                  `${attributes.petDamage} damage`,
                                  `${attributes.petInterval}s attack`,
                                ]
                              : [`${SKILLS[index]!.cooldown}s cooldown`, "Q · active"];
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
            <small>Level {state.run.level}</small>
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
                  setMissionTab("daily");
                  go("Journey");
                }}
              >
                <GameIcon kind="quests" />
                <span>
                  <strong>WAYFARER’S CALLING</strong>
                  <small>{missions.daily[0]!.description}</small>
                  <span className="bounty-track">
                    <NativeProgress
                      max={missions.daily[0]!.target}
                      value={missions.daily[0]!.progress}
                      aria-label="Daily foe quest progress"
                    />
                    <b>
                      {missions.daily[0]!.progress} / {missions.daily[0]!.target}
                    </b>
                  </span>
                </span>
                <span className="bounty-reward">
                  <GameIcon kind="gold" />
                  <b>{missions.daily[0]!.reward}</b>
                </span>
              </Button>
              <aside className="hub-rail rail-left" aria-label="Build your company">
                <Button variant="ghost" onClick={() => go("Companions")}>
                  <GameIcon kind="company" />
                  <span>Company</span>
                </Button>
                <Button variant="ghost" onClick={() => go("Pets")}>
                  <GameIcon kind="pet" />
                  <span>Pets</span>
                </Button>
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
                  <span
                    className="island-companion toon-actor"
                    style={{
                      backgroundPosition: `0 ${{ mira: 0, bram: 100 / 3, sable: 200 / 3 }[state.meta.loadout.companion]}%`,
                    }}
                    role="img"
                    aria-label={`${company.name} ready for the journey`}
                  />
                  <span
                    className="island-pet toon-actor"
                    style={{
                      backgroundPosition: `0 ${{ fox: 0, hound: 50, owl: 100 }[state.meta.loadout.pet]}%`,
                    }}
                    role="img"
                    aria-label={`${pet.name} ready for the journey`}
                  />
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
                    onClick={() => {
                      setMissionTab("weekly");
                      go("Journey");
                    }}
                  >
                    <GameIcon kind="rewards" />
                    <span>Chapter rewards</span>
                    {readyRewards > 0 && <b className="notification">{readyRewards}</b>}
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
                  {missions.story.some((q) => q.ready) && <b className="notification">!</b>}
                </Button>
              </aside>
            </section>
          )}
          {!dashboard && (
            <div className="battle-heading">
              <div>
                <span className="eyebrow" id="enemy-label">
                  {state.phase.kind === "battle"
                    ? `ENCOUNTER ${state.run.cleared + 1} / ${ENCOUNTERS_PER_CHAPTER}`
                    : "THE OLD ROAD"}
                </span>
                <h1>{place.name}</h1>
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
            </div>
          )}

          {!showPrologue &&
            !dashboard &&
            state.phase.kind === "battle" &&
            (!experience.lessons.battle || !experience.lessons.skill) && (
              <aside className="tutorial-card" aria-label="First battle guidance">
                <span className="guide-mira" aria-hidden="true" />
                <div>
                  <span className="sheet-kicker">MIRA’S FIELD NOTES</span>
                  <h3>
                    {!experience.lessons.battle ? "We fight together." : `${skill.name} is ready.`}
                  </h3>
                  <p>
                    {!experience.lessons.battle
                      ? `Rook fights automatically at the front. ${company.name}: ${company.description}`
                      : `Press Q or the skill button to cast ${skill.name}. ${skill.description}`}
                  </p>
                  <div>
                    <Button
                      onClick={() => a.learn(!experience.lessons.battle ? "battle" : "skill")}
                    >
                      {!experience.lessons.battle ? "Got it" : "Keep going"}
                    </Button>
                    <Button variant="ghost" onClick={a.skipGuidance}>
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
            !experience.lessons.camp && (
              <aside className="tutorial-card camp-guide" aria-label="Camp guidance">
                <span className="guide-mira" aria-hidden="true" />
                <div>
                  <span className="sheet-kicker">A STRONGER COMPANY</span>
                  <h3>The road rewards preparation.</h3>
                  <p>
                    Your gold stays with you. Forge permanent upgrades, choose equipment, and check
                    the daily quests before your next march.
                  </p>
                  <div>
                    <Button
                      onClick={() => {
                        a.learn("camp");
                        setEquipmentTab("forge");
                        go("Equipment");
                      }}
                    >
                      Visit the forge
                    </Button>
                    <Button variant="ghost" onClick={() => a.learn("camp")}>
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
          ).map(([name, icon, label]) => (
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
                      ? `${skill.name} equipped · ${skill.cooldown}s cooldown`
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
        {dashboard && section === "Companions" && selection("companion", COMPANIONS)}
        {dashboard && section === "Pets" && selection("pet", PETS)}
        {dashboard && section === "Skills" && (
          <>
            <p className="section-note">
              Equip one active skill. Press Q or tap its button during combat. Your oaths add
              passive powers on each journey.
            </p>
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
              ).map(([scope, label]) => (
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
        open={!dashboard && v.decisionReady && state.phase.kind === "choice"}
        title="Choose your next oath."
        className="decision--choice"
      >
        <span className="eyebrow">LEVEL {state.run.level} · ONE CHOICE</span>
        {!experience.lessons.oath && (
          <div className="oath-guidance">
            <span className="guide-mira" aria-hidden="true" />
            <p>
              These oaths shape this journey. Blue is rare, violet is epic, and gold is legendary.
              Pick a power that helps your build, inspect your stats, or skip the choice.
            </p>
            <Button variant="ghost" onClick={() => a.learn("oath")}>
              Got it
            </Button>
          </div>
        )}
        <p>Every journey is a different build. Choose a power, or continue without one.</p>
        <div className="choice-tools">
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
                    <Button data-perk={id} onClick={() => a.choose(id)}>
                      Choose oath <kbd>{i + 1}</kbd>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
        </div>
        <Button variant="ghost" id="skip-perk" onClick={a.skip}>
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
            ? "CHAPTER COMPLETE"
            : "THE MARCH ENDS. THE OATH REMAINS."}
        </span>
        <p>
          {state.phase.kind === "victory"
            ? story.outcome
            : `${state.phase.kind === "defeat" ? state.phase.enemy : "The road"} stopped you after ${state.run.cleared} waves. Your gold and forged gear are safe.`}
        </p>
        {state.phase.kind === "victory" && (
          <p>
            <Coins /> {state.phase.reward} chapter gold · {state.meta.gold} gold kept
          </p>
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
          <Button variant="outline" onClick={() => setIntroChapter(state.run.chapter)}>
            Try this chapter again
          </Button>
        </div>
      </Modal>
      <StoryOpening
        open={showPrologue}
        fresh={isFirstJourney(state)}
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
