import { Badge } from "@saas-maker/ui/components/badge";
import { Button } from "@saas-maker/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@saas-maker/ui/components/card";
import {
  NativeDialog,
  NativeProgress,
  NativeSelect,
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
  Map as MapIcon,
  Pause,
  PawPrint,
  Play,
  Settings,
  Shield,
  Sparkles,
  Sword,
  Tent,
  UserRound,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
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
import { journeyStory } from "./story";

const miraPortrait = new URL("../assets/mira.png", import.meta.url).href;
const partyAtlas = new URL("../assets/party-atlas.png", import.meta.url).href;
const petAtlas = new URL("../assets/pet-atlas.png", import.meta.url).href;
function PerkSymbol({ family }: { family: Perk["family"] }) {
  return family === "steel" ? <Sword /> : family === "vitality" ? <Heart /> : <Flame />;
}

export interface UiSnapshot {
  state: GameState;
  loaded: boolean;
  saveMessage: string;
  saveWarning: boolean;
  paused: boolean;
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
  reduce(value: boolean): void;
}
const nav = [
  ["Camp", Tent],
  ["Companions", UserRound],
  ["Pets", PawPrint],
  ["Equipment", Shield],
  ["Skills", Sparkles],
  ["Journey", MapIcon],
] as const;
type Section = (typeof nav)[number][0];
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
    <dl className="stats-grid">
      {rows.map(([name, value]) => (
        <div key={name}>
          <dt>{name}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
function Powers({ state }: { state: GameState }) {
  const skill = SKILLS.find((s) => s.id === state.meta.loadout.skill)!;
  const powers = PERKS.filter((p) => rank(state, p.id) > 0);
  return (
    <div className="powers-list">
      <div className="power-row">
        <Sparkles />
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
  const [section, setSection] = useState<Section>("Camp");
  const [campOpen, setCampOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [detail, setDetail] = useState<"stats" | "powers" | null>(null);
  const [retreat, setRetreat] = useState(false);
  const [introChapter, setIntroChapter] = useState<number | null>(null);
  const [chapter, setChapter] = useState(state.run.chapter);
  const inCamp = state.phase.kind === "camp";
  const dashboard = inCamp || campOpen;
  useEffect(() => a.stage(dashboard), [a, dashboard]);
  const active = state.phase.kind === "travel" || state.phase.kind === "battle";
  const company = COMPANIONS.find((c) => c.id === state.meta.loadout.companion)!;
  const pet = PETS.find((p) => p.id === state.meta.loadout.pet)!;
  const weapon = WEAPONS.find((w) => w.id === state.meta.loadout.weapon)!;
  const armor = ARMORS.find((x) => x.id === state.meta.loadout.armor)!;
  const skill = SKILLS.find((s) => s.id === state.meta.loadout.skill)!;
  const stats = heroStats(state);
  const place = CHAPTERS[state.run.chapter - 1]!;
  const story = journeyStory(state.run.chapter);
  useEffect(
    () => a.inspect(settings || detail !== null || campOpen || retreat || introChapter !== null),
    [a, settings, detail, campOpen, retreat, introChapter],
  );
  useEffect(() => {
    if (inCamp) {
      setCampOpen(false);
      setChapter(state.run.chapter);
    }
  }, [inCamp, state.run.chapter]);
  const go = (next: Section) => {
    setSection(next);
    if (!inCamp) setCampOpen(true);
  };
  function launch() {
    setIntroChapter(chapter);
  }
  const gear = [
    [
      Sword,
      weapon.name,
      `Blade rank ${state.meta.upgrades.blade} · ${stats.damage.toFixed(0)} damage`,
    ],
    [Shield, armor.name, `Mail rank ${state.meta.upgrades.mail} · ${stats.armor} armor`],
    [
      Sparkles,
      "Ember charm",
      `Charm rank ${state.meta.upgrades.charm} · ${Math.round(stats.crit * 100)}% critical`,
    ],
  ] as const;
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
            <Card key={item.id} className={`selection-card ${selected ? "selected" : ""}`}>
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
                {(slot === "companion" || slot === "pet") && (
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
                )}
                <CardTitle>{item.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{item.description}</p>
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
    <div className={`app-shell ${dashboard ? "is-dashboard" : "is-road"}`}>
      <header className="masthead">
        <div className="brand">
          <Flame />
          <span>ember road</span>
        </div>
        <span className="header-chapter">
          CHAPTER {state.run.chapter} · {place.place}
        </span>
        <div className="header-actions">
          <span className="gold">
            <Coins />
            <b id="gold">{state.meta.gold}</b>
          </span>
          {v.web && <span data-playables-account-slot="" />}
          <Button
            id="settings-toggle"
            variant="ghost"
            size="sm"
            aria-label="Open game settings"
            onClick={() => setSettings(true)}
          >
            <Settings />
            <span className="desktop-label">Settings</span>
          </Button>
        </div>
      </header>
      <div className="workspace">
        {dashboard && (
          <aside className="sidebar">
            <nav aria-label="Camp sections">
              {nav.map(([name, Icon]) => (
                <Button
                  key={name}
                  variant={section === name ? "secondary" : "ghost"}
                  aria-current={section === name ? "page" : undefined}
                  onClick={() => go(name)}
                >
                  <Icon />
                  {name}
                </Button>
              ))}
            </nav>
            <div className="sidebar-story">
              <span className="eyebrow">THE OLD ROAD</span>
              <h2>
                Five roads.
                <br />
                One promise.
              </h2>
              <p>Bring the watchtower’s light home.</p>
              <Flame />
            </div>
          </aside>
        )}
        <main
          data-section={section}
          className={`main-content ${dashboard ? "dashboard" : "battle-layout"}`}
        >
          {dashboard && (
            <div className="page-heading">
              <span className="eyebrow">
                CHAPTER {state.run.chapter} · {place.place}
              </span>
              <h1>
                {section === "Camp"
                  ? "Make ready for the road."
                  : section === "Companions"
                    ? "Choose who walks beside you."
                    : section === "Pets"
                      ? "Small friends. Fierce hearts."
                      : section === "Equipment"
                        ? "Made for the march."
                        : section === "Skills"
                          ? "Make the next fight yours."
                          : "One light leads to another."}
              </h1>
              <p
                className={v.saveWarning && section === "Camp" ? "warning" : undefined}
                data-save-warning={v.saveWarning && section === "Camp" ? true : undefined}
                role={v.saveWarning && section === "Camp" ? "status" : undefined}
              >
                {v.saveWarning && section === "Camp"
                  ? v.saveMessage
                  : inCamp
                    ? "Choose who travels beside you and how you fight."
                    : "Your journey is paused. Inspect your company, or return to camp to change it."}
              </p>
              {!inCamp && (
                <div className="inspection-actions">
                  <Button variant="outline" onClick={() => setCampOpen(false)}>
                    <Play />
                    Resume journey
                  </Button>
                  <Button variant="ghost" onClick={() => setRetreat(true)}>
                    Return to camp and change build
                  </Button>
                </div>
              )}
            </div>
          )}
          {(!dashboard || section !== "Camp") && saveWarning}
          <div
            className={
              dashboard && section !== "Camp" ? "company-layout hidden-company" : "company-layout"
            }
          >
            <Card className="company-card">
              {dashboard && (
                <CardHeader>
                  <div className="card-heading">
                    <div>
                      <span className="eyebrow">YOUR COMPANY</span>
                      <CardTitle>Rook &amp; {company.name}</CardTitle>
                    </div>
                    <Badge variant="outline">{inCamp ? "Ready to travel" : "Journey paused"}</Badge>
                  </div>
                </CardHeader>
              )}
              {!dashboard && (
                <div className="battle-heading">
                  <div>
                    <span className="eyebrow" id="enemy-label">
                      {state.phase.kind === "battle"
                        ? `ENCOUNTER ${state.run.cleared + 1}`
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
              <div className="world-stage">
                <canvas
                  id="world"
                  ref={canvas}
                  aria-label="Rook, his companion and pet on the old road"
                  role="img"
                />
                {dashboard && (
                  <div className="company-labels">
                    <div>
                      <strong>Rook</strong>
                      <small>Front line · knight</small>
                    </div>
                    <div>
                      <strong>{company.name}</strong>
                      <small>{company.role}</small>
                    </div>
                    <div>
                      <strong>{pet.name}</strong>
                      <small>{pet.kind}</small>
                    </div>
                  </div>
                )}
              </div>
              {dashboard ? (
                <div className="company-foot">
                  <span>
                    <Wind />
                    {company.description}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => go("Companions")}>
                    Change company
                  </Button>
                </div>
              ) : (
                <div className="road-foot">
                  <span>
                    {state.run.cleared} / {ENCOUNTERS_PER_CHAPTER} waves
                  </span>
                  <NativeProgress
                    aria-label="Chapter progress"
                    max={ENCOUNTERS_PER_CHAPTER}
                    value={state.run.cleared}
                  />
                  <span>{v.note}</span>
                </div>
              )}
            </Card>
            {dashboard && (
              <Card className="gear-card">
                <CardHeader>
                  <span className="eyebrow">EQUIPPED</span>
                  <CardTitle>Made for the march</CardTitle>
                </CardHeader>
                <CardContent>
                  {gear.map(([Icon, name, desc]) => (
                    <div className="gear-row" key={name}>
                      <span className="gear-icon">
                        <Icon />
                      </span>
                      <div>
                        <strong>{name}</strong>
                        <small>{desc}</small>
                      </div>
                    </div>
                  ))}
                  <p className="gear-note">
                    <BookOpen />
                    Forged equipment stays with you between journeys.
                  </p>
                  <Button variant="outline" onClick={() => go("Equipment")}>
                    Open equipment
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
          {dashboard && section === "Camp" && (
            <Card className="skill-overview">
              <CardHeader>
                <div className="card-heading">
                  <div>
                    <span className="eyebrow">SKILL LOADOUT</span>
                    <CardTitle>Make the next fight yours</CardTitle>
                  </div>
                  <Button variant="ghost" onClick={() => go("Skills")}>
                    All skills
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="skill-columns">
                  {SKILLS.map((s) => (
                    <Button
                      className="skill-summary"
                      variant="ghost"
                      key={s.id}
                      onClick={() => go("Skills")}
                    >
                      <span className="skill-summary-top">
                        <span className="gear-icon">
                          <Sparkles />
                        </span>
                        <Badge variant="outline">
                          {s.id === skill.id
                            ? "Equipped"
                            : s.chapter > state.meta.unlockedChapter
                              ? `Chapter ${s.chapter}`
                              : "Available"}
                        </Badge>
                      </span>
                      <strong>{s.name}</strong>
                      <span>{s.description}</span>
                      <small>
                        {s.cooldown}s cooldown ·{" "}
                        {s.id === skill.id ? "one active skill" : "view skill"} <ArrowRight />
                      </small>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {dashboard && section === "Companions" && selection("companion", COMPANIONS)}
          {dashboard &&
            section === "Pets" &&
            selection(
              "pet",
              PETS.map((p) => ({ ...p, name: `${p.name} · ${p.kind}` })),
            )}
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
              <h2 className="section-title">Weapon</h2>
              {selection("weapon", WEAPONS)}
              <h2 className="section-title">Armor</h2>
              {selection("armor", ARMORS)}
              <h2 className="section-title">The forge</h2>
              <p className="section-note">
                Permanent upgrades improve every weapon, companion, and pet where stated.
              </p>
              <div className="selection-grid forge">
                {(["blade", "mail", "charm"] as const).map((id) => (
                  <Card key={id}>
                    <CardHeader>
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
          {dashboard && section === "Journey" && (
            <div className="journey-list">
              {CHAPTERS.map((c, i) => (
                <Card key={c.name}>
                  <CardHeader>
                    <span className="eyebrow">
                      CHAPTER {i + 1} {i + 1 > state.meta.unlockedChapter ? "· LOCKED" : ""}
                    </span>
                    <CardTitle>{c.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{c.description}</p>
                    <p>
                      <strong>{journeyStory(i + 1).title}</strong>
                    </p>
                    <blockquote>{journeyStory(i + 1).opening}</blockquote>
                    <small>Mira’s letters · before the company set out</small>
                  </CardContent>
                </Card>
              ))}
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
          {dashboard && (
            <footer className="camp-footer">
              <div>
                <span className="eyebrow">ROOK’S CONDITION</span>
                <div className="quick-stats">
                  <span>
                    health
                    <strong>
                      {Math.ceil(state.run.hp)}
                      <small>/{stats.hp}</small>
                    </strong>
                  </span>
                  <span>
                    damage<strong>{stats.damage.toFixed(0)}</strong>
                  </span>
                  <span>
                    attacks / sec<strong>{(1 / stats.interval).toFixed(2)}</strong>
                  </span>
                  <span>
                    critical
                    <strong>
                      {Math.round(stats.crit * 100)}
                      <small>%</small>
                    </strong>
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setDetail("stats")}>
                    All stats
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDetail("powers")}>
                    Current powers
                  </Button>
                </div>
              </div>
              <div className="begin-area">
                {inCamp && (
                  <NativeSelect
                    aria-label="Choose chapter"
                    value={chapter}
                    onChange={(e) => setChapter(Number(e.target.value))}
                  >
                    {CHAPTERS.filter((_, i) => i < state.meta.unlockedChapter).map((c, i) => (
                      <option value={i + 1} key={c.name}>
                        Chapter {i + 1} · {c.name}
                      </option>
                    ))}
                  </NativeSelect>
                )}
                <Button
                  id="start"
                  disabled={!v.loaded}
                  onClick={inCamp ? launch : () => setCampOpen(false)}
                >
                  <ArrowRight />
                  {inCamp ? "Begin the march" : "Resume journey"}
                </Button>
              </div>
            </footer>
          )}
          <p
            id="save-status"
            className={`save-status ${v.saveWarning ? "warning" : ""}`}
            role="status"
          >
            {v.saveMessage}
          </p>
        </main>
      </div>
      <Modal
        open={introChapter !== null}
        title={journeyStory(introChapter ?? chapter).title}
        close={() => setIntroChapter(null)}
        className="chapter-opening"
      >
        <div className="story-letter">
          <img src={miraPortrait} alt="Mira carrying her journal and lantern" />
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
      <Modal open={settings} title="A quieter road." close={() => setSettings(false)}>
        <p>Gentler movement. The same combat timing.</p>
        <label className="motion-control" htmlFor="reduce-motion">
          <Switch
            id="reduce-motion"
            aria-label="Reduced motion"
            checked={v.reducedMotion}
            onCheckedChange={a.reduce}
          />
          Reduced motion
        </label>
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
