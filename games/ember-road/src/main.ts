import {
  createLoop,
  createPlatform,
  createSaveManager,
  type Loop,
  type Platform,
} from "@games/gamekit";
import {
  buyUpgrade,
  useSkill as castSkill,
  choosePerk,
  equip,
  type GameEvent,
  type GameState,
  initialState,
  migrateV1State,
  PERKS,
  retreatToCamp,
  returnToCamp,
  skipPerk,
  startRun,
  stepGame,
  validLegacyState,
  validState,
} from "./model";
import { WorldRenderer } from "./renderer";
import { mountUi, type UiActions, type UiSnapshot } from "./ui";
import "./style.css";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Game root is missing.");
const platform = createPlatform({ storageKey: "save:ember-road:v1" });
let state = initialState();
let loaded = false;
let saveLocked = false;
let saveMessage = "Loading your journey…";
let saveWarning = false;
let userPaused = false;
let platformPaused = false;
let inspecting = false;
let campStage = true;
let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let time = 0;
let uiElapsed = 0;
let saveElapsed = 0;
let saveBusy = false;
let saveAgain = false;
let note = "Rook fights automatically. Shape your company and cast with Q.";
let renderer: WorldRenderer | undefined;
let loop: Loop | undefined;
let renderUi: ReturnType<typeof mountUi> | undefined;
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
        !("savedAt" in envelope) ||
        typeof envelope.savedAt !== "number" ||
        !Number.isFinite(envelope.savedAt) ||
        !("state" in envelope) ||
        !(
          (envelope.version === 1 && validLegacyState(envelope.state)) ||
          (envelope.version === 2 && validState(envelope.state))
        )
      )
        throw new Error("Unsupported save");
      return raw;
    } catch {
      saveLocked = true;
      saveMessage = "Existing save kept untouched · playing a temporary journey";
      saveWarning = true;
      return null;
    }
  },
  saveData: async (raw) => {
    if (saveLocked) throw new Error("The existing save is protected.");
    await platform.saveData(raw);
    if ((await platform.loadData()) !== raw) throw new Error("Storage did not retain this save.");
  },
  audioEnabled: () => platform.audioEnabled(),
  onAudioEnabledChange: (cb) => platform.onAudioEnabledChange(cb),
  onPauseChange: (cb) => platform.onPauseChange(cb),
  onSaveRequest: (cb) => platform.onSaveRequest?.(cb) ?? (() => {}),
};
const saves = createSaveManager<GameState>({
  getState: () => state,
  platform: savePlatform,
  version: 2,
  migrations: { 1: migrateV1State },
  initial: initialState,
});
function snapshot(): UiSnapshot {
  return {
    state: structuredClone(state),
    loaded,
    saveMessage,
    saveWarning,
    paused: userPaused,
    reducedMotion,
    decisionReady: loaded && !renderer?.settling,
    note,
    web: platform.env === "web",
  };
}
function publish() {
  renderUi?.(snapshot());
}
function draw() {
  renderer?.frame(state, time, reducedMotion, campStage);
}
async function persist() {
  if (!loaded || saveLocked) return;
  if (saveBusy) {
    saveAgain = true;
    return;
  }
  saveBusy = true;
  try {
    await saves.save(state);
    saveMessage = "Journey saved on this device";
    saveWarning = false;
  } catch {
    saveMessage = "Saving unavailable · keep this tab open";
    saveWarning = true;
  } finally {
    saveBusy = false;
    publish();
    if (saveAgain) {
      saveAgain = false;
      void persist();
    }
  }
}
function syncPause() {
  if (!loaded || userPaused || platformPaused || inspecting) loop?.pause();
  else loop?.resume();
  if (loaded && (userPaused || platformPaused || inspecting)) void persist();
  publish();
}
function changed(clear = false) {
  if (clear) renderer?.clear();
  draw();
  publish();
  void persist();
}
function events(events: GameEvent[]) {
  renderer?.handle(events, state);
  for (const event of events) {
    if (event.type === "kill") note = `Enemy defeated · +${event.gold} gold kept.`;
    if (event.type === "level") note = `Level ${event.level}. Choose an oath.`;
    if (event.type === "skill") note = "Your skill changes the fight.";
  }
  if (events.some((e) => ["kill", "level", "defeat", "victory", "skill"].includes(e.type)))
    void persist();
}
function launch(chapter: number) {
  if (!loaded || !startRun(state, chapter)) return;
  userPaused = false;
  note = "Rook fights automatically. Cast your equipped skill with Q.";
  changed(true);
  syncPause();
}
const actions: UiActions = {
  canvas(canvas) {
    if (renderer) return;
    renderer = new WorldRenderer(canvas);
    const resize = () => {
      renderer?.resize();
      draw();
    };
    new ResizeObserver(resize).observe(canvas);
    window.addEventListener("resize", resize);
    resize();
    platform.firstFrameReady();
  },
  inspect(open) {
    if (open === inspecting) return;
    inspecting = open;
    syncPause();
  },
  stage(camp) {
    campStage = camp;
    renderer?.resize();
    draw();
  },
  pause() {
    userPaused = !userPaused;
    syncPause();
  },
  start: launch,
  choose(id) {
    if (loaded && !renderer?.settling && choosePerk(state, id)) {
      note = `${PERKS.find((p) => p.id === id)!.title} joins your build.`;
      changed(true);
    }
  },
  skip() {
    if (loaded && !renderer?.settling && skipPerk(state)) {
      note = "Choice skipped. The company marches on.";
      changed(true);
    }
  },
  equip(slot, id) {
    if (loaded && equip(state, slot, id)) changed(true);
  },
  upgrade(id) {
    if (loaded && buyUpgrade(state, id)) changed();
  },
  retreat() {
    if (loaded && retreatToCamp(state)) {
      userPaused = false;
      changed(true);
      syncPause();
    }
  },
  camp() {
    if (loaded && returnToCamp(state)) {
      userPaused = false;
      changed(true);
      syncPause();
    }
  },
  skill() {
    if (!loaded || userPaused || platformPaused || inspecting) return;
    events(castSkill(state));
    draw();
    publish();
  },
  reduce(value) {
    reducedMotion = value;
    draw();
    publish();
  },
};
renderUi = mountUi(app, snapshot(), actions);
loop = createLoop(
  (dt) => {
    time += dt;
    renderer?.advance(dt);
    renderer?.capture(state);
    events(stepGame(state, dt));
    draw();
    uiElapsed += dt;
    saveElapsed += dt;
    if (uiElapsed >= 0.1) {
      uiElapsed = 0;
      publish();
    }
    if (saveElapsed >= 2) {
      saveElapsed = 0;
      void persist();
    }
  },
  { stepMs: 1000 / 60, maxCatchUpMs: 150 },
);
platform.onPauseChange((paused) => {
  platformPaused = paused;
  syncPause();
});
window.addEventListener("keydown", (event) => {
  if (
    !loaded ||
    inspecting ||
    platformPaused ||
    event.repeat ||
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLSelectElement ||
    event.target instanceof HTMLTextAreaElement ||
    (event.target instanceof HTMLElement && event.target.isContentEditable)
  )
    return;
  if (
    event.code === "Space" &&
    ["travel", "battle"].includes(state.phase.kind) &&
    !(event.target instanceof HTMLButtonElement)
  ) {
    event.preventDefault();
    actions.pause();
  }
  if (event.key.toLowerCase() === "q" && !userPaused) {
    event.preventDefault();
    actions.skill();
  }
  const index = Number(event.key) - 1;
  if (
    !userPaused &&
    !renderer?.settling &&
    state.phase.kind === "choice" &&
    index >= 0 &&
    index <= 2
  ) {
    const id = state.phase.options[index];
    if (id) {
      event.preventDefault();
      actions.choose(id);
    }
  }
});
try {
  const result = await saves.load();
  state = result.state;
  if (!validState(state)) throw new Error("The loaded journey is invalid.");
} catch {
  saveLocked = true;
  saveMessage = "Existing save kept untouched · playing a temporary journey";
  saveWarning = true;
  state = initialState();
}
loaded = true;
campStage = state.phase.kind === "camp";
if (!saveLocked) saveMessage = "Progress stays on this device";
draw();
publish();
platform.gameReady();
syncPause();
if (!saveLocked) void persist();
