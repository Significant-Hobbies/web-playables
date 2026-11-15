const DAY_MS = 86_400_000;
const MAX_DAY = Math.floor(Date.UTC(10_000, 0, 1) / DAY_MS) - 1;
const MAX_COUNTER = 1_000_000_000;

export type QuestProgress = {
  kills: number;
  skills: number;
  oaths: number;
  victories: number;
};

export type PeriodQuests = {
  period: number;
  progress: QuestProgress;
  claimed: string[];
};

export type QuestLedger = {
  daily: PeriodQuests;
  weekly: PeriodQuests;
  story: {
    completed: number[];
    claimed: number[];
  };
};

export type QuestEvent =
  | { type: "kill" }
  | { type: "skill" }
  | { type: "oath" }
  | { type: "victory"; chapter: number };

export type QuestScope = "daily" | "weekly" | "story";

export type QuestCard = {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  reward: number;
  claimed: boolean;
  ready: boolean;
  period: number | null;
};

export type QuestBoard = {
  daily: QuestCard[];
  weekly: QuestCard[];
  story: QuestCard[];
};

type Objective = {
  id: string;
  title: string;
  description: string;
  metric: keyof QuestProgress;
  target: number;
  reward: number;
};

function emptyProgress(): QuestProgress {
  return { kills: 0, skills: 0, oaths: 0, victories: 0 };
}

function dayFor(now: number): number {
  if (!Number.isFinite(now) || now < 0)
    throw new RangeError("Quest time must be a finite UTC timestamp.");
  const day = Math.floor(now / DAY_MS);
  if (day > MAX_DAY) throw new RangeError("Quest time exceeds year 9999.");
  return day;
}

function weekForDay(day: number): number {
  // Unix day zero is Thursday; adding three aligns Monday with a week boundary.
  return Math.floor((day + 3) / 7);
}

function newPeriod(period: number): PeriodQuests {
  return { period, progress: emptyProgress(), claimed: [] };
}

export function initialQuests(now = 0, completed: readonly number[] = []): QuestLedger {
  const day = dayFor(now);
  const chapters = [...new Set(completed)].sort((a, b) => a - b);
  if (chapters.some((chapter) => !Number.isInteger(chapter) || chapter < 1 || chapter > 5))
    throw new RangeError("Completed story chapters must be integers from 1 through 5.");
  return {
    daily: newPeriod(day),
    weekly: newPeriod(weekForDay(day)),
    story: { completed: chapters, claimed: [] },
  };
}

/** Advance period buckets only. Backward clock movement never reopens an earlier bucket. */
export function advanceQuests(ledger: QuestLedger, now: number): QuestLedger {
  const day = dayFor(now);
  const week = weekForDay(day);
  if (day > ledger.daily.period) ledger.daily = newPeriod(day);
  if (week > ledger.weekly.period) ledger.weekly = newPeriod(week);
  return ledger;
}

export function recordQuestProgress(
  ledger: QuestLedger,
  event: QuestEvent,
  now: number,
): QuestLedger {
  advanceQuests(ledger, now);
  if (event.type === "victory") {
    increment(ledger.daily.progress, "victories");
    increment(ledger.weekly.progress, "victories");
    if (Number.isInteger(event.chapter) && event.chapter >= 1 && event.chapter <= 5) {
      if (!ledger.story.completed.includes(event.chapter)) {
        ledger.story.completed.push(event.chapter);
        ledger.story.completed.sort((a, b) => a - b);
      }
    }
  } else {
    const metric = event.type === "kill" ? "kills" : event.type === "skill" ? "skills" : "oaths";
    increment(ledger.daily.progress, metric);
    increment(ledger.weekly.progress, metric);
  }
  return ledger;
}

function increment(progress: QuestProgress, metric: keyof QuestProgress) {
  progress[metric] = Math.min(MAX_COUNTER, progress[metric] + 1);
}

function dailyObjectives(period: number): Objective[] {
  const foes = [8, 10, 12][period % 3]!;
  const skills = [2, 3][period % 2]!;
  const oaths = [1, 2][period % 2]!;
  return [
    {
      id: `daily-foes-${foes}`,
      title: "Thin the briars",
      description: `Defeat ${foes} foes.`,
      metric: "kills",
      target: foes,
      reward: 12,
    },
    {
      id: `daily-skills-${skills}`,
      title: "Shape the fight",
      description: `Cast ${skills} skills.`,
      metric: "skills",
      target: skills,
      reward: 15,
    },
    {
      id: `daily-oaths-${oaths}`,
      title: "Choose your oath",
      description: `Choose ${oaths} perk${oaths === 1 ? "" : "s"}.`,
      metric: "oaths",
      target: oaths,
      reward: 18,
    },
  ];
}

const WEEKLY_OBJECTIVES: Objective[] = [
  {
    id: "weekly-foes-75",
    title: "Clear the old road",
    description: "Defeat 75 foes.",
    metric: "kills",
    target: 75,
    reward: 90,
  },
  {
    id: "weekly-skills-15",
    title: "Master your skill",
    description: "Cast 15 skills.",
    metric: "skills",
    target: 15,
    reward: 75,
  },
  {
    id: "weekly-victories-3",
    title: "Carry the light onward",
    description: "Win 3 chapters.",
    metric: "victories",
    target: 3,
    reward: 150,
  },
];

