import type { EnemyFighter, GameState } from "./model";

export type GearId = "sunfang";
export interface GearLedger {
  owned: GearId[];
  equipped: GearId | null;
}
export const SUNFANG = {
  id: "sunfang",
  name: "Sunfang",
  damage: 12,
  cleave: 0.35,
} as const;
const raider = {
  kind: "raider",
  name: "Briar raider",
  hp: 96,
  damage: 4,
  interval: 2.9,
  armor: 0,
  row: "front",
} as const;
const pair = { ...raider, hp: 120, damage: 5 } as const;
export const FIRST_LIGHT = [
  [raider],
  [raider],
  [pair, pair],
  [
    pair,
    {
      kind: "archer",
      name: "Briar archer",
      hp: 96,
      damage: 4,
      interval: 3.2,
      armor: 0,
      row: "back",
    },
  ],
  [
    {
      kind: "warden",
      name: "Briar Warden",
      hp: 300,
      damage: 7,
      interval: 3,
      armor: 0,
      row: "front",
    },
  ],
] as const;
export function isFirstLight(state: GameState): boolean {
  return state.run.context?.kind === "first-light";
}
export function equippedBlade(state: GameState): "ordinary" | GearId {
  return state.meta.gear?.equipped === "sunfang" && state.meta.gear.owned.includes("sunfang")
    ? "sunfang"
    : "ordinary";
}
export function weaponAppearance(state: GameState): "ordinary" | GearId {
  return state.meta.loadout.weapon === "sword" ? equippedBlade(state) : "ordinary";
}
export function firstLightEnemies(cleared: number): EnemyFighter[] {
  return (FIRST_LIGHT[cleared] ?? []).map((enemy, slot) => ({
    ...enemy,
    maxHp: enemy.hp,
    gold: 0,
    id: `enemy-${slot}`,
    slot,
    cooldown: 0.65 + slot * 0.2,
    pendingHit: null,
    braced: false,
  }));
}
