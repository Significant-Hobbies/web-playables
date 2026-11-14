import { createLoop, createPlatform, createSaveManager, type Platform } from "@games/gamekit";
import {
  buyUpgrade,
  CHAPTERS,
  choosePerk,
  ENCOUNTERS_PER_CHAPTER,
  type GameEvent,
  type GameState,
  heroStats,
  initialState,
  PERKS,
  type PerkId,
  rank,
  returnToCamp,
  startRun,
  stepGame,
  UPGRADE_CAP,
  type UpgradeId,
  upgradeCost,
  validState,
  xpNeeded,
} from "./model";
import { type Scene, WorldRenderer } from "./renderer";
import "./style.css";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Game root is missing.");

const icon = (name: string, size = 20) => {
  const paths: Record<string, string> = {
    coin: '<circle cx="12" cy="12" r="8"/><path d="m12 7 3 5-3 5-3-5z"/>',
    sword: '<path d="m5 19 3-3m-3-3 6 6M8 16 19 5l-1 6-7 7M5 13l6 6"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6z"/><path d="M12 7v10m-4-5h8"/>',
    flame:
      '<path d="M13 3c2 6-2 6-1 10 3 0 4-3 4-4 7 8 2 13-4 13S1 16 6 10c0 3 2 4 3 4-1-5 4-6 4-11Z"/>',
    heart: '<path d="M12 21 3 12C-2 5 7 0 12 7c5-7 14-2 9 5z"/>',
    wind: '<path d="M3 8h12c5 0 5-6 1-6m-9 10h12c5 0 5 6 1 6M3 16h8c4 0 4 6 0 6"/>',
    moon: '<path d="M20 15A9 9 0 0 1 9 3 9 9 0 1 0 20 15Z"/>',
    bolt: '<path d="m13 2-9 12h7l-1 9 10-14h-8z"/>',
    pause: '<path d="M8 5v14m8-14v14"/>',
    play: '<path d="m8 4 12 8-12 8z"/>',
    flag: '<path d="M5 22V3m0 1h14l-4 5 4 5H5"/>',
    camp: '<path d="m2 20 10-17 10 17H2m5 0 5-9 5 9M9 4l6-2"/>',
    gear: '<path d="m12 3 2 3 4-1 1 4 3 3-3 2-1 5-4-1-2 3-3-3-4 1-1-5-2-2 3-3 1-4 4 1z"/><circle cx="12" cy="12" r="3"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.flame}</svg>`;
};

app.innerHTML = `
  <div class="game-shell">
    <header class="masthead"><a class="back-link" href="../../" aria-label="Back to the arcade">← <span>Arcade</span></a><div class="wordmark">${icon("flame", 27)}<span>Ember Road</span></div><button class="icon-button" id="settings-toggle" aria-label="Open game settings" title="Settings">${icon("gear")}</button></header>
    <main class="game">
      <section class="world" aria-label="The Cinder March battlefield">
        <canvas id="world" aria-label="An armored traveler facing the creatures of the old road" role="img"></canvas>
        <div class="world-top"><div class="chapter"><span class="eyebrow" id="chapter-number">CHAPTER I</span><h1 id="chapter-title">The Cinder March</h1><span class="place" id="place">Ashen Verge</span></div><div class="top-actions"><span class="gold" title="Gold kept between journeys">${icon("coin")}<b id="gold">0</b></span><button class="pause-button" id="pause" aria-label="Pause game">${icon("pause")}</button></div></div>
        <div class="road-progress"><span id="progress-title">A new journey</span><div class="road-dots" id="road-dots" aria-label="Chapter progress"></div><span id="encounter">0 / 12</span></div>
        <div class="scene-caption"><span class="eyebrow" id="enemy-label">THE ROAD IS WAITING</span><strong id="enemy-name">A small light against the dark.</strong></div>
        <div class="battle-note" id="battle-note">Your knight walks and fights automatically. You shape the build.</div>
        <div class="pause-veil" id="pause-veil" hidden><span class="eyebrow">TAKE A BREATH</span><strong>The road can wait.</strong><button class="primary" id="resume">${icon("play", 16)} Resume journey</button></div>
      </section>
      <section class="status-rail" aria-label="Knight condition"><div class="health-stat"><div><span>${icon("heart", 16)} Health</span><b id="hp-text">180 / 180</b></div><div class="meter health"><span id="hp-fill"></span></div></div><div class="xp-stat"><div><span>Level <b id="level">1</b></span><span id="xp-text">0 / 4 XP</span></div><div class="meter xp"><span id="xp-fill"></span></div></div><div class="combat-stats"><span title="Sword damage">${icon("sword", 18)}<b id="damage">23</b></span><span title="Attacks per second">${icon("wind", 18)}<b id="speed">1.05/s</b></span><span title="Flat damage blocked per hit">${icon("shield", 18)}<b id="armor">0</b></span></div></section>
      <section id="decision" class="decision" aria-live="polite"></section>
      <section class="build-rail" aria-label="Current journey perks"><span class="build-label">YOUR OATHS</span><div class="build-perks" id="build-perks"><span class="empty-perks">Defeat enemies to earn your first choice.</span></div><span class="build-tip" id="build-tip">Every journey is a different build.</span></section>
    </main>
    <footer class="game-footer"><span>One road further.</span><span id="save-status" role="status">Loading your journey…</span><span class="keyboard-tip">Space to pause · 1–3 to choose</span></footer>
  </div>
  <dialog id="settings"><form method="dialog"><button class="close" aria-label="Close settings">×</button><span class="eyebrow">AT YOUR PACE</span><h2>A quieter road.</h2><label><input type="checkbox" id="reduce-motion"> Reduced motion</label><p>Gentler character movement and no flying particles. Combat timing stays the same.</p><p class="settings-note">Progress stays in this browser. Gold and forged gear survive defeat; oaths belong to the current journey.</p><button class="primary">Return to the road</button></form></dialog>
`;

const get = <T extends HTMLElement = HTMLElement>(id: string) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing game control: ${id}`);
  return element as T;
};

const platform = createPlatform({ storageKey: "save:ember-road:v1" });
if (platform.env === "yt") app.querySelector(".back-link")?.remove();
let state = initialState();
let saveLocked = false;
let loadMessage = "";
let userPaused = false;
let platformPaused = false;
let settingsOpen = false;
let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let saveElapsed = 0;
let uiElapsed = 0;
let saveBusy = false;
let saveAgain = false;
let currentDecision = "";
let currentBuild = "";
let sceneTime = 0;
let heroSwing = -1;
let enemySwing = -1;
let heroHurt = -1;
let enemyHurt = -1;
let heroDeath = 0;
let enemyDeath = 0;
let lastEnemyKind = "raider";
let note = "Your knight walks and fights automatically. You shape the build.";
let noteUntil = 0;

const savePlatform: Platform = {
  env: platform.env,
  allowsMuteUi: platform.allowsMuteUi,
  firstFrameReady: () => platform.firstFrameReady(),
  gameReady: () => platform.gameReady(),
  loadData: async () => {
    const raw = await platform.loadData();
    if (raw === null) return null;
    try {
      const envelope: unknown = JSON.parse(raw);
      if (
        typeof envelope !== "object" ||
        envelope === null ||
        !("version" in envelope) ||
        envelope.version !== 1 ||
        !("savedAt" in envelope) ||
        typeof envelope.savedAt !== "number" ||
        !Number.isFinite(envelope.savedAt) ||
        !("state" in envelope) ||
        !validState(envelope.state)
      )
        throw new Error("Unsupported save");
      return raw;
    } catch {
      saveLocked = true;
      loadMessage = "Existing save kept untouched · playing a temporary journey";
      return null;
    }
  },
  saveData: async (raw) => {
    if (saveLocked) throw new Error("The existing save is protected.");
    await platform.saveData(raw);
    if ((await platform.loadData()) !== raw)
      throw new Error("Browser storage did not retain this save.");
  },
  audioEnabled: () => platform.audioEnabled(),
  onAudioEnabledChange: (cb) => platform.onAudioEnabledChange(cb),
  onPauseChange: (cb) => platform.onPauseChange(cb),
};
const saves = createSaveManager<GameState>({
  platform: savePlatform,
  version: 1,
  initial: initialState,
});
const renderer = new WorldRenderer(get<HTMLCanvasElement>("world"));
renderer.resize();
platform.firstFrameReady();

function setNote(text: string, seconds = 4) {
  note = text;
  noteUntil = sceneTime + seconds;
}

async function persist() {
  if (saveLocked) {
    get("save-status").textContent = loadMessage;
    return;
  }
  if (saveBusy) {
    saveAgain = true;
    return;
  }
  saveBusy = true;
  try {
    await saves.save(structuredClone(state));
    get("save-status").textContent = "Journey saved in this browser";
  } catch {
    get("save-status").textContent = "Saving unavailable · keep this tab open";
  } finally {
    saveBusy = false;
    if (saveAgain) {
      saveAgain = false;
      void persist();
    }
  }
}

function finishAction() {
  currentDecision = "";
  heroDeath = 0;
  enemyDeath = 0;
  heroSwing = -1;
  enemySwing = -1;
  renderer.sparks.length = 0;
  renderUi();
  drawWorld();
  void persist();
}

function launch(chapter?: number) {
  if (startRun(state, chapter)) {
    userPaused = false;
    setNote("Your knight fights automatically. Watch for a new oath at level up.", 6);
    finishAction();
  }
}

function choose(id: PerkId) {
  if (choosePerk(state, id)) {
    setNote(`${PERKS.find((p) => p.id === id)?.title ?? "Oath"} joins your build.`, 4);
    finishAction();
  }
}

function perkIcon(id: PerkId) {
  return {
    edge: "sword",
    tempo: "wind",
    blood: "heart",
    heart: "heart",
    bastion: "shield",
    storm: "bolt",
    thorns: "flame",
    renewal: "moon",
    execution: "sword",
  }[id];
}

function renderDecision() {
  const key = `${state.phase.kind}:${state.run.chapter}:${state.meta.gold}:${JSON.stringify(state.meta.upgrades)}:${state.phase.kind === "choice" ? state.phase.options.join() : ""}`;
  if (key === currentDecision) return;
  const focused = document.activeElement;
  const hadDecisionFocus = get("decision").contains(focused);
  currentDecision = key;
  const box = get("decision");
  const phase = state.phase;
  box.className = `decision decision--${phase.kind}`;
  if (phase.kind === "camp") {
    const chapter = CHAPTERS[state.run.chapter - 1] ?? CHAPTERS[0];
    box.innerHTML = `<div class="camp-intro"><span class="eyebrow">A KNIGHT. A LANTERN. AN UNFINISHED OATH.</span><h2>Keep a little light alive.</h2><p>${chapter.description} Walk the road, win gold, and choose the oaths that make this journey yours.</p><div class="camp-start"><button class="primary" id="start">${icon("flag", 18)} Begin chapter ${state.run.chapter}</button>${
      state.meta.unlockedChapter > 1
        ? `<label class="chapter-select"><span class="sr-only">Choose a chapter</span><select id="chapter-select">${CHAPTERS.slice(
            0,
            state.meta.unlockedChapter,
          )
            .map(
              (ch, i) =>
                `<option value="${i + 1}" ${state.run.chapter === i + 1 ? "selected" : ""}>${i + 1}. ${ch.place}</option>`,
            )
            .join("")}</select></label>`
        : ""
    }</div></div><div class="forge"><div class="forge-title"><span class="eyebrow">THE FORGE</span><span>Gear stays with you.</span></div><div class="forge-items">${(
      ["blade", "mail", "charm"] as UpgradeId[]
    )
      .map((id) => {
        const level = state.meta.upgrades[id];
        const cost = upgradeCost(state, id);
        const cap = level >= UPGRADE_CAP;
        return `<button class="forge-item" data-upgrade="${id}" ${cap || state.meta.gold < cost ? "disabled" : ""}><span class="gear-icon">${icon(id === "blade" ? "sword" : id === "mail" ? "shield" : "flame", 24)}</span><span class="gear-copy"><strong>${{ blade: "Wayfarer’s blade", mail: "Weathered mail", charm: "Ember charm" }[id]}</strong><small>${{ blade: "+4 damage", mail: "+25 health · +1 armor", charm: "+2.5% critical chance" }[id]} <span>· Rank ${level}</span></small></span><span class="gear-cost">${cap ? "MAX" : `${icon("coin", 14)} ${cost}`}</span></button>`;
      })
      .join("")}</div></div>`;
    get("start").addEventListener("click", () => launch(state.run.chapter));
    box.querySelector<HTMLSelectElement>("#chapter-select")?.addEventListener("change", (event) => {
      const value = Number((event.target as HTMLSelectElement).value);
      if (value >= 1 && value <= state.meta.unlockedChapter) {
        state.run.chapter = value;
        currentDecision = "";
        renderUi();
        void persist();
      }
    });
    box.querySelectorAll<HTMLButtonElement>("[data-upgrade]").forEach((button) => {
      button.addEventListener("click", () => {
        if (buyUpgrade(state, button.dataset.upgrade as UpgradeId)) {
          setNote("The forge remembers. This upgrade stays after every journey.");
          currentDecision = "";
          renderUi();
          void persist();
        }
      });
    });
  } else if (phase.kind === "choice") {
    box.innerHTML = `<div class="choice-heading"><div><span class="eyebrow">LEVEL ${state.run.level} · CHOOSE AN OATH</span><h2>What will carry you onward?</h2></div><p>The road waits while you choose.</p></div><div class="perk-choices">${phase.options
      .map((id, index) => {
        const perk = PERKS.find((p) => p.id === id);
        if (!perk) return "";
        return `<button class="perk-choice perk-choice--${perk.family}" data-perk="${id}"><span class="perk-top"><span class="perk-symbol">${icon(perkIcon(id), 29)}</span><span class="keycap">${index + 1}</span></span><span class="perk-caption">${perk.caption}</span><strong>${perk.title}</strong><span class="perk-description">${perk.description}</span><span class="perk-rank">${rank(state, id) ? `Rank ${rank(state, id)} → ${rank(state, id) + 1}` : "New oath"}<span>Choose →</span></span></button>`;
      })
      .join("")}</div>`;
    box.querySelectorAll<HTMLButtonElement>("[data-perk]").forEach((button) => {
      button.addEventListener("click", () => choose(button.dataset.perk as PerkId));
    });
  } else if (phase.kind === "defeat") {
    box.innerHTML = `<div class="result-mark">${icon("camp", 38)}</div><div class="result-copy"><span class="eyebrow">THE MARCH ENDS. THE OATH REMAINS.</span><h2>Rest. Reforge. Return.</h2><p>${phase.enemy} stopped you after ${state.run.cleared} encounters. Your ${state.meta.gold} gold and all forged gear are safe.</p></div><div class="result-actions"><button class="primary" id="reforge">${icon("camp", 18)} Return to camp</button><button class="secondary" id="retry">Try this chapter again</button></div>`;
    get("reforge").addEventListener("click", () => {
      returnToCamp(state);
      finishAction();
    });
    get("retry").addEventListener("click", () => launch(state.run.chapter));
  } else if (phase.kind === "victory") {
    const final = state.run.chapter === CHAPTERS.length;
    box.innerHTML = `<div class="result-mark result-mark--gold">${icon("flag", 38)}</div><div class="result-copy"><span class="eyebrow">CHAPTER COMPLETE · +${phase.reward} GOLD</span><h2>${final ? "The light found its way home." : "One road further."}</h2><p>${final ? "You crossed all five roads and kept your oath. Revisit a chapter with a new build, or rest at the forge." : `${CHAPTERS[state.run.chapter]?.place ?? "The next road"} is open. Carry your gold home, or follow the light.`}</p></div><div class="result-actions">${!final ? `<button class="primary" id="next">${icon("flag", 18)} Begin chapter ${state.run.chapter + 1}</button>` : ""}<button class="secondary" id="return-camp">Return to the forge</button></div>`;
    box.querySelector("#next")?.addEventListener("click", () => launch(state.run.chapter + 1));
    get("return-camp").addEventListener("click", () => {
      returnToCamp(state);
      finishAction();
    });
  } else {
    box.innerHTML = "";
  }
  if (
    hadDecisionFocus ||
    phase.kind === "choice" ||
    phase.kind === "defeat" ||
    phase.kind === "victory"
  )
    box.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true });
}

function renderBuild() {
  const key = JSON.stringify(state.run.perks);
  if (key === currentBuild) return;
  currentBuild = key;
  const entries = PERKS.filter((p) => rank(state, p.id));
  get("build-perks").innerHTML = entries.length
    ? entries
        .map(
          (perk) =>
            `<span class="build-perk build-perk--${perk.family}" title="${perk.description}">${icon(perkIcon(perk.id), 16)}<span>${perk.title}</span><b>${rank(state, perk.id)}</b></span>`,
        )
        .join("")
    : '<span class="empty-perks">Defeat enemies to earn your first choice.</span>';
  get("build-tip").textContent = entries.length
    ? `${entries.length} ${entries.length === 1 ? "oath" : "oaths"} woven into this journey.`
    : "Every journey is a different build.";
}

function renderUi() {
  const stats = heroStats(state);
  const ch = CHAPTERS[state.run.chapter - 1] ?? CHAPTERS[0];
  get("chapter-number").textContent =
    `CHAPTER ${["I", "II", "III", "IV", "V"][state.run.chapter - 1]}`;
  get("chapter-title").textContent = ch.name;
  get("place").textContent = ch.place;
  get("gold").textContent = Math.floor(state.meta.gold).toLocaleString();
  get("encounter").textContent = `${state.run.cleared} / ${ENCOUNTERS_PER_CHAPTER}`;
  get("progress-title").textContent =
    state.phase.kind === "camp"
      ? "A new journey"
      : state.run.cleared === 11
        ? "THE WARDEN’S GATE"
        : state.phase.kind === "victory"
          ? "The promise kept"
          : "THE OLD ROAD";
  get("road-dots").innerHTML = Array.from(
    { length: ENCOUNTERS_PER_CHAPTER },
    (_, i) =>
      `<span class="road-dot ${i < state.run.cleared ? "complete" : i === state.run.cleared && state.phase.kind !== "camp" ? "current" : ""} ${i === ENCOUNTERS_PER_CHAPTER - 1 ? "boss-dot" : ""}"></span>`,
  ).join("");
  get("hp-text").textContent = `${Math.ceil(state.run.hp)} / ${stats.hp}`;
  get("hp-fill").style.transform = `scaleX(${Math.max(0, state.run.hp / stats.hp)})`;
  get("hp-fill").classList.toggle("low", state.run.hp < stats.hp * 0.25);
  get("level").textContent = String(state.run.level);
  get("xp-text").textContent = `${state.run.xp} / ${xpNeeded(state)} XP`;
  get("xp-fill").style.transform = `scaleX(${Math.min(1, state.run.xp / xpNeeded(state))})`;
  get("damage").textContent = `${Math.round(stats.damage)}`;
  get("speed").textContent = `${(1 / stats.interval).toFixed(2)}/s`;
  get("armor").textContent = String(stats.armor);
  const battle = state.phase.kind === "battle" ? state.phase : null;
  get("enemy-label").textContent = battle
    ? battle.enemy.kind === "warden"
      ? "CHAPTER BOSS"
      : `ENCOUNTER ${state.run.cleared + 1}`
    : state.phase.kind === "travel"
      ? "ONWARD"
      : state.phase.kind === "choice"
        ? "A MOMENT BETWEEN BATTLES"
        : state.phase.kind === "victory"
          ? "THE ROAD IS YOURS"
          : state.phase.kind === "defeat"
            ? "UNTIL THE NEXT DAWN"
            : "THE ROAD IS WAITING";
  get("enemy-name").textContent = battle
    ? `${battle.enemy.name} · ${Math.ceil(battle.enemy.hp)} HP`
    : state.phase.kind === "travel"
      ? "The next footfall. The next fight."
      : state.phase.kind === "choice"
        ? "A new oath is yours to make."
        : state.phase.kind === "victory"
          ? "A small light, still burning."
          : state.phase.kind === "defeat"
            ? "You keep everything you earned."
            : "A small light against the dark.";
  get("battle-note").textContent =
    sceneTime < noteUntil
      ? note
      : state.phase.kind === "battle"
        ? "Your knight fights. Your oaths do the rest."
        : state.phase.kind === "travel"
          ? "Walking to the next encounter…"
          : "Gold and forged gear stay with you between journeys.";
  get<HTMLButtonElement>("pause").disabled = !["travel", "battle"].includes(state.phase.kind);
  renderDecision();
  renderBuild();
}

function onEvents(events: GameEvent[]) {
  for (const event of events) {
    if (event.type === "swing") {
      if (event.side === "hero") heroSwing = 0;
      else enemySwing = 0;
    } else if (event.type === "hit") {
      if (event.side === "hero") heroHurt = 0;
      else enemyHurt = 0;
      renderer.impact(event.side, event.damage, event.critical);
      if (event.lightning) setNote("Stormbound · the third strike calls lightning.", 2);
    } else if (event.type === "heal") {
      if (event.amount >= 1) renderer.impact("hero", event.amount, false, true);
    } else if (event.type === "kill") {
      enemyDeath = 0.01;
      setNote(`Enemy defeated · +${event.gold} gold kept.`, 2);
      void persist();
    } else if (event.type === "level") {
      setNote(`Level ${event.level}. Choose an oath before the march continues.`, 10);
      void persist();
    } else if (event.type === "defeat") {
      heroDeath = 0.01;
      void persist();
    } else if (event.type === "victory") {
      setNote(`Chapter complete · +${event.gold} gold.`, 10);
      void persist();
    }
  }
}

function drawWorld() {
  const battle = state.phase.kind === "battle" ? state.phase : null;
  if (battle) lastEnemyKind = battle.enemy.kind;
  const scene: Scene = {
    time: sceneTime,
    distance: state.run.distance,
    walking: state.phase.kind === "travel",
    heroAttack: heroSwing >= 0 && heroSwing < 0.62 ? heroSwing / 0.62 : 0,
    enemyAttack: enemySwing >= 0 && enemySwing < 0.72 ? enemySwing / 0.72 : 0,
    heroHurt: heroHurt >= 0 && heroHurt < 0.24 ? heroHurt / 0.24 : 0,
    enemyHurt: enemyHurt >= 0 && enemyHurt < 0.24 ? enemyHurt / 0.24 : 0,
    enemyDeath:
      state.phase.kind === "camp" || state.phase.kind === "victory" || state.phase.kind === "choice"
        ? 1
        : enemyDeath,
    heroDeath,
    enemyKind: lastEnemyKind,
    enemyHealth: battle?.enemy.hp ?? 1,
    enemyMaxHealth: battle?.enemy.maxHp ?? 1,
    chapter: state.run.chapter,
    reducedMotion,
  };
  renderer.draw(scene);
}

const loop = createLoop(
  (dt) => {
    sceneTime += dt;
    if (heroSwing >= 0) heroSwing += dt;
    if (enemySwing >= 0) enemySwing += dt;
    if (heroHurt >= 0) heroHurt += dt;
    if (enemyHurt >= 0) enemyHurt += dt;
    if (heroDeath > 0) heroDeath = Math.min(1, heroDeath + dt * 1.6);
    if (enemyDeath > 0) enemyDeath = Math.min(1, enemyDeath + dt * 2.1);
    const wasBattle = state.phase.kind === "battle";
    onEvents(stepGame(state, dt));
    if (!wasBattle && state.phase.kind === "battle") {
      enemyDeath = 0;
      heroSwing = -1;
      enemySwing = -1;
    }
    renderer.advance(dt);
    drawWorld();
    uiElapsed += dt;
    saveElapsed += dt;
    if (uiElapsed >= 0.1) {
      uiElapsed = 0;
      renderUi();
    }
    if (saveElapsed >= 2) {
      saveElapsed = 0;
      void persist();
    }
  },
  { stepMs: 1000 / 60, maxCatchUpMs: 150 },
);

function syncPause() {
  const paused = userPaused || platformPaused || settingsOpen;
  if (paused) loop.pause();
  else loop.resume();
  get("pause-veil").hidden = !userPaused;
  get("pause").innerHTML = icon(userPaused ? "play" : "pause");
  get("pause").setAttribute("aria-label", userPaused ? "Resume game" : "Pause game");
  if (paused) void persist();
}

get("pause").addEventListener("click", () => {
  userPaused = !userPaused;
  syncPause();
});
get("resume").addEventListener("click", () => {
  userPaused = false;
  syncPause();
});
const settings = get<HTMLDialogElement>("settings");
get("settings-toggle").addEventListener("click", () => {
  settingsOpen = true;
  settings.showModal();
  syncPause();
});
settings.addEventListener("close", () => {
  settingsOpen = false;
  syncPause();
});
get<HTMLInputElement>("reduce-motion").checked = reducedMotion;
get<HTMLInputElement>("reduce-motion").addEventListener("change", (event) => {
  reducedMotion = (event.target as HTMLInputElement).checked;
  drawWorld();
});
platform.onPauseChange((paused) => {
  platformPaused = paused;
  syncPause();
});
window.addEventListener("resize", () => {
  renderer.resize();
  drawWorld();
});
new ResizeObserver(() => {
  renderer.resize();
  drawWorld();
}).observe(get("world"));
window.addEventListener("keydown", (event) => {
  if (
    settingsOpen ||
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLSelectElement ||
    event.target instanceof HTMLTextAreaElement ||
    event.repeat
  )
    return;
  if (
    event.code === "Space" &&
    ["travel", "battle"].includes(state.phase.kind) &&
    !(event.target instanceof HTMLButtonElement)
  ) {
    event.preventDefault();
    userPaused = !userPaused;
    syncPause();
  }
  const index = Number(event.key) - 1;
  if (state.phase.kind === "choice" && index >= 0 && index <= 2) {
    const id = state.phase.options[index];
    if (id) {
      event.preventDefault();
      choose(id);
    }
  }
});

try {
  const loaded = await saves.load();
  state = loaded.state;
  if (!validState(state)) throw new Error("The loaded journey is invalid.");
} catch {
  saveLocked = true;
  loadMessage = "Existing save kept untouched · playing a temporary journey";
  state = initialState();
}
get("save-status").textContent = loadMessage || "Progress stays in this browser";
heroDeath = state.phase.kind === "defeat" ? 1 : 0;
renderUi();
drawWorld();
platform.gameReady();
syncPause();
if (!saveLocked) void persist();
