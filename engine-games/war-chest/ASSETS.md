# Asset provenance

## The Last Crossing — October 3, 2026

The selected authored-story world in `scripts/crossing_world.gd` is procedural project artwork: elevated terrain, river, open gate, family procession, camp, cart and mission landmarks. It reuses the unchanged Banner & Steel character atlas below. No external or newly generated media, font files or runtime dependencies were added. The earlier scenery remains for legacy companies. Source drawing-record compositions are diagnostic reconstructions, not native captures or published-build proof.

## Landing screenshots — October 2, 2026

`site/images/battle-1440.png` and `site/images/chest-1440.png` are unchanged copies of the inspected, approved Banner & Steel native renderer captures at `/tmp/fleet-visual-20261002/war-chest/native/battle-1440.png` and `/tmp/fleet-visual-20261002/war-chest/native/chest-1440.png`. Both are 1440×900 PNGs from the e94dae4 visual audit; capture provenance and limitations are recorded in `/tmp/fleet-visual-20261002/war-chest/report.json`. Their reviewed SHA-256 digests are `ffd2d258227eb6e07ec87fc855f140d4ac1619d0f03aaf17288290b4bb3bd0fc` (battle) and `7f69677ac28486f6b6b936baa6ec5b2589c023381d713477a25381462cd9d3be` (chest); the landing validator checks these exact bytes. They replace the rejected Pocket Siege landing evidence for issue #3 without changing the landing design.

These are synthetic practice fixtures captured by the native Godot OpenGL renderer, not generated concepts, personal saves, or evidence of a published build. No new rendering or media generation was performed for this replacement. The scenery and company artwork use the generated Banner & Steel assets documented below; controls and equipment cells are native. Publication scope is exactly these two source-ready landing PNGs, this provenance entry, and their intrinsic image sizing in `site/index.html`. The game remains in native development with no public build claim; this local replacement does not qualify deployment or close issue #3. Retain/copy the PNG bytes with any future source publication; do not rely on generated/runtime media restoration.

## Current Banner & Steel — September 23, 2026

Owner chose refined A. `assets/banner-steel/lantern-gate.png` and `assets/banner-steel/company-atlas.png` were generated with the built-in image tool using that concept as the style reference. No game-ripped or external proprietary assets. Source outputs retained under `/Users/sarthak/.codex/generated_images/01a0c9fa-25af-79e3-9fb3-b6fe0f5edb22/`: `exec-64d76f77-85f4-4032-9070-25940941aac1.png` (scenery), `exec-e7a9fb36-67c4-4147-8868-dcf1944be84a.png` (atlas). Copied unchanged to the workspace; runtime atlas regions isolate twelve figures. Atlas alpha and crop bounds/content are checked headlessly; native composite still needs owner inspection.

The background has no baked UI or troops. Native Godot controls, target regions, health, intent, commands, hit effects and chest cells remain live. The earlier presentation used these two assets throughout; The Last Crossing now uses the procedural scenery above for authored-story scenes and preserves this background for legacy companies. Media is ignored by Git and must be backed up/copied separately; it is included in the local pack. Prompts: `assets/banner-steel-prompts.md`. No new runtime dependency or network behavior.

## Preserved Pocket Siege battle trial — September 23, 2026

`assets/pocket-v2/snow-bridges.png` and `assets/pocket-v2/company-atlas.png` were generated with the built-in image tool from the owner-selected Pocket Siege comp, not extracted from another game. Source outputs retained under `/Users/sarthak/.codex/generated_images/01a0c9fa-25af-79e3-9fb3-b6fe0f5edb22/`. The atlas has real transparency and is sampled into runtime regions; source images are unedited. The battle uses these images for scenery and its initial company; every control, health/intent label and action is native game state. Commands remain code-drawn. No additional runtime dependency.

Prompts: `assets/pocket-v2-prompts.md`. These local-only media files are ignored by Git and must be copied separately to another machine; fetch-assets.sh does not recreate them. This is not a finished animation set.

`assets/pocket-v2/support-atlas.png` adds Merrin, Talon, ballista, armored guard, archer and sapper. Generated output `exec-ebd89a5a-bf3e-4ceb-933e-500af99e4c5c.png` in the same source directory is copied without source editing; a 1536x1024 transparent sprite sheet. Pixel-alpha checks and rendered composites verify transparency. Native atlas regions supply each actor; no new dependency. The preceding draft `exec-5ec12971-33e3-4c0d-aa87-3d0ff44e4e28.png` is retained only as source history.

## Preserved Iron & Ember art experiment

The owner rejected the realistic art treatment. The following locally generated media is preserved, not approved as the final game style: `assets/siege/siege_backdrop.png`, `siege_units.png`, `siege_units_alpha.png`, `command_art.png`, and `support_units.png`. Generated with the built-in image tool; original outputs retained. Prompts are in `assets/siege-prompts.md`. The alpha character atlas is used by the unfinished native 2D experiment; support units were generated but are not integrated. These media files remain ignored by Git.

The runtime never downloads assets or calls online services. Media is ignored by Git per workspace policy. Run `sh scripts/fetch-assets.sh` to restore CC0 models/material; keep a separate backup of the generated portrait atlas.

| Asset | Source and license | Local use |
|---|---|---|
| Knight, Mage, Rogue Hooded, sword | Kay Lousberg, [KayKit Adventurers 1.0](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0), CC0. Commit 672074b73ba276876a19e8816ecdc5241817ab47 | Warband miniatures and weapon |
| Skeleton Warrior, Skeleton Rogue | Kay Lousberg, [KayKit Skeletons 1.0](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0), CC0. Commit 15b62b9bad122f72926c10fb14d622c73819fa54 | Enemy miniatures |
| Torch, barrel, crates, chest | Kay Lousberg, [KayKit Dungeon Remastered 1.0](https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0), CC0. Commit b0ca9bd96a8072ab36a3a5464f00ed1e06a16d07 | Battlefield props; chest downloaded but not used yet |
| Rock Face 03 diffuse, 1K | [Poly Haven](https://polyhaven.com/a/rock_face_03), [CC0 asset license](https://polyhaven.com/license) | Stone surface material |
| Company portrait atlas | Generated via built-in image generation; prompt in ART_PROMPTS.md. Original exec-fa155ad5-aece-4e67-8555-b9223b71ab06.png retained in Codex generated_images | Runtime AtlasTexture crops, no separate edited source images |
| Geometry, wolf/owl, water shader, icons, interface sounds | Authored for this project | Procedural runtime content |
| Georgia, Avenir Next | System fonts resolved locally; font files are not bundled | Fallback Times New Roman / Arial |

Copied license notices are retained in assets/licenses. No paid packs or game-ripped assets were used. Godot is MIT licensed; distribution requires the engine notice (see https://godotengine.org/license/). No distributable build has been released.