function toView(objective: Objective, source: PeriodQuests, period: number): QuestCard {
  const progress = Math.min(objective.target, source.progress[objective.metric]);
  const claimed = source.claimed.includes(objective.id);
  return {
    id: objective.id,
    title: objective.title,
    description: objective.description,
    target: objective.target,
    progress,
    reward: objective.reward,
    claimed,
    ready: progress >= objective.target && !claimed,
    period,
  };
}

export function questBoard(ledger: QuestLedger, now = ledger.daily.period * DAY_MS): QuestBoard {
  advanceQuests(ledger, now);
  const daily = dailyObjectives(ledger.daily.period);
  return {
    daily: daily.map((objective) => toView(objective, ledger.daily, ledger.daily.period)),
    weekly: WEEKLY_OBJECTIVES.map((objective) =>
      toView(objective, ledger.weekly, ledger.weekly.period),
    ),
    story: [25, 45, 70, 100, 150].map((reward, index) => {
      const chapter = index + 1;
      const completed = ledger.story.completed.includes(chapter);
      const claimed = ledger.story.claimed.includes(chapter);
      return {
        id: `chapter-${chapter}`,
        title: `Chapter ${chapter}`,
        description: `Complete chapter ${chapter}.`,
        target: 1,
        progress: completed ? 1 : 0,
        reward,
        claimed,
        ready: completed && !claimed,
        period: null,
      };
    }),
  };
}

/** Mark synchronously before returning the reward amount; callers then credit gold and earnedGold. */
export function claimQuest(
  ledger: QuestLedger,
  scope: QuestScope,
  id: string,
  displayedPeriod: number | null,
  now: number,
): number {
  advanceQuests(ledger, now);
  if (scope === "story") {
    if (displayedPeriod !== null) return 0;
    const match = /^chapter-([1-5])$/.exec(id);
    const chapter = match ? Number(match[1]) : 0;
    if (
      !chapter ||
      !ledger.story.completed.includes(chapter) ||
      ledger.story.claimed.includes(chapter)
    )
      return 0;
    ledger.story.claimed.push(chapter);
    ledger.story.claimed.sort((a, b) => a - b);
    return [25, 45, 70, 100, 150][chapter - 1]!;
  }
  const bucket = ledger[scope];
  if (displayedPeriod !== bucket.period) return 0;
  const objectives = scope === "daily" ? dailyObjectives(bucket.period) : WEEKLY_OBJECTIVES;
  const objective = objectives.find((candidate) => candidate.id === id);
  if (
    !objective ||
    bucket.claimed.includes(id) ||
    bucket.progress[objective.metric] < objective.target
  )
    return 0;
  bucket.claimed.push(id);
  return objective.reward;
}

export function resetAt(ledger: QuestLedger, scope: "daily" | "weekly"): number {
  if (scope === "daily") return (ledger.daily.period + 1) * DAY_MS;
  // Week 0 begins Monday 1969-12-29, hence the inverse of floor((day + 3) / 7).
  return (ledger.weekly.period * 7 - 3 + 7) * DAY_MS;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validCounter(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_COUNTER;
}

function validProgress(value: unknown): value is QuestProgress {
  return (
    isRecord(value) &&
    Object.keys(value).length === 4 &&
    ["kills", "skills", "oaths", "victories"].every((key) => validCounter(value[key]))
  );
}

function validPeriodBucket(value: unknown, isDaily: boolean): value is PeriodQuests {
  if (!isRecord(value) || !validCounter(value.period) || value.period > MAX_DAY) return false;
  if (!validProgress(value.progress) || !Array.isArray(value.claimed) || value.claimed.length > 3)
    return false;
  const period = value.period;
  const progress = value.progress;
  if (
    !value.claimed.every((id) => typeof id === "string") ||
    new Set(value.claimed).size !== value.claimed.length
  )
    return false;
  const allowed = isDaily
    ? dailyObjectives(value.period).map((q) => q.id)
    : WEEKLY_OBJECTIVES.map((q) => q.id);
  return value.claimed.every((id) => {
    const objective = (isDaily ? dailyObjectives(period) : WEEKLY_OBJECTIVES).find(
      (q) => q.id === id,
    );
    return (
      allowed.includes(id as string) &&
      objective !== undefined &&
      progress[objective.metric] >= objective.target
    );
  });
}

export function validQuestLedger(value: unknown): value is QuestLedger {
  if (
    !isRecord(value) ||
    !validPeriodBucket(value.daily, true) ||
    !validPeriodBucket(value.weekly, false)
  )
    return false;
  if (value.weekly.period !== weekForDay(value.daily.period)) return false;
  if (
    !isRecord(value.story) ||
    !Array.isArray(value.story.completed) ||
    !Array.isArray(value.story.claimed)
  )
    return false;
  const completed = value.story.completed;
  const claimed = value.story.claimed;
  const validChapters = (items: unknown[]) =>
    items.length <= 5 &&
    items.every(
      (chapter) => Number.isInteger(chapter) && Number(chapter) >= 1 && Number(chapter) <= 5,
    ) &&
    new Set(items).size === items.length;
  return (
    validChapters(completed) &&
    validChapters(claimed) &&
    claimed.every((chapter) => completed.includes(chapter))
  );
}
