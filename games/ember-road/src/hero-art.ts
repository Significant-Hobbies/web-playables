import { weaponAppearance } from "./first-light";
import type { GameState } from "./model";
export const HERO_ATLASES = {
  ordinary: new URL("../assets/toon-knight.png", import.meta.url).href,
  sunfang: new URL("../assets/toon-knight-sunfang-v1.webp", import.meta.url).href,
};
export function heroAtlas(state: GameState) {
  return HERO_ATLASES[weaponAppearance(state)];
}
export function sunfangEquipped(state: GameState) {
  return weaponAppearance(state) === "sunfang";
}
