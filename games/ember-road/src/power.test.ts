import { describe, expect, it } from "vitest";
import { initialState as freshState } from "./model";
import { companyPower } from "./power";

function initialState(seed?: number) {
  const state = freshState(seed);
  delete state.meta.progression;
  return state;
}

describe("company power", () => {
  it("rates the equipped build without mutating or rating temporary run condition", () => {
    const state = initialState();
    const before = structuredClone(state);
    const power = companyPower(state);
    expect(state).toEqual(before);
    expect(power.total).toBeGreaterThan(23);
    state.run.hp = 1;
    state.run.skillCooldown = 8;
    state.run.shield = 100;
    state.meta.gold = 10000;
    expect(companyPower(state)).toEqual(power);
  });
  it("recognizes offensive, defensive and company improvements independently", () => {
    const state = initialState();
    const base = companyPower(state);
    state.meta.upgrades.mail++;
    expect(companyPower(state).defense).toBeGreaterThan(base.defense);
    expect(companyPower(state).offense).toBe(base.offense);
    state.meta.upgrades.blade++;
    expect(companyPower(state).offense).toBeGreaterThan(base.offense);
    expect(companyPower(state).company).toBeGreaterThan(base.company);
  });
  it("recognizes attack speed, group attacks, equipped skills and journey powers", () => {
    const state = initialState();
    const base = companyPower(state);
    state.meta.loadout.weapon = "spear";
    expect(companyPower(state).offense).toBeGreaterThan(base.offense);
    state.meta.loadout.companion = "sable";
    expect(companyPower(state).company).toBeGreaterThan(base.company);
    state.meta.loadout.skill = "aegis";
    expect(companyPower(state).technique).not.toBe(base.technique);
    const before = companyPower(state).total;
    state.run.perks.heart = 1;
    state.run.perks.storm = 1;
    expect(companyPower(state).total).toBeGreaterThan(before);
  });
});
