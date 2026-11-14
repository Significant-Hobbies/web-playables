# Ember Road

An original, local-first idle battle game made for Web Playables. A knight advances through five short chapters, fights automatically, chooses run-specific oaths, and spends earned gold on persistent equipment.

The reference requested by the owner was **Epic Idle Journey: RPG Battle** by Freeplay. Public iOS store screenshots establish a single hero facing a line of enemies, a visible stat panel, perk icons and a forge/equipment screen. Public gameplay video acquisition was unavailable in this session. This implementation reconstructs that visible genre loop with original code, characters and artwork. Its enemy rules, timing, perks, economy and balance are authored here; they are not recovered iOS code or verified parity with the original game.

All character sheets and the Cinder March landscape were generated for this game on 2026-11-14. `hero-knight.png` contains four walking frames and four attack poses. `enemies.png` contains idle/attack poses for four original enemies. The Canvas renderer adds anticipation, lunges, impact arcs, recoil, deaths, particles, a scrolling road and reduced-motion behavior. No assets from the reference game are bundled.

`pnpm --filter @games/ember-road dev` runs the game. `typecheck`, `test`, `build` and `build:yt` use the same toolchain as the other certified-lane games. The source has no runtime network calls. Saves use the gamekit Platform and save manager; malformed or future saves remain untouched while a temporary game runs. Gold and forged gear survive defeat. Oaths reset on a new journey.
