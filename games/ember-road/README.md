# Ember Road

An original, local-first idle battle game made for Web Playables. A knight advances through five short chapters, fights automatically, chooses run-specific oaths, and spends earned gold on persistent equipment.

The reference requested by the owner was **Epic Idle Journey: RPG Battle** by Freeplay. Public iOS store screenshots establish a single hero facing a line of enemies, a visible stat panel, perk icons and a forge/equipment screen. Public gameplay video acquisition was unavailable in this session. This implementation reconstructs that visible genre loop with original code, characters and artwork. Its enemy rules, timing, perks, economy and balance are authored here; they are not recovered iOS code or verified parity with the original game.

All character sheets and the Cinder March landscape were generated for this game on 2026-11-14. `hero-knight.png` contains four walking frames and four attack poses. `enemies.png` contains idle/attack poses for four original enemies. The Canvas renderer adds anticipation, lunges, impact arcs, recoil, deaths, particles, a scrolling road and reduced-motion behavior. No assets from the reference game are bundled.

`pnpm --filter @games/ember-road dev` runs the game. `typecheck`, `test`, `build` and `build:yt` use the same toolchain as the other certified-lane games. The source has no runtime network calls. Saves use the gamekit Platform and save manager; malformed or future saves remain untouched while a temporary game runs. Gold and forged gear survive defeat. Oaths reset on a new journey.

### Chapter environment artwork

The November 15 desktop story pass adds original built-in-image-tool paintings for Lantern Ruins, Hollow Marsh, Frostbound Keep and The Last Threshold. The existing Cinder March painting was used only as a style reference. They contain no characters, UI, text or ripped game assets. The 1672×941 PNGs are retained unchanged under `assets/`; runtime framing aligns each walkway with the live character floor. Original outputs are in `/Users/sarthak/.codex/generated_images/01a1db5b-24d2-71b3-a43a-3f57125ebc85/`. Gameplay, moving characters, weather, lights, equipment wards and interface remain runtime content. Backgrounds load per chapter; the game never fetches external media.

`mira.png` is an original transparent 1024×1536 portrait generated with the built-in image tool on November 15 for the camp letters. It is retained unchanged from `/Users/sarthak/.codex/generated_images/01a1d9d3-301d-72a2-8f93-f20e6f692a12/exec-f484bdbd-9c3b-4a16-8507-656f18697edd.png`. Mira and her story are fictional; the portrait is hidden in the forge and at compact sizes.

### Cartoon game direction

The owner’s November 16 reference replaces the dashboard composition with a central chapter diorama, original cartoon company, icon dock and modal collections. Fleet controls retain their behavior under the game skin; the combat, quest and save rules remain the same. `DESIGN.md` records the selected direction. `toon-*.png` are original built-in-image-tool assets: knight/enemy two-row action sheets, four-row companion actions, three-row pets/walking sheets, six-panel road atlas (five used), and chapter dioramas. The earlier artwork is retained as source history; it is no longer the runtime character style.
