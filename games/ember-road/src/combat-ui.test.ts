import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThreatReadout } from "./combat-ui";
import { beginBattle, initialState, issueCommand, startRun, validState } from "./model";

function threats() {
  const state = initialState();
  startRun(state);
  state.run.cleared = 4;
  state.phase = beginBattle(state);
  for (const enemy of state.phase.enemies) {
    enemy.cooldown = 5;
    enemy.pendingHit = {
      remaining: enemy.kind === "sentinel" ? 0.4 : 2,
      windup: enemy.kind === "sentinel" ? 1.25 : 2.2,
      damage: enemy.damage,
      critical: false,
    };
  }
  return state as typeof state & { phase: ReturnType<typeof beginBattle> };
}

describe("combat guidance follows the actual command", () => {
  it("recommends Brace when Breakthrough will interrupt a different enemy", () => {
    const state = threats();
    expect(validState(state)).toBe(true);
    expect(renderToStaticMarkup(createElement(ThreatReadout, { state }))).toContain(
      "W · Brace at contact",
    );
    const events = issueCommand(state, "breakthrough");
    expect(events.some((event) => event.type === "interrupt" && event.target === "enemy-1")).toBe(
      true,
    );
    expect(state.phase.enemies[0]!.pendingHit).not.toBeNull();
  });
  it("does not recommend an interrupt against a foe resisting further cancels", () => {
    const state = threats();
    state.phase.enemies[0]!.hp = 0;
    state.phase.enemies[0]!.pendingHit = null;
    state.phase.enemies[1]!.braced = true;
    expect(validState(state)).toBe(true);
    expect(renderToStaticMarkup(createElement(ThreatReadout, { state }))).toContain(
      "W · Brace at contact",
    );
    expect(issueCommand(state, "breakthrough").some((event) => event.type === "interrupt")).toBe(
      false,
    );
  });
  it("recommends interruption only while that response is ready", () => {
    const state = threats();
    state.phase.enemies[0]!.hp = 0;
    state.phase.enemies[0]!.pendingHit = null;
    expect(renderToStaticMarkup(createElement(ThreatReadout, { state }))).toContain(
      "E · Interrupt",
    );
    state.phase.commands!.breakthroughCooldown = 1;
    expect(renderToStaticMarkup(createElement(ThreatReadout, { state }))).toContain(
      "W · Brace at contact",
    );
  });
});
