// Visible foot baselines measured from the selected original PNGs at alpha >=128.
// Padding differs between poses; anchor the feet, not the rectangular cell edge.
const bottoms = {
  party: [
    [0.824841, 0.824841, 0.824841, 0.824841],
    [0.789137, 0.792332, 0.785942, 0.792332],
    [0.764331, 0.767516, 0.761146, 0.767516],
    [0.72524, 0.72524, 0.722045, 0.731629],
  ],
  pets: [
    [0.759669, 0.759669, 0.696133, 0.759669],
    [0.740331, 0.726519, 0.651934, 0.732044],
    [0.685083, 0.671271, 0.671271, 0.679558],
  ],
  walk: [
    [0.872928, 0.881215, 0.870166, 0.875691],
    [0.875691, 0.872928, 0.872928, 0.870166],
    [0.853591, 0.850829, 0.848066, 0.853591],
  ],
  enemies: [
    [0.788288, 0.788288, 0.788288, 0.788288],
    [0.702032, 0.704289, 0.704289, 0.704289],
  ],
  hero: [
    [0.907658, 0.90991, 0.907658, 0.907658],
    [0.900677, 0.889391, 0.896163, 0.907449],
  ],
} as const;
export function spriteBottom(sheet: keyof typeof bottoms, row: number, column: number): number {
  return bottoms[sheet][row]?.[column] ?? 1;
}
