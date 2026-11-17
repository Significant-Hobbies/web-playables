import { Button } from "@saas-maker/ui/components/button";
import {
  ArrowRight,
  Check,
  Heart,
  Pause,
  Play,
  Settings,
  Shield,
  Sword,
  Volume2,
  VolumeX,
} from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { GameIcon } from "./game-icon";
import { heroAtlas, sunfangEquipped } from "./hero-art";
import { LoadoutArt } from "./loadout-art";
import { ARMORS, type GameState, heroStats, WEAPONS } from "./model";
import { companyPower } from "./power";

export function SunfangArt({ ordinary = false }: { ordinary?: boolean }) {
  return (
    <svg
      className={`sunfang-art ${ordinary ? "is-ordinary" : ""}`}
      viewBox="0 0 200 240"
      fill="none"
      aria-hidden="true"
    >
      <g
        transform="rotate(23 100 120)"
        stroke="#202126"
        strokeWidth="6"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="m100 14 28 28v115l-28 21-28-21V42Z" fill={ordinary ? "#91a6bd" : "#b62d22"} />
        <path
          d="m100 20 15 25v106l-15 14-15-14V45Z"
          fill={ordinary ? "#e3eff4" : "#ff8436"}
          strokeWidth="3"
        />
        <path d="m100 20 1 143" stroke={ordinary ? "#fff" : "#ffe68b"} strokeWidth="6" />
        <path d="m61 156 25-4 14 10 14-10 25 4 7 17-31 3-15 13-15-13-31-3Z" fill="#ffc74f" />
        <path
          d="m100 157 5 9 10 2-8 7 2 10-9-5-9 5 2-10-8-7 10-2Z"
          fill="#222b2c"
          strokeWidth="2"
        />
        <path d="M90 185h20v37H90Z" fill="#77503b" />
        <path d="m91 194 18 8m-18 2 18 8" stroke="#b28250" strokeWidth="3" />
        <path d="M87 221h26v10H87Z" fill="#ffc74f" />
      </g>
    </svg>
  );
}

function CacheArt({ open }: { open: boolean }) {
  return (
    <svg
      className={`cache-art ${open ? "is-open" : ""}`}
      viewBox="0 0 320 270"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="160" cy="242" rx="116" ry="17" fill="#1b382d" opacity=".3" />
      <g stroke="#24282a" strokeWidth="7" strokeLinejoin="round">
        <path d="m43 141 117-18 117 18-8 82-109 19-109-19Z" fill="#993b29" />
        <path d="m160 157 117-16-8 82-109 19Z" fill="#6f2c25" />
        <path d="m66 151 21 4-3 68-21-4Zm168 0-21 4 3 68 21-4Z" fill="#ffcf57" />
        <path d="m49 198 111 17 111-17" stroke="#5b2823" strokeWidth="5" />
        <g className="cache-lid">
          <path d="M43 141V96q0-35 39-43l78-15 78 15q39 8 39 43v45l-117 18Z" fill="#d7783e" />
          <path d="m160 38 78 15q39 8 39 43v45l-117 18Z" fill="#b24d2c" />
          <path d="m67 61 20-4v91l-21-4V90Z" fill="#ffe283" />
          <path d="m234 61-20-4v91l21-4V90Z" fill="#ffd15b" />
          <path d="m43 123 117 18 117-18v20l-117 18-117-18Z" fill="#ffc44a" />
          <path d="m142 128 18-8 18 8v37l-18 9-18-9Z" fill="#ffe58e" />
          <path d="M160 136v20" strokeWidth="8" />
          <path d="m94 68 44-9m-44 22 44-9" stroke="#f6b064" strokeWidth="5" />
        </g>
      </g>
    </svg>
  );
}

interface FirstLightProps {
  state: GameState;
  loaded: boolean;
  settled: boolean;
  paused: boolean;
  sound: boolean;
  reducedMotion: boolean;
  saveWarning: string | null;
  start(): void;
  equip(): void;
  continueLoot(): void;
  camp(): void;
  campaign(): void;
  pause(): void;
  settings(): void;
  toggleSound(): void;
  wardrobe(): void;
  reveal(): void;
}

