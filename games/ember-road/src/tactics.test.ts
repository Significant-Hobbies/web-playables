import { describe, expect, it } from "vitest";
import { activityPreview, advanceAdventures, DAY_MS } from "./adventures";
import {
  beginBattle,
  useSkill as castSkill,
  choosePerk,
  chooseRoute,
  enemyIntent,
  type GameState,
  initialState,
  issueCommand,
  startActivity,
  startRun,
  stepGame,
  tacticalEncounterGroup,
  validState,
} from "./model";

function atEncounter(cleared = 0) {
  const state = initialState(42);
  startRun(state);
  state.run.cleared = cleared;
  state.run.context = { kind: "campaign", routes: [], junctionFloor: cleared };
  state.phase = beginBattle(state);
  state.phase.heroCooldown = 5;
  for (const enemy of state.phase.enemies) enemy.cooldown = 5;
  return state;
}
function advance(state: GameState, seconds: number) {
  const events = [];
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame++)
    events.push(...stepGame(state, 1 / 60));
  return events;
}
function readyHeavy() {
  const state = atEncounter(11);
  if (state.phase.kind !== "battle") throw Error("Expected battle");
  const boss = state.phase.enemies[0]!;
  boss.cooldown = 0;
  stepGame(state, 1 / 60);
  return state;
}

