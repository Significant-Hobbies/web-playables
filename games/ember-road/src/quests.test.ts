import { describe, expect, it } from "vitest";
import {
  advanceQuests,
  claimQuest,
  initialQuests,
  type QuestEvent,
  questBoard,
  recordQuestProgress,
  resetAt,
  validQuestLedger,
} from "./quests";

const DAY = 86_400_000;
const MONDAY_1970 = 4 * DAY;

function recordMany(
  ledger: ReturnType<typeof initialQuests>,
  event: QuestEvent,
  count: number,
  now = 0,
) {
  for (let i = 0; i < count; i++) recordQuestProgress(ledger, event, now);
}

describe("Ember Road quest ledger", () => {
  it("cycles daily objectives by UTC day and exposes stable board metadata", () => {
    const ledger = initialQuests(0);
    expect(questBoard(ledger, 0).daily).toMatchObject([
      { id: "daily-foes-8", target: 8, reward: 12, period: 0 },
      { id: "daily-skills-2", target: 2, reward: 15, period: 0 },
      { id: "daily-oaths-1", target: 1, reward: 18, period: 0 },
    ]);
    expect(questBoard(ledger, DAY).daily.map((quest) => quest.id)).toEqual([
      "daily-foes-10",
      "daily-skills-3",
      "daily-oaths-2",
    ]);
    expect(questBoard(ledger, 2 * DAY).daily[0]).toMatchObject({
      id: "daily-foes-12",
      target: 12,
      reward: 12,
    });
  });

  it("advances and resets daily and Monday UTC weekly buckets at their exact boundaries", () => {
    const ledger = initialQuests(MONDAY_1970 - 1);
    expect(ledger.daily.period).toBe(3);
    expect(ledger.weekly.period).toBe(0);
    expect(resetAt(ledger, "daily")).toBe(MONDAY_1970);
    expect(resetAt(ledger, "weekly")).toBe(MONDAY_1970);
    recordMany(ledger, { type: "kill" }, 1, MONDAY_1970 - 1);

    advanceQuests(ledger, MONDAY_1970);
    expect(ledger.daily).toMatchObject({ period: 4, progress: { kills: 0 } });
    expect(ledger.weekly).toMatchObject({ period: 1, progress: { kills: 0 } });
    expect(resetAt(ledger, "weekly")).toBe(11 * DAY);
  });

  it("records only explicit events and saturates board progress at each objective target", () => {
    const ledger = initialQuests(0);
    advanceQuests(ledger, 100 * DAY);
    expect(ledger.daily.progress).toEqual({ kills: 0, skills: 0, oaths: 0, victories: 0 });
    expect(ledger.weekly.progress).toEqual({ kills: 0, skills: 0, oaths: 0, victories: 0 });

    recordMany(ledger, { type: "kill" }, 10, 100 * DAY);
    recordMany(ledger, { type: "skill" }, 2, 100 * DAY);
    recordQuestProgress(ledger, { type: "oath" }, 100 * DAY);
    expect(questBoard(ledger, 100 * DAY).daily).toMatchObject([
      { progress: 10, ready: true },
      { progress: 2, ready: true },
      { progress: 1, ready: true },
    ]);
  });

  it("pays daily and story rewards at most once, including after JSON reload", () => {
    const ledger = initialQuests(0);
    recordMany(ledger, { type: "kill" }, 8);
    expect(claimQuest(ledger, "daily", "daily-foes-8", 0, 0)).toBe(12);
    const reloaded = JSON.parse(JSON.stringify(ledger)) as typeof ledger;
    expect(claimQuest(reloaded, "daily", "daily-foes-8", 0, 0)).toBe(0);

    recordQuestProgress(reloaded, { type: "victory", chapter: 1 }, 0);
    expect(claimQuest(reloaded, "story", "chapter-1", null, 0)).toBe(25);
    const storyReload = JSON.parse(JSON.stringify(reloaded)) as typeof reloaded;
    expect(claimQuest(storyReload, "story", "chapter-1", null, 0)).toBe(0);
    expect(storyReload.story).toEqual({ completed: [1], claimed: [1] });
  });

  it("rejects stale clicks, unknown IDs, unearned objectives, and invalid scope periods", () => {
    const ledger = initialQuests(0);
    recordMany(ledger, { type: "kill" }, 8);
    expect(claimQuest(ledger, "daily", "daily-foes-8", null, 0)).toBe(0);
    expect(claimQuest(ledger, "daily", "made-up", 0, 0)).toBe(0);
    expect(claimQuest(ledger, "daily", "daily-foes-8", 0, DAY)).toBe(0);
    expect(claimQuest(ledger, "weekly", "weekly-foes-75", 0, 0)).toBe(0);
    expect(claimQuest(ledger, "story", "chapter-1", 0, 0)).toBe(0);
    expect(ledger.daily.claimed).toEqual([]);
  });

  it("does not reopen completed claims when the clock moves backwards", () => {
    const ledger = initialQuests(0);
    recordMany(ledger, { type: "kill" }, 8, 0);
    expect(claimQuest(ledger, "daily", "daily-foes-8", 0, 0)).toBe(12);

    advanceQuests(ledger, DAY);
    expect(ledger.daily.period).toBe(1);
    expect(claimQuest(ledger, "daily", "daily-foes-8", 0, 0)).toBe(0);
    expect(ledger.daily.period).toBe(1);
    expect(ledger.daily.progress.kills).toBe(0);
  });

  it("counts each event once and records each story chapter only once", () => {
    const ledger = initialQuests(0);
    recordQuestProgress(ledger, { type: "skill" }, 0);
    recordQuestProgress(ledger, { type: "oath" }, 0);
    recordQuestProgress(ledger, { type: "victory", chapter: 2 }, 0);
    recordQuestProgress(ledger, { type: "victory", chapter: 2 }, 0);
    expect(ledger.daily.progress).toEqual({ kills: 0, skills: 1, oaths: 1, victories: 2 });
    expect(ledger.weekly.progress.victories).toBe(2);
    expect(ledger.story.completed).toEqual([2]);
    expect(questBoard(ledger, 0).story[1]).toMatchObject({
      id: "chapter-2",
      reward: 45,
      ready: true,
    });
  });

  it("validates bounded shape, calendar buckets, allowed claims, and story claim membership", () => {
    const ledger = initialQuests(0, [1, 3]);
    expect(validQuestLedger(ledger)).toBe(true);
    expect(validQuestLedger({ ...ledger, daily: { ...ledger.daily, period: Number.NaN } })).toBe(
      false,
    );
    expect(validQuestLedger({ ...ledger, weekly: { ...ledger.weekly, period: 2 } })).toBe(false);
    expect(
      validQuestLedger({ ...ledger, daily: { ...ledger.daily, claimed: ["not-a-quest"] } }),
    ).toBe(false);
    expect(
      validQuestLedger({
        ...ledger,
        daily: { ...ledger.daily, progress: { ...ledger.daily.progress, kills: 1.5 } },
      }),
    ).toBe(false);
    expect(validQuestLedger({ ...ledger, story: { completed: [1], claimed: [2] } })).toBe(false);
    expect(validQuestLedger({ ...ledger, story: { completed: [1, 1], claimed: [] } })).toBe(false);
  });
});