export function FirstLightUi(p: FirstLightProps) {
  const { state } = p;
  const phase = state.phase.kind;
  const [opened, setOpened] = useState(false);
  const sceneRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (phase === "loot" && p.settled)
      sceneRef.current
        ?.querySelector<HTMLButtonElement>(opened ? "[data-equip-sunfang]" : "[data-open-cache]")
        ?.focus({ preventScroll: true });
  }, [phase, opened, p.settled]);
  useEffect(() => {
    if (phase !== "loot") setOpened(false);
  }, [phase]);
  const atCamp = phase === "camp";
  const victory = phase === "victory";
  const defeat = phase === "defeat";
  const loot = phase === "loot";
  const ownsBlade = state.meta.gear?.owned.includes("sunfang");
  const upgraded = sunfangEquipped(state);
  const stats = heroStats(state);
  const power = companyPower(state).total;
  const candidate = {
    ...state,
    meta: {
      ...state.meta,
      loadout: { ...state.meta.loadout, weapon: "sword" as const },
      gear: { ...state.meta.gear!, equipped: "sunfang" as const },
    },
  };
  const nextDamage = heroStats(candidate).damage;
  const completed = state.meta.firstLight?.cleared;
  const cleared = atCamp ? (completed ? 5 : 0) : state.run.cleared;
  return (
    <section
      ref={sceneRef}
      className={`first-light-ui ${atCamp ? "fl-at-camp" : ""} ${loot ? "fl-at-cache" : ""} ${victory ? "fl-victory" : ""}`}
      aria-label="First Light expedition"
    >
      <header className="fl-topbar">
        <Button
          variant="ghost"
          className="fl-profile"
          onClick={p.wardrobe}
          aria-label="Inspect Rook’s equipment"
        >
          <span className="fl-avatar" style={{ backgroundImage: `url("${heroAtlas(state)}")` }} />
          <span>
            <strong>ROOK</strong>
            <small>
              <Sword /> {power.toLocaleString()} <b>POWER</b>
            </small>
          </span>
        </Button>
        <nav
          className="fl-trail"
          aria-label={`${Math.min(cleared + (victory ? 0 : 1), 5)} of 5 battles`}
        >
          <span>FIRST LIGHT</span>
          <ol>
            {[1, 2, 3, 4, 5].map((battle) => (
              <li
                key={battle}
                className={`${battle <= cleared ? "is-done" : ""} ${battle === cleared + 1 && !atCamp ? "is-current" : ""}`}
              >
                {battle <= cleared ? <Check /> : battle}
              </li>
            ))}
          </ol>
        </nav>
        <div className="fl-tools">
          <Button
            variant="ghost"
            size="icon"
            onClick={p.toggleSound}
            aria-label={p.sound ? "Mute game audio" : "Enable game audio"}
          >
            {p.sound ? <Volume2 /> : <VolumeX />}
          </Button>
          {!atCamp && !victory && !loot && (
            <Button
              variant="ghost"
              size="icon"
              onClick={p.pause}
              aria-label={p.paused ? "Resume First Light" : "Pause First Light"}
            >
              {p.paused ? <Play /> : <Pause />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={p.settings}
            aria-label="First Light settings"
          >
            <Settings />
          </Button>
        </div>
      </header>

      {atCamp && (
        <div className="fl-welcome">
          <div className="fl-hero-stage">
            <span
              className="fl-standing-rook"
              style={{ backgroundImage: `url("${heroAtlas(state)}")` }}
              role="img"
              aria-label={upgraded ? "Rook carrying Sunfang" : "Rook carrying his road blade"}
            />
            <span className="fl-hero-name">THE LANTERN BEARER</span>
          </div>
          <div className="fl-welcome-copy">
            <span className="fl-kicker">
              {completed ? "THE ROAD REMEMBERS" : "A SMALL LIGHT. A LONG ROAD."}
            </span>
            <h1>{completed ? "A stronger beginning." : "Your first spark."}</h1>
            <p>
              {completed
                ? "Sunfang is yours. Beyond the clearing, the valley is still waiting for its light."
                : "The watchtower went dark. Someone on this road knows why."}
            </p>
            <Button
              className="fl-main-action"
              disabled={!p.loaded}
              onClick={completed ? p.campaign : p.start}
              data-start-first-light=""
            >
              <GameIcon kind="battle" />
              {completed ? "Continue the journey" : "Take the first step"}
              <ArrowRight />
            </Button>
            <small>
              {completed
                ? "Your blade stays with you."
                : "Five little battles. Something worth finding."}
            </small>
            <div className="fl-welcome-secondary">
              <Button variant="ghost" onClick={p.wardrobe}>
                <Shield /> Your hero
              </Button>
              <Button variant="ghost" onClick={completed ? p.start : p.campaign}>
                {completed ? "Walk the trail again" : "Return to camp"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {!atCamp && !loot && !victory && !defeat && (
        <>
          <div className="fl-scene-title">
            <span>
              {state.run.cleared === 0
                ? "THE OLD WOODLAND ROAD"
                : state.run.cleared === 1
                  ? "A FAMILIAR FOE"
                  : state.run.cleared === 4
                    ? "THE BRIDGE KEEPER"
                    : "FURTHER INTO THE WOODS"}
            </span>
            <h1>
              {state.run.cleared === 0
                ? "A thief on the trail."
                : state.run.cleared === 1 && upgraded
                  ? "Let the new blade speak."
                  : state.run.cleared === 4
                    ? "One last stand."
                    : "Keep the light moving."}
            </h1>
          </div>
          <div className="fl-battle-caption">
            <span className={`fl-auto ${p.paused ? "is-paused" : ""}`} />
            <span>{p.paused ? "Taking a breath" : "Rook fights on his own"}</span>
            {upgraded && (
              <b>
                <SunfangArt /> Sunfang · Cleave
              </b>
            )}
          </div>
          <footer className="fl-vitals">
            <div className="fl-health">
              <Heart />
              <div>
                <span>ROOK</span>
                <progress aria-label="Rook’s health" value={state.run.hp} max={stats.hp} />
                <b>
                  {Math.ceil(state.run.hp)} / {stats.hp}
                </b>
              </div>
            </div>
            <div className="fl-damage">
              <Sword />
              <strong>{Number(stats.damage.toFixed(1))}</strong>
              <span>DAMAGE</span>
            </div>
            <Button className="fl-equipment-link" variant="ghost" onClick={p.wardrobe}>
              <GameIcon kind="equipment" /> Equipment
            </Button>
          </footer>
        </>
      )}

      {loot && (
        <div className={`fl-cache-scene ${opened ? "is-revealed" : ""}`}>
          {!opened ? (
            <>
              <div className="fl-cache-heading">
                <span className="fl-kicker">LEFT BY THE LANTERN THIEF</span>
                <h1>A little luck.</h1>
                <p>Something warm is waiting inside.</p>
              </div>
              <Button
                className="fl-cache-button"
                variant="ghost"
                disabled={!p.settled}
                onClick={() => {
                  setOpened(true);
                  p.reveal();
                }}
                aria-label="Open the woodland cache"
                data-open-cache=""
              >
                <span className="fl-cache-aura" />
                <CacheArt open={false} />
                <span>OPEN</span>
              </Button>
            </>
          ) : (
            <>
              <div className="fl-loot-burst" aria-hidden="true">
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
                  <i key={angle} style={{ "--ray": `${angle}deg` } as CSSProperties} />
                ))}
              </div>
              <div className="fl-loot-heading">
                <span className="fl-new-loot">NEW DISCOVERY</span>
                <span className="fl-rarity">RARE · SWORD</span>
                <h1>Sunfang</h1>
              </div>
              <div className="fl-loot-item">
                <SunfangArt />
                <span className="fl-item-spark spark-a">✦</span>
                <span className="fl-item-spark spark-b">✧</span>
              </div>
              <div className="fl-loot-copy">
                <strong>A little fire in every swing.</strong>
                <p>Strikes spill into nearby enemies.</p>
                <div className="fl-upgrade">
                  <Sword />
                  <span>{Number(stats.damage.toFixed(1))}</span>
                  <ArrowRight />
                  <b>{Number(nextDamage.toFixed(1))}</b>
                  <small>DAMAGE</small>
                </div>
                <Button
                  className="fl-main-action"
                  disabled={!p.loaded || !p.settled}
                  onClick={p.equip}
                  data-equip-sunfang=""
                >
                  <Sword /> Equip & keep going
                  <ArrowRight />
                </Button>
                <Button variant="ghost" className="fl-store-loot" onClick={p.continueLoot}>
                  Keep it in my pack
                </Button>
                <small>Yours to keep. Through every journey.</small>
              </div>
              <div className="fl-open-cache-remains" aria-hidden="true">
                <CacheArt open />
              </div>
            </>
          )}
        </div>
      )}

      {(victory || defeat) && (
        <div className="fl-ending">
          <div className="fl-ending-medal">
            <GameIcon kind={victory ? "rewards" : "equipment"} />
          </div>
          <span className="fl-kicker">
            {victory ? "FIRST LIGHT · COMPLETE" : "EVERY HERO STARTS SOMEWHERE"}
          </span>
          <h1>{victory ? "A spark worth carrying." : "Catch your breath."}</h1>
          <p>
            {victory
              ? "The gate is open. The road is yours."
              : "The woods can wait. Your discoveries stay with you."}
          </p>
          {ownsBlade && (
            <div className="fl-earned">
              <SunfangArt />
              <span>
                <b>Sunfang</b>
                <small>{upgraded ? "Equipped and ready" : "Safe in your pack"}</small>
              </span>
              <Check />
            </div>
          )}
          <Button className="fl-main-action" disabled={!p.settled} onClick={p.camp}>
            <GameIcon kind="company" /> Return to camp
            <ArrowRight />
          </Button>
        </div>
      )}

      {p.saveWarning && (
        <p className="fl-save-warning" role="status">
          {p.saveWarning}
        </p>
      )}
      <span className="fl-audio-note">
        {atCamp && !completed ? "Sound begins with your first step" : ""}
      </span>
    </section>
  );
}

export function FirstLightWardrobe({
  state,
  equip,
  ordinary,
  canChange,
}: {
  state: GameState;
  equip(): void;
  ordinary(): void;
  canChange: boolean;
}) {
  const owned = state.meta.gear?.owned.includes("sunfang");
  const upgraded = sunfangEquipped(state);
  const stats = heroStats(state);
  const roadBlade = !upgraded && state.meta.loadout.weapon === "sword";
  const weapon = WEAPONS.find((item) => item.id === state.meta.loadout.weapon)!;
  const armor = ARMORS.find((item) => item.id === state.meta.loadout.armor)!;
  return (
    <div className="fl-wardrobe-content">
      <div className="fl-loadout-stage">
        <div className={`fl-equipped-slot ${upgraded ? "" : "is-ordinary"}`}>
          <small>WEAPON</small>
          {upgraded || roadBlade ? (
            <SunfangArt ordinary={!upgraded} />
          ) : (
            <LoadoutArt slot="weapon" id={weapon.id} />
          )}
          <b>{upgraded ? "Sunfang" : roadBlade ? "Road blade" : weapon.name}</b>
          <small>{upgraded ? "RARE · CLEAVE" : weapon.id.toUpperCase()}</small>
        </div>
        <div className="fl-dressed-hero">
          <span
            className="fl-standing-rook"
            style={{ backgroundImage: `url("${heroAtlas(state)}")` }}
            role="img"
            aria-label={upgraded ? "Rook with Sunfang" : "Rook with his road blade"}
          />
          <h3>Rook</h3>
          <span className="fl-kicker">THE LANTERN BEARER</span>
        </div>
        <div className="fl-equipped-slot is-ordinary">
          <small>ARMOR</small>
          <LoadoutArt slot="armor" id={state.meta.loadout.armor} />
          <b>{armor.name}</b>
          <small>{stats.armor} ARMOR</small>
        </div>
      </div>
      <div className="fl-wardrobe-stats">
        <span>
          <Heart />
          <b>{stats.hp}</b>
          <small>HEALTH</small>
        </span>
        <span>
          <Sword />
          <b>{Number(stats.damage.toFixed(1))}</b>
          <small>DAMAGE</small>
        </span>
        <span>
          <Shield />
          <b>{stats.armor}</b>
          <small>ARMOR</small>
        </span>
      </div>
      <div className="fl-gear-rack">
        <span className="fl-kicker">YOUR BLADES</span>
        <Button
          variant="ghost"
          onClick={ordinary}
          disabled={!canChange || roadBlade}
          className={`fl-gear-tile ${roadBlade ? "is-equipped" : ""}`}
          aria-label="Equip the road blade"
        >
          <SunfangArt ordinary />
          <span>
            <b>Road blade</b>
            <small>Common · Balanced sword</small>
          </span>
          {roadBlade ? <Check /> : <ArrowRight />}
        </Button>
        <Button
          variant="ghost"
          onClick={equip}
          disabled={!canChange || !owned || upgraded}
          className={`fl-gear-tile ${upgraded ? "is-equipped" : ""} ${!owned ? "is-undiscovered" : ""}`}
          aria-label="Equip Sunfang"
        >
          <SunfangArt />
          <span>
            <b>{owned ? "Sunfang" : "Undiscovered"}</b>
            <small>{owned ? "Rare · +12 damage · Cleave" : "Explore the woodland road"}</small>
          </span>
          {upgraded ? <Check /> : <ArrowRight />}
        </Button>
      </div>
      <p className="fl-wardrobe-note">
        {canChange
          ? "Your equipment travels with you."
          : "Inspect freely. Change equipment at camp."}
      </p>
    </div>
  );
}
