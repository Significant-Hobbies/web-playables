import {
  createLoop,
  createPlatform,
  createSaveManager,
  type Loop,
  type Platform,
} from "@games/gamekit";
import { type AudioStatus, GameAudio, type SoundCue } from "./audio";
import { type AudioPreferences, experienceOf, type Lesson, prepareExperience } from "./experience";
import {
  buyUpgrade,
  useSkill as castSkill,
  choosePerk,
  equip,
  type GameEvent,
  type GameState,
  initialState,
  migrateV1State,
  migrateV2State,
  PERKS,
  retreatToCamp,
  returnToCamp,
  skipPerk,
  startRun,
  stepGame,
  validLegacyState,
  validState,
  validV2State,
} from "./model";
import { advanceQuests, claimQuest, recordQuestProgress } from "./quests";
import { WorldRenderer } from "./renderer";
import { mountUi, type UiActions, type UiSnapshot } from "./ui";
import "./style.css";
import "./toon.css";
import "./collection.css";
import "./experience.css";

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
let audioStatus: AudioStatus = "locked";
const audio = new GameAudio(experienceOf(state).audio, (status) => {
  audioStatus = status;
  publish();
});
function syncAudio() {
  audio.update(experienceOf(state).audio, {
    paused: !loaded || userPaused || platformPaused,
    permitted: platform.audioEnabled(),
    inspecting,
    battle: state.phase.kind === "battle",
  });
}
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
          (envelope.version === 2 && validV2State(envelope.state)) ||
          (envelope.version === 3 && validState(envelope.state))
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
  getState: () => {
    if (!loaded) throw new Error("The journey is still loading.");
    return state;
  },
  platform: savePlatform,
  version: 3,
  migrations: { 1: migrateV1State, 2: migrateV2State },
  initial: initialState,
});
function snapshot(): UiSnapshot {
  return {
    state: structuredClone(state),
    loaded,
    saveMessage,
    saveWarning,
    paused: userPaused,
    motionPaused: userPaused || platformPaused || inspecting,
    presentationPaused: userPaused || platformPaused,
    audioStatus,
    audioControls: platform.allowsMuteUi,
    reducedMotion,
    decisionReady: loaded && !renderer?.settling,
    note,
    web: platform.env === "web",
  };
}
function publish() {
  syncAudio();
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
  audio.handle(events, state);
  for (const event of events) {
    if (event.type === "kill" || event.type === "skill")
      recordQuestProgress(state.quests, event, Date.now());
    if (event.type === "victory")
      recordQuestProgress(
        state.quests,
        { type: "victory", chapter: state.run.chapter },
        Date.now(),
      );
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
  unlockAudio() {
    void audio.unlock();
  },
  uiSound(cue: SoundCue = "page") {
    audio.play(cue);
  },
  toggleSound() {
    if (loaded && platform.allowsMuteUi) {
      const p = prepareExperience(state).audio;
      const enabled = !(p.musicEnabled || p.effectsEnabled);
      p.musicEnabled = enabled;
      p.effectsEnabled = enabled;
      void audio.unlock();
      changed();
    }
  },
  finishIntro() {
    if (loaded) {
      prepareExperience(state).introSeen = true;
      changed();
    }
  },
  learn(lesson: Lesson) {
    if (loaded) {
      prepareExperience(state).lessons[lesson] = true;
      changed();
    }
  },
  skipGuidance() {
    if (loaded) {
      const e = prepareExperience(state);
      for (const key of ["battle", "skill", "oath", "camp"] as const) e.lessons[key] = true;
      changed();
    }
  },
  audioPreference(key: keyof AudioPreferences, value: boolean | number) {
    if (!loaded || !platform.allowsMuteUi) return;
    const preferences = prepareExperience(state).audio;
    if ((key === "musicEnabled" || key === "effectsEnabled") && typeof value === "boolean")
      preferences[key] = value;
    if (
      (key === "musicVolume" || key === "effectsVolume") &&
      typeof value === "number" &&
      Number.isFinite(value)
    )
      preferences[key] = Math.max(0, Math.min(1, value));
    void audio.unlock();
    changed();
  },
  choose(id) {
    if (loaded && !renderer?.settling && choosePerk(state, id)) {
      recordQuestProgress(state.quests, { type: "oath" }, Date.now());
      prepareExperience(state).lessons.oath = true;
      audio.play("oath");
      note = `${PERKS.find((p) => p.id === id)!.title} joins your build.`;
      changed(true);
    }
  },
  skip() {
    if (loaded && !renderer?.settling && skipPerk(state)) {
      prepareExperience(state).lessons.oath = true;
      note = "Choice skipped. The company marches on.";
      changed(true);
    }
  },
  equip(slot, id) {
    if (loaded && equip(state, slot, id)) {
      audio.play("equip");
      changed(true);
    }
  },
  upgrade(id) {
    if (loaded && buyUpgrade(state, id)) {
      audio.play("forge");
      changed();
    }
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
    const result = castSkill(state);
    if (result.some((event) => event.type === "skill"))
      prepareExperience(state).lessons.skill = true;
    events(result);
    draw();
    publish();
  },
  refreshMissions() {
    if (!loaded) return;
    const previousDay = state.quests.daily.period;
    advanceQuests(state.quests, Date.now());
    if (previousDay !== state.quests.daily.period) changed();
    else publish();
  },
  claim(scope, id, period) {
    if (!loaded || saveLocked) return;
    if (state.meta.earnedGold > 1e12 - 150) return;
    const reward = claimQuest(state.quests, scope, id, period, Date.now());
    if (reward > 0) {
      state.meta.gold += reward;
      state.meta.earnedGold += reward;
      audio.play("claim");
      note = `Mission reward claimed · +${reward} gold for the company.`;
    } else note = "This objective has changed or its reward is already claimed.";
    changed();
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
    const day = state.quests.daily.period;
    advanceQuests(state.quests, Date.now());
    if (day !== state.quests.daily.period) void persist();
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
platform.onAudioEnabledChange(() => {
  syncAudio();
  publish();
});
platform.onPauseChange((paused) => {
  platformPaused = paused;
  syncPause();
});
window.addEventListener("pointerdown", (event) => {
  if (event.target instanceof Node && app.contains(event.target)) void audio.unlock();
});
window.addEventListener("click", (event) => {
  const button = event.target instanceof Element ? event.target.closest("button") : null;
  if (
    button &&
    app.contains(button) &&
    !button.matches("[data-equip], [data-upgrade], [data-perk], [data-claim-quest], .cast-skill")
  )
    audio.play("page");
});
window.addEventListener("keydown", (event) => {
  if (
    event.target instanceof Node &&
    (app.contains(event.target) || event.target === document.body) &&
    !(
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target instanceof HTMLElement && event.target.isContentEditable)
    )
  )
    void audio.unlock();
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
prepareExperience(state);
inspecting = !experienceOf(state).introSeen;
loaded = true;
advanceQuests(state.quests, Date.now());
campStage = state.phase.kind === "camp";
if (!saveLocked) saveMessage = "Progress stays on this device";
draw();
publish();
platform.gameReady();
syncPause();
if (!saveLocked) void persist();