describe("readable tactical combat", () => {
  it("makes a last-moment brace avoid a heavy and counter, while an early brace expires", () => {
    const timed = readyHeavy(),
      early = structuredClone(timed),
      idle = structuredClone(timed);
    issueCommand(early, "brace");
    advance(timed, 1.3);
    issueCommand(timed, "brace");
    const events = advance(timed, 0.21);
    advance(early, 1.51);
    advance(idle, 1.51);
    expect(events.some((event) => event.type === "command" && event.result === "perfect")).toBe(
      true,
    );
    expect(timed.run.hp).toBe(180);
    expect(early.run.hp).toBe(idle.run.hp);
    expect(idle.run.hp).toBeLessThan(timed.run.hp);
    expect(timed.phase.kind === "battle" && timed.phase.enemies[0]!.hp).toBeLessThan(
      idle.phase.kind === "battle" ? idle.phase.enemies[0]!.hp : Infinity,
    );
  });
  it("breaks a visible hexer channel and commits attacks to that threat", () => {
    const state = atEncounter(3);
    if (state.phase.kind !== "battle") throw Error("Expected battle");
    const hexer = state.phase.enemies.find((enemy) => enemy.kind === "hexer")!;
    hexer.cooldown = 0;
    stepGame(state, 1 / 60);
    expect(hexer.pendingHit?.remaining).toBe(enemyIntent(hexer).windup);
    const hp = hexer.hp;
    const events = issueCommand(state, "breakthrough");
    expect(hexer.pendingHit).toBeNull();
    expect(hexer.hp).toBeLessThan(hp);
    expect(events.some((event) => event.type === "interrupt" && event.target === hexer.id)).toBe(
      true,
    );
    expect(state.phase.commands?.focus).toBe(hexer.id);
    expect(issueCommand(state, "breakthrough")).toEqual([]);
  });
  it("keeps command cooldowns and committed enemy windups through save/continue and pause", () => {
    const state = readyHeavy();
    issueCommand(state, "brace");
    advance(state, 0.2);
    const restored = JSON.parse(JSON.stringify(state)) as GameState;
    expect(validState(restored)).toBe(true);
    expect(stepGame(restored, 0)).toEqual([]);
    expect(restored).toEqual(state);
    expect(advance(restored, 0.2)).toEqual(advance(state, 0.2));
    expect(restored).toEqual(state);
  });
  it("commits a boss windup before enrage and quickens only its next attack", () => {
    const state = readyHeavy();
    if (state.phase.kind !== "battle") throw Error("Expected battle");
    const boss = state.phase.enemies[0]!;
    expect(boss.pendingHit?.windup).toBe(1.5);
    boss.hp = boss.maxHp * 0.4;
    expect(enemyIntent(boss).windup).toBe(1.5);
    expect(enemyIntent(boss).label).toBe("Crownfall");
    advance(state, 1.51);
    expect(boss.pendingHit).toBeNull();
    expect(enemyIntent(boss).windup).toBe(1.05);
    boss.cooldown = 0;
    stepGame(state, 1 / 60);
    expect(boss.pendingHit?.windup).toBe(1.05);
  });
  it("keeps Arrowstorm's accelerated archer recovery faster than ordinary archers", () => {
    const fast = initialState();
    fast.meta.unlockedChapter = 2;
    fast.quests.story.completed = [1];
    advanceAdventures(fast, DAY_MS * 40);
    const offer = activityPreview(fast, "daily", 1);
    expect(startActivity(fast, "daily", 1, offer.period, offer.id, DAY_MS * 40)).toBe(true);
    fast.phase = beginBattle(fast);
    const normal = atEncounter(1);
    const swings = (state: GameState) => {
      if (state.phase.kind !== "battle") throw Error("Expected battle");
      const battle = state.phase;
      const archer = battle.enemies.find((enemy) => enemy.kind === "archer")!;
      archer.cooldown = 0;
      let count = 0;
      for (let frame = 0; frame < 600; frame++) {
        battle.heroCooldown = 5;
        for (const enemy of battle.enemies) if (enemy !== archer) enemy.cooldown = 5;
        count += stepGame(state, 1 / 60).filter(
          (event) => event.type === "swing" && event.actor === archer.id,
        ).length;
      }
      return count;
    };
    expect(swings(fast)).toBeGreaterThan(swings(normal));
  });
  it("rejects malformed command saves and does not run commands behind a decision", () => {
    const state = readyHeavy();
    if (state.phase.kind !== "battle") throw Error("Expected battle");
    state.phase.commands!.braceCooldown = -1;
    expect(validState(state)).toBe(false);
    state.phase = { kind: "choice", options: ["edge", "heart", "storm"] };
    const before = structuredClone(state);
    expect(issueCommand(state, "brace")).toEqual([]);
    expect(state).toEqual(before);
  });
  it("preserves old in-flight templates and timing until the next departure", () => {
    const state = initialState();
    delete state.run.rules;
    state.phase = beginBattle(state);
    expect(state.phase.commands).toBeUndefined();
    expect(state.phase.enemies).toHaveLength(2);
    expect(validState(state)).toBe(true);
  });
  it("teaches solo, combines distinct threats, and changes formations between chapters", () => {
    expect(tacticalEncounterGroup(1, 0).map((e) => e.kind)).toEqual(["raider"]);
    expect(new Set(tacticalEncounterGroup(1, 5).map((e) => e.kind)).size).toBe(3);
    const formations = Array.from({ length: 5 }, (_, chapter) =>
      Array.from({ length: 11 }, (_, floor) =>
        tacticalEncounterGroup(chapter + 1, floor)
          .map((enemy) => enemy.kind)
          .join(","),
      ).join("|"),
    );
    expect(new Set(formations).size).toBe(5);
  });
  it.each([
    0.2, 0.55,
  ])("finishes an earned solo chapter with a %ss response window and three interruptions", (responseWindow) => {
    const state = initialState(927113);
    startRun(state);
    const stops: string[] = [];
    for (
      let frame = 0;
      frame < 18000 && !["victory", "defeat"].includes(state.phase.kind);
      frame++
    ) {
      if (state.phase.kind === "choice") {
        stops.push(`oath-${state.run.cleared}`);
        choosePerk(state, state.phase.options[0]!);
      }
      if (state.phase.kind === "route") {
        stops.push(`route-${state.run.cleared}`);
        chooseRoute(state, "shrine");
      }
      if (state.phase.kind === "battle") {
        const threat = state.phase.enemies.find(
          (enemy) =>
            enemy.hp > 0 && enemy.pendingHit && enemy.pendingHit.remaining < responseWindow,
        );
        if (threat) issueCommand(state, "brace");
        if (
          state.phase.enemies.some(
            (enemy) =>
              enemy.hp > 0 &&
              enemy.pendingHit &&
              (enemy.kind === "hexer" || enemy.kind === "sentinel"),
          )
        )
          issueCommand(state, "breakthrough");
        castSkill(state);
      }
      stepGame(state, 1 / 60);
      expect(validState(state)).toBe(true);
    }
    expect(state.phase.kind).toBe("victory");
    expect(stops).toEqual(["oath-3", "route-6", "oath-8"]);
    expect(state.adventures!.discoveries.mira).toBe(false);
    expect(state.adventures!.discoveries.cinder).toBe(false);
  });
});
