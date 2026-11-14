// The office diorama — the game's visual heart, reel-sized. Draws the current
// office tier as a scene, seats the actual team (their real faces), and
// floats coins up from desks while revenue flows. Everything is procedural
// and driven from the render tick, so pausing freezes the whole room.

import { renderWorker } from "./avatar";
import { OFFICES } from "./content";
import { pic } from "./img";
import office0 from "./scenes/office-0.jpg";
import office1 from "./scenes/office-1.jpg";
import office2 from "./scenes/office-2.jpg";
import office3 from "./scenes/office-3.jpg";
import office4 from "./scenes/office-4.jpg";
import office5 from "./scenes/office-5.jpg";
import { currentOffice, grossPerSec } from "./sim";
import type { GameState } from "./state";

const BACKDROPS = [office0, office1, office2, office3, office4, office5];

export interface OfficeScene {
  /** Cheap per-render update; rebuilds only when team/office change. */
  update(state: GameState): void;
  setPaused(paused: boolean): void;
}

/** Desk slots as [left%, top%] — founder gets the first. */
const SLOTS: Array<[number, number]> = [
  [13, 89],
  [31, 91],
  [49, 89],
  [67, 92],
  [84, 89],
];

export function createOfficeScene(host: HTMLElement, onInspect: () => void): OfficeScene {
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const animations = new Set<Animation>();
  let paused = false;
  const backdrop = document.createElement("img");
  backdrop.className = "scene-backdrop";
  backdrop.alt = "";
  backdrop.setAttribute("aria-hidden", "true");
  const crew = document.createElement("div");
  crew.className = "scene-crew";
  const coins = document.createElement("div");
  coins.className = "scene-coins";
  const sign = document.createElement("div");
  sign.className = "scene-sign";
  host.append(backdrop, crew, coins, sign);

  const COIN_POOL: HTMLSpanElement[] = [];
  let lastCrewKey = "";
  let lastOffice = -1;
  let coinClock = 0;

  const rebuildCrew = (state: GameState) => {
    crew.textContent = "";
    const seated: Array<{ seed: number; title: string; boss: boolean; role: string }> = [];
    if (state.founder !== null) {
      seated.push({
        seed: state.founder,
        title: state.founderName || "Founder",
        boss: true,
        role: "founder",
      });
    }
    for (const mate of state.team.slice(-(SLOTS.length - 1))) {
      seated.push({ seed: mate.s, title: mate.n, boss: false, role: mate.r });
    }
    seated.forEach((person, i) => {
      const slot = SLOTS[i];
      if (!slot) return;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.addEventListener("click", onInspect);
      chip.className = `scene-person${person.boss ? " boss" : ""}`;
      chip.style.left = `${slot[0]}%`;
      chip.style.top = `${slot[1]}%`;
      chip.style.setProperty("--bob-delay", `${(i * 0.37) % 2.2}s`);
      chip.title = person.title;
      chip.setAttribute(
        "aria-label",
        `${person.title} · ${person.boss ? "Founder" : person.role} · inspect team`,
      );
      renderWorker(chip, person.seed, person.role, person.boss);
      const name = document.createElement("span");
      name.className = "worker-name";
      name.textContent = person.title;
      chip.append(name);
      if (i === seated.length - 1 && seated.length > 1) chip.classList.add("enter");
      crew.append(chip);
    });
    const extra = state.team.length - (SLOTS.length - 1);
    if (extra > 0) {
      const more = document.createElement("span");
      more.className = "scene-more";
      more.textContent = `+${extra} teammate${extra === 1 ? "" : "s"}`;
      crew.append(more);
    }
  };

  const spawnCoin = () => {
    let coin = COIN_POOL.pop();
    if (!coin) {
      coin = document.createElement("span");
      coin.className = "scene-coin";
      coin.append(pic("🪙", "coin-img"));
    }
    const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)] ?? [50, 60];
    coin.style.left = `${slot[0] + (Math.random() - 0.5) * 6}%`;
    coin.style.top = `${slot[1]}%`;
    coins.append(coin);
    const anim = coin.animate(
      [
        { transform: "translateY(0) scale(0.7)", opacity: 0 },
        { transform: "translateY(-18px) scale(1)", opacity: 1, offset: 0.25 },
        { transform: `translateY(-${52 + Math.random() * 22}px) scale(0.85)`, opacity: 0 },
      ],
      { duration: 1300 + Math.random() * 500, easing: "ease-out" },
    );
    animations.add(anim);
    if (paused) anim.pause();
    anim.onfinish = () => {
      animations.delete(anim);
      coin.remove();
      if (COIN_POOL.length < 12) COIN_POOL.push(coin);
    };
  };

  return {
    setPaused(value: boolean) {
      paused = value;
      for (const animation of animations) value ? animation.pause() : animation.play();
    },
    update(state: GameState) {
      const officeIdx = Math.min(state.officeIndex, OFFICES.length - 1);
      if (officeIdx !== lastOffice) {
        lastOffice = officeIdx;
        backdrop.src = BACKDROPS[officeIdx] ?? BACKDROPS[0] ?? "";
        const office = currentOffice(state);
        sign.textContent = "";
        sign.append(pic(office.emoji, "sign-img"), document.createTextNode(office.name));
      }
      const crewKey = `${state.officeIndex}:${state.founder}:${state.founderName}:${state.team.length}:${state.team
        .slice(-5)
        .map((mate) => `${mate.s}:${mate.r}:${mate.n}`)
        .join("|")}`;
      if (crewKey !== lastCrewKey) {
        lastCrewKey = crewKey;
        rebuildCrew(state);
      }
      host.classList.toggle(
        "office-worried",
        state.cash < 0 || state.boosts.decisionBurn > state.boosts.decisionRev,
      );
      // coins flow while money does — called at ~10 Hz from the render tick,
      // so hiding the tab freezes the fountain along with the sim
      if (!paused && !motionPreference.matches && grossPerSec(state) > 0) {
        coinClock += 1;
        const cadence = grossPerSec(state) > 50_000 ? 3 : grossPerSec(state) > 5_000 ? 5 : 9;
        if (coinClock % cadence === 0) spawnCoin();
      }
    },
  };
}
