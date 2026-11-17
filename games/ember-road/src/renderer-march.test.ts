import { describe, expect, it } from "vitest";
import { marchEnemy } from "./ember-march";
import * as M from "./model";
import { type Scene, WorldRenderer } from "./renderer";

// Exercise capture/event/pose behavior without asking Node to draw pixels.
function harness() {
  const renderer = Object.create(WorldRenderer.prototype) as WorldRenderer;
  const scenes: Scene[] = [];
  Object.assign(renderer, {
    motions: new Map(),
    foes: [],
    fallen: [],
    capturedBattle: undefined,
    effects: [],
    seenReactions: new WeakSet(),
    sparks: [],
    campView: false,
    width: 1000,
    height: 520,
    actorScale: 1,
    clearingImage: { naturalWidth: 1672, naturalHeight: 941 },
    draw: (scene: Scene) => {
      scenes.push(scene);
      Object.assign(renderer, { scene });
    },
  });
  return { renderer, scenes };
}

describe("March presentation continuity", () => {
  it("keeps the same walking pose through a frozen saved choice and resume", () => {
    const state = M.initialState(42);
    M.startEmberMarch(state);
    for (let i = 0; i < 10000 && state.phase.kind !== "choice"; i++) M.stepGame(state, 1 / 60);
    if (state.phase.kind !== "choice" || !state.phase.resume) throw new Error("No live choice");
    const choice = state.phase;
    const battle = state.phase.resume.battle;
    battle.enemies[0]!.pendingHit = { remaining: 0.2, damage: 5, critical: false };
    const { renderer, scenes } = harness();
    state.phase = battle;
    renderer.frame(state, 7, false, false);
    state.phase = choice;
    const frozen = structuredClone(state);
    renderer.frame(state, 7, false, false);
    expect(state).toEqual(frozen);
    M.choosePerk(state, choice.options[0]!, choice.offerId);
    renderer.frame(state, 7, false, false);
    expect(scenes.map((scene) => scene.walking)).toEqual([true, true, true]);
    expect(scenes.map((scene) => scene.time)).toEqual([7, 7, 7]);
    expect(scenes.map((scene) => scene.brace)).toEqual([undefined, undefined, undefined]);
    expect(scenes[1]!.enemies.map((foe) => foe.id)).toEqual(
      scenes[0]!.enemies.map((foe) => foe.id),
    );
  });

  it("places a same-tick spawn and death in its real lane and retires its visual corpse", () => {
    const state = M.initialState(42);
    M.startEmberMarch(state);
    const { renderer, scenes } = harness();
    renderer.frame(state, 7, false, false);
    const spawned = marchEnemy(6, 2);
    const before = structuredClone(state);
    renderer.handle(
      [
        { type: "spawn", enemy: spawned },
        {
          type: "hit",
          side: "enemy",
          actor: "hero",
          target: spawned.id,
          damage: spawned.hp,
          critical: false,
        },
        { type: "xp", amount: 1, target: spawned.id },
        { type: "kill", gold: 1, target: spawned.id },
      ],
      state,
    );
    expect(state).toEqual(before);
    expect(spawned.hp).toBe(spawned.maxHp);
    expect(renderer.sparks.find((spark) => spark.text === "+1 XP")!.x).toBeGreaterThanOrEqual(740);
    renderer.frame(state, 7, false, false);
    expect(scenes.at(-1)!.enemies.find((foe) => foe.id === spawned.id)).toMatchObject({
      row: "back",
      hp: 0,
    });
    renderer.advance(0.6);
    renderer.frame(state, 7.6, false, false);
    expect(scenes.at(-1)!.enemies.some((foe) => foe.id === spawned.id)).toBe(false);
  });
});
