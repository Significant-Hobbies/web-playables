import type { EnemyFighter, EnemyKind, GameState } from "./model";

export interface EmberMarchContext {
  kind: "ember-march";
  rules: "march-v1";
  runId: number;
  returnChapter: number;
  nextSpawn: number;
  spawnRemaining: number;
  kills: number;
  earnedGold: number;
  gift: "pending" | "taken";
  offerSerial: number;
}
export const EMBER_MARCH = Object.freeze({
  total: 54,
  spawnInterval: 1.8,
  giftAt: 20,
  clearGold: 12,
  firstClearGold: 24,
  levels: Object.freeze([6, 11, 16, 21, 26, 31, 36, 41, 46, 51]),
});
export function isEmberMarch(state: GameState): boolean {
  return state.run.context?.kind === "ember-march";
}
const schedule = Object.freeze(
  Array.from({ length: EMBER_MARCH.total }, (_, index) => {
    const kind: EnemyKind =
      index === 53
        ? "warden"
        : index < 3 || index % 4 < 2
          ? "raider"
          : index % 4 === 2
            ? "archer"
            : index % 8 === 3
              ? "sentinel"
              : "hexer";
    return Object.freeze({
      kind,
      name: {
        raider: "Road raider",
        archer: "Ashbow scout",
        sentinel: "Iron roadguard",
        hexer: "Ember caller",
        warden: "The March Warden",
      }[kind],
      row: kind === "archer" || kind === "hexer" ? ("back" as const) : ("front" as const),
      maxHp: index === 53 ? 180 : Math.round(42 + index * 1.1),
      damage: index === 53 ? 9 : 2 + Math.floor(index / 18),
      interval: index === 53 ? 3 : 3.4,
      armor: kind === "sentinel" ? 2 : 0,
      gold: 1,
    });
  }),
);
export function marchEnemy(index: number, slot: number): EnemyFighter {
  const template = schedule[index];
  if (!template) throw new Error("Unknown March spawn.");
  return {
    ...template,
    id: `enemy-${index}`,
    slot,
    hp: template.maxHp,
    cooldown: 1.2,
    pendingHit: null,
    braced: false,
  };
}
export function marchRow(index: number) {
  return schedule[index]?.row;
}
export function validMarchTemplate(enemy: EnemyFighter, nextSpawn: number): boolean {
  if (typeof enemy.id !== "string") return false;
  const index = Number(enemy.id.slice(6));
  const template = schedule[index];
  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index < nextSpawn &&
    enemy.id === `enemy-${index}` &&
    !!template &&
    ["kind", "name", "row", "maxHp", "damage", "interval", "armor", "gold"].every(
      (key) => enemy[key as keyof EnemyFighter] === template[key as keyof typeof template],
    ) &&
    Number.isInteger(enemy.slot) &&
    (enemy.row === "front" ? [0, 1] : [2, 3]).includes(enemy.slot)
  );
}
