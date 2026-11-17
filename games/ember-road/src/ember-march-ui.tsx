import { Button } from "@saas-maker/ui/components/button";
import { NativeProgress } from "@saas-maker/ui/components/native-controls";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Coins,
  Flame,
  Heart,
  Pause,
  Play,
  RefreshCw,
  Settings,
  Shield,
  Skull,
  Sparkles,
  Sword,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { type CSSProperties, useId } from "react";
import { SunfangArt } from "./first-light-ui";
import { GameIcon } from "./game-icon";
import { heroAtlas, sunfangEquipped } from "./hero-art";
import { LoadoutArt } from "./loadout-art";
import {
  type GameState,
  heroStats,
  PERKS,
  type PerkId,
  rank,
  SKILLS,
  UPGRADE_CAP,
  type UpgradeId,
  upgradeCost,
  xpNeeded,
} from "./model";
import { PerkArt } from "./perk-art";
import { companyPower } from "./power";
import { systemUnlocked } from "./progression";

// This copy describes existing combat effects. The model owns their values and triggers.
const powerCopy: Record<PerkId, { trigger: string; effect: string }> = {
  edge: { trigger: "PASSIVE", effect: "+25% sword damage per rank." },
  tempo: { trigger: "PASSIVE", effect: "Attack 18% faster per rank." },
  blood: {
    trigger: "ON YOUR DAMAGE",
    effect: "Heal for 10% of damage dealt per rank. Combo reactions excluded.",
  },
  heart: { trigger: "PASSIVE", effect: "+35 maximum health. Heal 35 now." },
  bastion: {
    trigger: "ON TAKING DAMAGE",
    effect: "Reduce damage reaching health by 3 per rank, to a minimum of 1.",
  },
  storm: { trigger: "EVERY THIRD STRIKE", effect: "Call lightning for 18 extra damage per rank." },
  thorns: { trigger: "ON TAKING A HIT", effect: "Return 5 damage per rank to your attacker." },
  renewal: { trigger: "AFTER A WAVE", effect: "Recover 8% maximum health per rank." },
  execution: {
    trigger: "ON STRIKING",
    effect: "+40% damage per rank against enemies below half health.",
  },
  cleave: {
    trigger: "ON STRIKING",
    effect: "Deal 45% of sword damage per rank to other front-line foes.",
  },
  pierce: { trigger: "ON STRIKING", effect: "Deal 40% sword damage per rank to a rear-line foe." },
  interrupt: {
    trigger: "EVERY THIRD STRIKE",
    effect: "Cancel unbraced attacks and delay foes by 1.2s per rank.",
  },
  ward: {
    trigger: "ON RANGED HITS",
    effect: "Take 35% less ranged damage per rank, capped at 70%.",
  },
  chain: {
    trigger: "EVERY THIRD STRIKE",
    effect: "Lightning hits every other foe for 14 damage per rank.",
  },
};

function MarchPower({ state, id, inspect }: { state: GameState; id: PerkId; inspect(): void }) {
  const label = useId();
  const p = PERKS.find((p) => p.id === id)!;
  return (
    <Button
      variant="ghost"
      className={`march-power rarity-${p.rarity}`}
      aria-label={`${p.title}, rank ${rank(state, id)}`}
      aria-describedby={label}
      data-march-power={id}
      onClick={inspect}
    >
      <PerkArt id={id} />
      <b>{rank(state, id)}</b>
      <span className="march-power-tip" role="tooltip" id={label}>
        <strong>{p.title}</strong>
        <span>{powerCopy[id].effect}</span>
        <small>
          Rank {rank(state, id)} / {p.max} · This run
        </small>
      </span>
    </Button>
  );
}

interface MarchProps {
  state: GameState;
  loaded: boolean;
  paused: boolean;
  audioControls: boolean;
  sound: boolean;
  atCamp: boolean;
  kills: number;
  total: number;
  earnedGold: number;
  firstClear: boolean;
  saveWarning: string | null;
  start(): void;
  pause(): void;
  settings(): void;
  soundToggle(): void;
  equipment(): void;
  inspectBuild(): void;
  retreat(): void;
  otherRoads(): void;
  finish(): void;
}

