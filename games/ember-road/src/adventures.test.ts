import { describe, expect, it } from "vitest";
import {
  activityPreview,
  advanceAdventures,
  DAY_MS,
  routeOptions,
  runLength,
  TIERS,
} from "./adventures";
import {
  adventureEnemies,
  beginBattle,
  useSkill as castSkill,
  choosePerk,
  chooseRoute,
  encounter,
  type GameState,
  heroStats,
  initialState,
  migrateV3State,
  returnToCamp,
  skipPerk,
  startActivity,
  startRun,
  stepGame,
  validState,
  validV3State,
} from "./model";
import { systemUnlocked } from "./progression";
import { recordQuestProgress } from "./quests";

function finish(state: GameState) {
  for (let frame = 0; frame < 40_000; frame++) {
    if (["victory", "defeat"].includes(state.phase.kind)) return;
    if (state.phase.kind === "choice")
      choosePerk(
        state,
        state.phase.options.includes("renewal") ? "renewal" : state.phase.options[0]!,
      );
    if (state.phase.kind === "route")
      chooseRoute(
        state,
        state.phase.at === 3 ? "rescue" : state.phase.at === 6 ? "shrine" : "tracks",
      );
    for (const event of [...castSkill(state), ...stepGame(state, 1 / 30)]) {
      if (event.type === "victory" && state.run.context?.kind === "campaign")
        recordQuestProgress(state.quests, { type: "victory", chapter: state.run.chapter }, 0);
    }
    expect(validState(state)).toBe(true);
  }
  throw new Error("Adventure failed to resolve");
}
function veteran() {
  const state = initialState(7);
  state.meta.unlockedChapter = 5;
  state.quests.story.completed = [1, 2, 3, 4];
  state.meta.upgrades = { blade: 8, mail: 8, charm: 8 };
  state.meta.progression!.renown = 500;
  Object.assign(state.adventures!.discoveries, { mira: true, cinder: true, whirlwind: true });
  state.run.hp = heroStats(state).hp;
  return state;
}
function launch(state: GameState, kind: "daily" | "hunt", tier: 1 | 2 | 3, now = DAY_MS * 40) {
  advanceAdventures(state, now);
  const offer = activityPreview(state, kind, tier);
  expect(startActivity(state, kind, tier, offer.period, offer.id, now)).toBe(true);
  return offer;
}
describe("adventure routes and discoveries", () => {
  it("plays a fresh full chapter through three saved route decisions and discovers a company", () => {
    const state = initialState(927113);
    startRun(state);
    finish(state);
    expect(state.phase.kind).toBe("victory");
    expect(state.run.cleared).toBe(12);
    expect(state.run.context).toMatchObject({
      kind: "campaign",
      routes: [
        { at: 3, path: "rescue" },
        { at: 6, path: "shrine" },
        { at: 9, path: "tracks" },
      ],
    });
    expect(state.adventures!.discoveries).toMatchObject({
      mira: true,
      cinder: true,
      whirlwind: true,
    });
    expect(systemUnlocked(state, "daily")).toBe(true);
    expect(systemUnlocked(state, "weekly")).toBe(false);
  });
  it("gives spring, elite and discovery trails distinct outcomes without repeating a saved choice", () => {
    const initial = initialState();
    startRun(initial);
    initial.run.cleared = 3;
    initial.phase = { kind: "route", at: 3 };
    initial.run.hp = 60;
    expect(validState(initial)).toBe(true);
    const spring = structuredClone(initial),
      elite = structuredClone(initial),
      rescue = structuredClone(initial);
    expect(chooseRoute(spring, "spring")).toBe(true);
    expect(chooseRoute(elite, "elite")).toBe(true);
    expect(chooseRoute(rescue, "rescue")).toBe(true);
    expect(spring.run.hp).toBeGreaterThan(rescue.run.hp);
    expect(adventureEnemies(spring)[0]!.maxHp).toBeLessThan(adventureEnemies(rescue)[0]!.maxHp);
    expect(adventureEnemies(elite)[0]!.armor).toBeGreaterThan(adventureEnemies(rescue)[0]!.armor);
    expect(adventureEnemies(elite).reduce((n, e) => n + e.gold, 0)).toBeGreaterThan(
      adventureEnemies(rescue).reduce((n, e) => n + e.gold, 0),
    );
    expect(systemUnlocked(rescue, "company")).toBe(true);
    expect(systemUnlocked(spring, "company")).toBe(false);
    const restored = JSON.parse(JSON.stringify(spring)),
      before = structuredClone(restored);
    expect(validState(restored)).toBe(true);
    expect(chooseRoute(restored, "rescue")).toBe(false);
    expect(restored).toEqual(before);
    restored.phase = { kind: "defeat", enemy: adventureEnemies(restored)[0]!.name };
    restored.run.hp = 0;
    expect(returnToCamp(restored)).toBe(true);
    startRun(restored);
    restored.run.cleared = 3;
    restored.phase = { kind: "route", at: 3 };
    expect(routeOptions(3)).toContain("rescue");
    expect(chooseRoute(restored, "rescue")).toBe(true);
  });
  it("awakens Whirlwind with two chosen oaths and never grants it for skipping", () => {
    const state = initialState();
    for (let i = 0; i < 2; i++) {
      state.phase = { kind: "choice", options: ["edge"] };
      choosePerk(state, "edge");
    }
    expect(systemUnlocked(state, "skills")).toBe(true);
    const skipped = initialState();
    skipped.phase = { kind: "choice", options: ["edge"] };
    skipPerk(skipped);
    expect(systemUnlocked(skipped, "skills")).toBe(false);
  });
});
describe("calendar adventures", () => {
  it("rotates five actual combat styles and preserves a captured daily offer on reopen", () => {
    const signatures = new Set<string>();
    for (let day = 40; day < 45; day++) {
      const state = veteran();
      const offer = launch(state, "daily", 1, day * DAY_MS);
      expect(runLength(state)).toBe(6);
      signatures.add(
        JSON.stringify(
          adventureEnemies(state).map((e) => [
            e.kind,
            e.row,
            e.interval,
            e.damage,
            e.armor,
            e.maxHp,
          ]),
        ),
      );
      const restored = JSON.parse(JSON.stringify(state));
      expect(validState(restored)).toBe(true);
      expect(adventureEnemies(restored)).toEqual(adventureEnemies(state));
      expect(activityPreview(restored, "daily", 1)).toEqual(offer);
    }
    expect(signatures.size).toBe(5);
  });
  it.each([
    1, 2, 3,
  ] as const)("pays daily tier %i once and retains base replay rewards after reload", (tier) => {
    const state = veteran(),
      beforeChapter = state.meta.unlockedChapter,
      beforeVictories = state.meta.victories,
      beforeStory = structuredClone(state.quests.story);
    const offer = launch(state, "daily", tier);
    finish(state);
    expect(state.phase).toMatchObject({
      kind: "victory",
      bonusStatus: "earned",
      bonus: offer.reward.gold,
      reward: 20 + offer.reward.gold,
    });
    expect(state.meta.victories).toBe(beforeVictories);
    expect(state.meta.unlockedChapter).toBe(beforeChapter);
    expect(state.quests.story).toEqual(beforeStory);
    const saved = JSON.parse(JSON.stringify(state));
    expect(validState(saved)).toBe(true);
    const frozen = structuredClone(saved);
    stepGame(saved, 0.1);
    expect(saved).toEqual(frozen);
    returnToCamp(saved);
    launch(saved, "daily", tier);
    finish(saved);
    expect(saved.phase).toMatchObject({
      kind: "victory",
      bonusStatus: "claimed",
      bonus: 0,
      reward: 20,
    });
    expect(saved.adventures.daily).toEqual([tier]);
  });
  it.each([
    1, 2, 3,
  ] as const)("plays three distinct hunt rounds and pays weekly tier %i only once", (tier) => {
    const state = veteran(),
      offer = launch(state, "hunt", tier);
    const rounds = [];
    for (let cleared = 0; cleared < 3; cleared++) {
      state.run.cleared = cleared;
      rounds.push(adventureEnemies(state));
    }
    expect(rounds.map((r) => r.length)).toEqual([1, 2, 3]);
    expect(rounds[1]![1]!.row).toBe("front");
    expect(rounds[2]![1]!.kind).toBe("hexer");
    expect(rounds[0]![0]!.interval).toBeGreaterThan(rounds[2]![0]!.interval);
    state.run.cleared = 0;
    finish(state);
    expect(state.phase).toMatchObject({
      kind: "victory",
      bonusStatus: "earned",
      reward: 35 + offer.reward.gold,
    });
    returnToCamp(state);
    launch(state, "hunt", tier);
    finish(state);
    expect(state.phase).toMatchObject({ kind: "victory", bonusStatus: "claimed", reward: 35 });
  });
  it("rejects stale offers, honors story and tier gates, and distinguishes quest access from new activities", () => {
    const state = initialState();
    const offer = activityPreview(state, "daily", 1);
    expect(startActivity(state, "daily", 1, offer.period, offer.id, 0)).toBe(false);
    state.meta.unlockedChapter = 2;
    state.quests.story.completed = [1];
    expect(startActivity(state, "hunt", 1, 0, 0, 0)).toBe(false);
    const locked = activityPreview(state, "daily", 3);
    expect(locked.unlocked).toBe(false);
    const before = structuredClone(state.run);
    expect(startActivity(state, "daily", 1, 0, 0, DAY_MS)).toBe(false);
    expect(state.run).toEqual(before);
    const old = initialState();
    delete old.adventures;
    delete old.run.context;
    old.meta.progression!.renown = 120;
    const migrated = migrateV3State(old);
    expect(systemUnlocked(migrated, "weekly")).toBe(true);
    expect(activityPreview(migrated, "hunt", 1).unlocked).toBe(false);
  });
  it.each([
    "daily",
    "hunt",
  ] as const)("expires %s bonuses midrun and never reopens old periods on clock rollback", (kind) => {
    const state = veteran(),
      now = 40 * DAY_MS;
    const old = launch(state, kind, 1, now);
    advanceAdventures(state, now + 8 * DAY_MS);
    finish(state);
    expect(state.phase).toMatchObject({
      kind: "victory",
      bonusStatus: "expired",
      bonus: 0,
      reward: kind === "daily" ? 20 : 35,
    });
    const period = kind === "daily" ? state.adventures!.day : state.adventures!.week;
    advanceAdventures(state, now);
    expect(kind === "daily" ? state.adventures!.day : state.adventures!.week).toBe(period);
    returnToCamp(state);
    expect(startActivity(state, kind, 1, old.period, old.id, now)).toBe(false);
    const current = activityPreview(state, kind, 1);
    expect(startActivity(state, kind, 1, current.period, current.id, now)).toBe(true);
    finish(state);
    expect(state.phase).toMatchObject({ kind: "victory", bonusStatus: "earned" });
  });
  it("rejects invalid route/context/ledger and forged activity battle templates within the packed save limit", () => {
    const state = veteran();
    launch(state, "daily", 1);
    state.phase = beginBattle(state);
    expect(validState(state)).toBe(true);
    const forgedLegacy = structuredClone(state);
    forgedLegacy.phase = {
      ...beginBattle(forgedLegacy),
      formation: "legacy",
      enemies: [
        {
          ...encounter(forgedLegacy.run.chapter, forgedLegacy.run.cleared),
          id: "enemy-0",
          slot: 0,
          row: "front",
          cooldown: 1,
          pendingHit: null,
        },
      ],
    };
    expect(validState(forgedLegacy)).toBe(false);
    const forgedCamp = structuredClone(state);
    forgedCamp.phase = { kind: "camp" };
    expect(validState(forgedCamp)).toBe(false);
    for (const mutate of [
      (s: GameState) => {
        s.adventures!.daily = [1, 1];
      },
      (s: GameState) => {
        if (s.run.context?.kind === "daily") s.run.context.id = 99;
      },
      (s: GameState) => {
        if (s.phase.kind === "battle") s.phase.enemies[0]!.damage++;
      },
      (s: GameState) => {
        s.phase = { kind: "route", at: 3 };
      },
    ]) {
      const bad = structuredClone(state);
      mutate(bad);
      expect(validState(bad)).toBe(false);
    }
    expect(
      new TextEncoder().encode(JSON.stringify({ version: 4, savedAt: 0, state })).byteLength,
    ).toBeLessThan(65536);
    const old = initialState();
    delete old.adventures;
    delete old.run.context;
    expect(validV3State(old)).toBe(true);
    const upgraded = migrateV3State(old);
    expect(validState(upgraded)).toBe(true);
    expect(upgraded.meta).toEqual(old.meta);
  });
});
