# Ember Road

An original local-first idle battle RPG for Web Playables. Lead Rook, a companion and a pet through five chapters, choose run-specific oaths, cast active skills against grouped front/rear foes, then strengthen permanent equipment at camp. Story missions, rotating daily quests and weekly goals track actual combat events and award gold once.

The owner supplied Epic Idle Journey as a genre reference and selected a cartoon idle-RPG visual reference on November 16 after rejecting the dashboard composition. The code, rules, characters, icons and artwork here are original; they are not recovered iOS code or verified parity with that game.

The chapter hub uses original cartoon dioramas and animated company sprites. Actual Fleet controls open collections, quests, stats and settings as modal overlays. See `DESIGN.md` for the selected direction.

`toon-knight.png` and `toon-enemies.png` are 4×2 walk/action and ready/attack sheets. `toon-party.png` is 4×4 with ready, anticipation, contact and recovery frames for Mira, Bram, Sable and the rear archer. `toon-pets.png` and `toon-walk.png` are 4×3 pet action and companion walking sheets. `toon-roads.png` is a 2×3 environment atlas; its first five cells match the five chapters. `toon-island.png` and `toon-islands.png` supply the chapter dioramas. All were made with the built-in image tool; sprite packing was visually checked and repaired for transparent gutters. Earlier painterly assets are retained as historical sources and are not runtime character/environment art.

`pnpm --filter @games/ember-road dev` runs the game; `typecheck`, `test`, `build` and `build:yt` use its existing toolchain. Game code and assets have no external runtime requests. Saves use gamekit Platform with a 64KiB envelope and v1/v2 migrations to v3; malformed/future saves remain untouched. Gold, upgrades, chapter unlocks and quests persist across runs; oaths reset. Optional Google accounts and cloud-save recovery are provided by the assembled web host, outside the network-free playable.
