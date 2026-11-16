import { DISCOVERY_CHAPTERS } from "./adventures";
import type { GameState } from "./model";
import { systemUnlocked } from "./progression";

export type DiscoveryId = "whirlwind" | "mira" | "cinder";

const DISCOVERIES = [
  {
    id: "whirlwind",
    system: "skills",
    name: "The song in the stones",
    character: "Whirlwind",
    chapter: 1,
    reveal: 1,
    at: 6,
    clue: "The wind carries a forgotten sword form. Somewhere along the road, the stones still remember it.",
    route: "Visit the wind shrine after fight 6. Choosing two oaths also awakens Whirlwind.",
    outcome:
      "Whirlwind becomes yours for every journey. A whole front line can feel a single strike.",
    memory: "The stones answered. Rook carries their sword form into every new journey.",
  },
  {
    id: "mira",
    system: "company",
    name: "The missing ranger",
    character: "Mira",
    chapter: DISCOVERY_CHAPTERS.mira,
    reveal: 1,
    at: 3,
    clue: "A blue ribbon catches on the branches. Mira is alive, somewhere beyond the monastery bell.",
    route: "In chapter 2 or later, follow the ranger’s signal after fight 3.",
    outcome:
      "Rescue Mira to open your company. Her arrows reach the enemies behind the front line.",
    memory: "A place by the fire is filled. Mira’s arrows now answer Rook’s blade.",
  },
  {
    id: "cinder",
    system: "pets",
    name: "A spark in the reeds",
    character: "Cinder",
    chapter: DISCOVERY_CHAPTERS.cinder,
    reveal: 2,
    at: 9,
    clue: "Warm pawprints cross the wet stone. A little fox has been carrying a light of his own.",
    route: "In chapter 3 or later, follow the fox tracks after fight 9.",
    outcome:
      "Bring Cinder home to open pets. With Mira, his mark guides her next arrow for extra damage.",
    memory: "The little flame followed you home. Cinder and Mira can now hunt together.",
  },
] as const;

/** Read existing discoveries; the journal neither grants unlocks nor writes another save. */
export function journalDiscoveries(state: GameState) {
  return DISCOVERIES.filter(
    (discovery) =>
      state.meta.unlockedChapter >= discovery.reveal || systemUnlocked(state, discovery.system),
  ).map((discovery) => ({
    ...discovery,
    found: systemUnlocked(state, discovery.system),
    available: state.meta.unlockedChapter >= discovery.chapter,
  }));
}

export function discoveriesOnRoad(state: GameState, chapter: number) {
  return journalDiscoveries(state).filter(
    (discovery) => !discovery.found && discovery.chapter <= chapter,
  );
}