export function EmberMarchUi(p: MarchProps) {
  const { state } = p;
  const s = heroStats(state);
  const won = state.phase.kind === "victory";
  const lost = state.phase.kind === "defeat";
  const powers = PERKS.filter((perk) => rank(state, perk.id) > 0);
  const skill = SKILLS.find((skill) => skill.id === state.meta.loadout.skill)!;
  const stats = [
    {
      icon: <Sword />,
      name: "Damage",
      value: Number(s.damage.toFixed(1)),
      hint: "Damage before enemy armor and critical strikes",
    },
    {
      icon: <Zap />,
      name: "Attack speed",
      value: `${(1 / s.interval).toFixed(2)}/s`,
      hint: "Ordinary attacks per second",
    },
    {
      icon: <Sparkles />,
      name: "Critical chance",
      value: `${Math.round(s.crit * 100)}%`,
      hint: "Chance for an ordinary strike to deal critical damage",
    },
    {
      icon: <Shield />,
      name: "Defense",
      value: s.armor,
      hint: "Flat damage reduction after Barrier",
    },
    {
      icon: <Heart />,
      name: "Lifesteal",
      value: `${Math.round(s.lifesteal * 100)}%`,
      hint: "Healing from Rook’s damage; build-combo reactions excluded",
    },
    {
      icon: <GameIcon kind="battle" />,
      name: "Cleave",
      value: `${Math.round(s.cleave * 100)}%`,
      hint: "Sword damage dealt to other front-line foes",
    },
    {
      icon: <ChevronRight />,
      name: "Rear-line pierce",
      value: `${Math.round(s.pierce * 100)}%`,
      hint: "Sword damage dealt to one rear-line foe",
    },
    {
      icon: <Shield />,
      name: "Arrow ward",
      value: `${Math.round(s.rangedResistance * 100)}%`,
      hint: "Ranged damage resisted before flat Defense",
    },
  ];
  return (
    <section
      className={`ember-march-ui ${p.atCamp ? "march-at-camp" : ""} ${won || lost ? "march-ended" : ""}`}
      aria-label="Ember March"
      data-run-time={state.run.time}
      data-march-phase={state.phase.kind}
    >
      <header className="march-header">
        <Button
          variant="ghost"
          className="march-profile"
          disabled={!p.loaded}
          onClick={p.equipment}
          aria-label="Inspect Rook’s equipment"
        >
          <span
            className="march-avatar"
            style={{ backgroundImage: `url("${heroAtlas(state)}")` }}
          />
          <span>
            <small>ROOK</small>
            <strong>
              <Sword />
              {companyPower(state).total}
              <em>POWER</em>
            </strong>
          </span>
        </Button>
        <div className="march-chapter">
          <span>EMBER ROAD</span>
          <strong>THE EMBERWOOD</strong>
          {!p.atCamp && (
            <>
              <NativeProgress value={p.kills} max={p.total} aria-label="March progress" />
              <small>
                {p.kills} / {p.total} enemies defeated
              </small>
            </>
          )}
        </div>
        <div className="march-tools">
          <span className="march-coins">
            <GameIcon kind="gold" />
            <b>{state.meta.gold}</b>
          </span>
          {!p.atCamp && !won && !lost && (
            <Button
              variant="ghost"
              size="icon"
              onClick={p.pause}
              aria-label={p.paused ? "Resume Ember March" : "Pause Ember March"}
            >
              {p.paused ? <Play /> : <Pause />}
            </Button>
          )}
          {p.audioControls && (
            <Button
              variant="ghost"
              size="icon"
              disabled={!p.loaded}
              onClick={p.soundToggle}
              aria-label={p.sound ? "Mute game audio" : "Enable game audio"}
            >
              {p.sound ? <Volume2 /> : <VolumeX />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            disabled={!p.loaded}
            onClick={p.settings}
            aria-label="Ember March settings"
          >
            <Settings />
          </Button>
        </div>
      </header>

      {p.atCamp ? (
        <div className="march-departure">
          <div className="march-camp-hero">
            <span
              style={{ backgroundImage: `url("${heroAtlas(state)}")` }}
              role="img"
              aria-label="Rook, ready for the road"
            />
            <small>THE LANTERN BEARER</small>
          </div>
          <div className="march-departure-copy">
            <span className="march-kicker">A NEW ROAD THROUGH THE WOODS</span>
            <h1>
              The light
              <br />
              is yours to carry.
            </h1>
            <p>
              The old watchtower has gone dark.
              <br />
              Find your strength on the way.
            </p>
            <Button
              className="march-primary"
              disabled={!p.loaded}
              onClick={p.start}
              data-start-march=""
            >
              <GameIcon kind="battle" /> Begin the march <ArrowRight />
            </Button>
            <small>Fight. Level up. Build something powerful.</small>
            <div className="march-camp-links">
              <Button variant="ghost" disabled={!p.loaded} onClick={p.equipment}>
                <Shield /> Equipment & forge
              </Button>
              <Button variant="ghost" disabled={!p.loaded} onClick={p.otherRoads}>
                Other roads <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="march-run-note">
            <i className={p.paused ? "paused" : ""} />
            {p.paused ? "PAUSED" : "AUTO BATTLE"}
            <span>Shape your power as you go.</span>
          </div>
          {p.paused && !won && !lost && (
            <div className="march-paused-sign">
              <Pause />
              <strong>The road can wait.</strong>
              <Button variant="ghost" onClick={p.pause}>
                <Play /> Resume
              </Button>
              <Button variant="ghost" onClick={p.retreat} data-march-retreat="">
                Return to camp
              </Button>
            </div>
          )}
          <footer className="march-ledger">
            <div className="march-vitals">
              <div className="march-level-seal">
                <strong>{state.run.level}</strong>
                <small>LEVEL</small>
              </div>
              <div className="march-meter march-xp">
                <span>
                  XP{" "}
                  <b data-march-xp="">
                    {state.run.xp} / {xpNeeded(state)}
                  </b>
                </span>
                <NativeProgress
                  value={state.run.xp}
                  max={xpNeeded(state)}
                  aria-label="Run experience"
                />
              </div>
              <div className="march-meter march-hp">
                <span>
                  <Heart /> HEALTH{" "}
                  <b>
                    {Math.ceil(state.run.hp)} / {s.hp}
                  </b>
                </span>
                <NativeProgress value={state.run.hp} max={s.hp} aria-label="Rook’s health" />
              </div>
              <div className="march-meter march-barrier">
                <span>
                  <Shield /> BARRIER{" "}
                  <b>
                    {Math.ceil(state.run.shield)} / {Math.round(s.hp * 0.3)}
                  </b>
                </span>
                <NativeProgress
                  value={state.run.shield}
                  max={s.hp * 0.3}
                  aria-label="Rook’s barrier"
                />
              </div>
              <span className="march-kill-count">
                <Skull />
                <b>{p.kills}</b>
                <small>DEFEATED</small>
              </span>
            </div>
            <dl className="march-stats" aria-label="Live combat stats">
              {stats.map((row) => (
                <div key={row.name} title={row.hint}>
                  <dt>
                    {row.icon}
                    {row.name}
                  </dt>
                  <dd key={row.value}>{row.value}</dd>
                </div>
              ))}
            </dl>
            <section className="march-powers" aria-label="Current powers">
              <span>
                YOUR
                <br />
                <b>BUILD</b>
              </span>
              <div>
                {systemUnlocked(state, "skills") && (
                  <span
                    className="march-auto-skill"
                    title={`${skill.name}: ${skill.description} Cast automatically when ready.`}
                  >
                    <LoadoutArt slot="skill" id={skill.id} />
                    <span>
                      <b>{skill.name}</b>
                      <small>
                        AUTO ·{" "}
                        {state.run.skillCooldown > 0
                          ? `${state.run.skillCooldown.toFixed(1)}s`
                          : "READY"}
                      </small>
                    </span>
                  </span>
                )}
                {powers.map((perk) => (
                  <MarchPower key={perk.id} state={state} id={perk.id} inspect={p.inspectBuild} />
                ))}
                {!powers.length && <small>Your first power arrives at level 2.</small>}
              </div>
              <Button
                variant="ghost"
                disabled={!p.loaded}
                onClick={p.equipment}
                aria-label="Inspect equipment during the march"
              >
                <Shield />
                <span>Equipment</span>
              </Button>
            </section>
          </footer>
        </>
      )}

      {(won || lost) && (
        <div className="march-result" role="status">
          <div className="march-result-crest">
            <GameIcon kind={won ? "rewards" : "equipment"} />
          </div>
          <span className="march-kicker">
            {won ? "THE EMBERWOOD · CLEARED" : "THE ROAD WILL WAIT"}
          </span>
          <h1>{won ? "A light answers." : "Rest. Return stronger."}</h1>
          <p>
            {won
              ? "You carried the spark through the woods."
              : "Your earned gold is safe. A stronger blade may turn the next fight."}
          </p>
          <div className="march-result-spoils">
            <span>
              <Skull />
              <b>{p.kills}</b>
              <small>ENEMIES</small>
            </span>
            <span>
              <GameIcon kind="gold" />
              <b>+{p.earnedGold}</b>
              <small>GOLD KEPT</small>
            </span>
            <span>
              <Flame />
              <b>{state.run.level}</b>
              <small>RUN LEVEL</small>
            </span>
          </div>
          {won && p.firstClear && (
            <p className="march-first-clear">
              <Check /> First-clear bonus included
            </p>
          )}
          <Button className="march-primary" onClick={p.finish} data-march-finish="">
            <GameIcon kind="equipment" /> Prepare the next journey <ArrowRight />
          </Button>
        </div>
      )}
      {p.saveWarning && (
        <p className="march-save-warning" role="status">
          {p.saveWarning}
        </p>
      )}
    </section>
  );
}

export function MarchChoices({
  state,
  options,
  rerolls,
  choose,
  reroll,
  skip,
  inspect,
}: {
  state: GameState;
  options: readonly PerkId[];
  rerolls: number;
  choose(id: PerkId): void;
  reroll(): void;
  skip(): void;
  inspect(): void;
}) {
  return (
    <section className="march-choice-content">
      <header>
        <span className="march-level-ribbon">
          <Sparkles /> LEVEL UP! <Sparkles />
        </span>
        <h2>Choose a new power</h2>
        <p>Level {state.run.level} · Yours for this journey</p>
      </header>
      <div className="march-choice-list">
        {options.map((id, index) => {
          const perk = PERKS.find((p) => p.id === id)!;
          return (
            <Button
              key={id}
              variant="ghost"
              className={`march-choice-row rarity-${perk.rarity}`}
              onClick={() => choose(id)}
              data-march-perk={id}
              style={{ "--entry": `${index * 50}ms` } as CSSProperties}
              aria-label={`Choose ${perk.title}, ${perk.rarity}, rank ${rank(state, id) + 1}`}
            >
              <span className="march-choice-icon">
                <PerkArt id={id} />
              </span>
              <span className="march-choice-copy">
                <small className="march-rarity">
                  {perk.rarity}{" "}
                  <i>
                    RANK {rank(state, id) + 1} / {perk.max}
                  </i>
                </small>
                <strong>{perk.title}</strong>
                <span>
                  <b>{powerCopy[id].trigger}</b> {powerCopy[id].effect}
                </span>
              </span>
              <kbd>{index + 1}</kbd>
            </Button>
          );
        })}
      </div>
      <footer>
        <Button variant="ghost" disabled={rerolls < 1} onClick={reroll} data-march-reroll="">
          <RefreshCw />
          {rerolls ? "Refresh · 1 free" : "Refresh used"}
        </Button>
        <Button variant="ghost" onClick={inspect} data-march-inspect="">
          <Shield /> Inspect build
        </Button>
        <Button variant="ghost" onClick={skip} data-march-skip="">
          Skip <ArrowRight />
        </Button>
      </footer>
    </section>
  );
}

export function MarchGift({
  state,
  options,
  choose,
}: {
  state: GameState;
  options: readonly PerkId[];
  choose(id: PerkId): void;
}) {
  return (
    <section className="march-choice-content march-gift-content">
      <header>
        <span className="march-level-ribbon">
          <Flame /> A LITTLE LIGHT <Flame />
        </span>
        <h2>The old lantern still burns.</h2>
        <p>Take a little strength for the road ahead.</p>
      </header>
      <div className="march-choice-list">
        {options.map((id) => {
          const perk = PERKS.find((p) => p.id === id)!;
          return (
            <Button
              key={id}
              variant="ghost"
              className={`march-choice-row rarity-${perk.rarity}`}
              onClick={() => choose(id)}
              data-march-gift={id}
              aria-label={`Accept ${perk.title}, rank ${rank(state, id) + 1}`}
            >
              <span className="march-choice-icon">
                <PerkArt id={id} />
              </span>
              <span className="march-choice-copy">
                <small className="march-rarity">
                  A GIFT{" "}
                  <i>
                    RANK {rank(state, id) + 1} / {perk.max}
                  </i>
                </small>
                <strong>{perk.title}</strong>
                <span>{powerCopy[id].effect}</span>
              </span>
              <ChevronRight />
            </Button>
          );
        })}
      </div>
      <p className="march-gift-note">A gift, freely given.</p>
    </section>
  );
}

export function MarchForge({
  state,
  upgrade,
  equip,
  retreat,
}: {
  state: GameState;
  upgrade(id: UpgradeId): void;
  equip(): void;
  retreat(): void;
}) {
  const atCamp = state.phase.kind === "camp";
  const activeSunfang = sunfangEquipped(state);
  const stats = heroStats(state);
  return (
    <section className="march-forge">
      <div className="march-forge-hero">
        <span
          style={{ backgroundImage: `url("${heroAtlas(state)}")` }}
          role="img"
          aria-label="Rook in his equipped gear"
        />
        <div>
          <small>ROOK · LANTERN BEARER</small>
          <h3>
            {companyPower(state).total} <small>POWER</small>
          </h3>
          <p>
            {stats.damage.toFixed(1)} damage · {stats.hp} health · {stats.armor} defense
          </p>
        </div>
      </div>
      {!atCamp && (
        <Button variant="outline" onClick={retreat} data-march-retreat="">
          Return to camp to upgrade <ArrowRight />
        </Button>
      )}
      <div className="march-forge-wallet">
        <Coins /> {state.meta.gold} gold{" "}
        <small>{atCamp ? "Forge permanent upgrades." : "Inspect freely. Upgrade at camp."}</small>
      </div>
      <div className="march-forge-upgrades">
        {(
          [
            {
              id: "blade",
              name: "Sharpen your blade",
              effect: "+4 permanent base damage",
              icon: <Sword />,
            },
            {
              id: "mail",
              name: "Reinforce your mail",
              effect: "+25 health · +1 defense",
              icon: <Shield />,
            },
            {
              id: "charm",
              name: "Kindle your charm",
              effect: "+2.5% critical chance · Max 50%",
              icon: <Sparkles />,
            },
          ] as const
        ).map((item) => {
          const capped = state.meta.upgrades[item.id] >= UPGRADE_CAP;
          const cost = upgradeCost(state, item.id);
          return (
            <div key={item.id} className="march-forge-upgrade">
              {item.icon}
              <span>
                <b>{item.name}</b>
                <small>
                  {item.effect} · Rank {state.meta.upgrades[item.id]} / {UPGRADE_CAP}
                </small>
              </span>
              <Button
                disabled={!atCamp || capped || state.meta.gold < cost}
                onClick={() => upgrade(item.id)}
                data-march-upgrade={item.id}
              >
                {capped ? (
                  <Check />
                ) : (
                  <>
                    <Coins /> {cost}
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>
      {state.meta.gear?.owned.includes("sunfang") && (
        <div className="march-owned-blade">
          <SunfangArt />
          <span>
            <small>RARE · SWORD</small>
            <strong>Sunfang</strong>
            <p>+12 damage · Cleave</p>
          </span>
          <Button disabled={!atCamp || activeSunfang} onClick={equip}>
            {activeSunfang ? (
              <>
                <Check /> Equipped
              </>
            ) : (
              "Equip"
            )}
          </Button>
        </div>
      )}
    </section>
  );
}

export function MarchBuild({ state }: { state: GameState }) {
  const s = heroStats(state);
  const rows = [
    ["Health", `${Math.ceil(state.run.hp)} / ${s.hp}`],
    ["Barrier", `${Math.ceil(state.run.shield)} / ${Math.round(s.hp * 0.3)}`],
    ["Damage", Number(s.damage.toFixed(1))],
    ["Attack speed", `${(1 / s.interval).toFixed(2)}/s`],
    ["Critical chance", `${Math.round(s.crit * 100)}%`],
    ["Defense", s.armor],
    ["Lifesteal", `${Math.round(s.lifesteal * 100)}%`],
    ["Cleave", `${Math.round(s.cleave * 100)}%`],
    ["Rear-line pierce", `${Math.round(s.pierce * 100)}%`],
    ["Arrow ward", `${Math.round(s.rangedResistance * 100)}%`],
  ];
  const powers = PERKS.filter((p) => rank(state, p.id) > 0);
  const skill = SKILLS.find((skill) => skill.id === state.meta.loadout.skill)!;
  return (
    <section className="march-build">
      <dl className="march-stats">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <h3>Your powers</h3>
      <div className="march-build-powers">
        {systemUnlocked(state, "skills") && (
          <div>
            <LoadoutArt slot="skill" id={skill.id} />
            <span>
              <strong>
                {skill.name} <small>AUTO</small>
              </strong>
              <p>{skill.description}</p>
            </span>
          </div>
        )}
        {powers.map((p) => (
          <div key={p.id}>
            <PerkArt id={p.id} />
            <span>
              <strong>
                {p.title}{" "}
                <small>
                  RANK {rank(state, p.id)} / {p.max}
                </small>
              </strong>
              <p>{powerCopy[p.id].effect}</p>
            </span>
          </div>
        ))}
        {!powers.length && <p>No powers yet. Your first choice is waiting.</p>}
      </div>
    </section>
  );
}
