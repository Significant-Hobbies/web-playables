import { describe, expect, it } from "vitest";
import { discoveriesOnRoad, journalDiscoveries } from "./discoveries";
import { initialState } from "./model";

describe("discovery planning", () => {
  it("offers companions only on departures that actually contain their trails", () => {
    const state = initialState();
    state.meta.unlockedChapter = 5;
    expect(discoveriesOnRoad(state, 2).map((d) => d.id)).toContain("mira");
    expect(discoveriesOnRoad(state, 3).map((d) => d.id)).toContain("cinder");
    for (const chapter of [1, 4, 5]) {
      expect(
        discoveriesOnRoad(state, chapter).some((d) => d.id === "mira" || d.id === "cinder"),
      ).toBe(false);
    }
    expect(discoveriesOnRoad(state, 3).some((d) => d.id === "mira")).toBe(false);
  });
  it("points missed discoveries back to their replayable chapters", () => {
    const state = initialState();
    state.meta.unlockedChapter = 5;
    const journal = journalDiscoveries(state);
    expect(journal.find((d) => d.id === "mira")).toMatchObject({
      chapter: 2,
      available: true,
      found: false,
    });
    expect(journal.find((d) => d.id === "cinder")).toMatchObject({
      chapter: 3,
      available: true,
      found: false,
    });
    expect(journal.find((d) => d.id === "mira")!.route).not.toContain("or later");
    expect(journal.find((d) => d.id === "cinder")!.route).not.toContain("or later");
  });
  it("does not advertise a missing wind shrine on a road with a different fork", () => {
    const state = initialState();
    state.meta.unlockedChapter = 3;
    const route = discoveriesOnRoad(state, 2).find((d) => d.id === "whirlwind")!.route;
    expect(route).toContain("two oaths");
    expect(route).not.toContain("shrine after fight 6");
  });
  it("preserves guidance for an active legacy road while planning new departures accurately", () => {
    const state = initialState();
    state.meta.unlockedChapter = 5;
    state.run.chapter = 4;
    delete state.run.rules;
    state.phase = { kind: "travel", remaining: 1 };
    expect(journalDiscoveries(state).find((d) => d.id === "mira")!.route).toContain("or later");
    expect(discoveriesOnRoad(state, 4).some((d) => d.id === "mira")).toBe(false);
  });
});
