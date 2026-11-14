# War Chest

A personal desktop story RPG: bring a valley's stolen winter wages home, command an enduring company, and fit equipment into a spatial war chest.

## Play locally

The owner selected **A — The Last Crossing** on October 3. Current source uses an elevated world with an open gate, visible family procession, exact threat arrows, companion-linked orders and a shared camp/chest. A new Gate deployment begins with two eight-health raiders on Rowan's front; the next wave introduces the other fronts. Existing active snapshots and legacy companies keep their stored rules. The twelve-encounter story and its save slots remain intact.

Newest isolated practice build (October 3 native playtest fixes): [Practice War Chest Playtest Fixes v2.app](<builds/Practice War Chest Playtest Fixes v2.app>). It adds readable Menu/quartermaster pages, visible lesson and target instructions, dashed legal-target frames, Ivo escorted beside Rowan, and clearer chest packing hints. Agents can drive a rendered practice session with `tests/native_playtest.gd` (see its header); it never touches player saves.

The earlier [Practice War Chest Last Crossing.app](<builds/Practice War Chest Last Crossing.app>) remains for comparison. Practice progress is temporary and does not read or write your saves or preferences. The self-contained folder is [War Chest Last Crossing 2026-10-03](<builds/War Chest Last Crossing 2026-10-03>); keep its files together. This is an unsigned local convenience build, not a notarized release.

Current source can also run in an isolated practice session with `sh scripts/play.sh -- --story-demo`. Companion selection is free; command previews execute a disposable copy of the actual rules. The campaign road names all twelve stops, recruitment explains Merrin's stored staff, and the first earned rune teaches the actual 8-to-10 damage payoff. All 19 source suites and 14 packaged suites passed; all 40 packed resources match the checked source. Current native visual inspection is blocked in the agent session. Earlier captures below do not qualify this overhaul or prove player enjoyment. See [.fleet/last-crossing-review-2026-10-03.md](.fleet/last-crossing-review-2026-10-03.md) for verification and remaining limits.

### Earlier native builds — October 2

Double-click `builds/Practice War Chest Onboarding v2.app` to play the earlier authored campaign without touching your saves or preferences. Practice progress is temporary. Use `builds/War Chest Onboarding v2.app` for persistent play: resume an existing company, or begin the separate story company. Both contain their October 2 runtime and game pack and can be moved to another writable local folder. These are unsigned local convenience apps, not notarized releases.

Both use the owner-selected **Company & Consequences** story presentation within Banner & Steel: visible companions, world scenes, short conversations, practical decisions and a finite three-chapter road. The updated lessons explain free portrait/number-key selection, Merrin's automatic arrival and stored staff, named company-level milestones and separate companion mastery. Project-root apps and earlier bundles are preserved; they contain older code. See [.fleet/story-onboarding-review-2026-10-02.md](.fleet/story-onboarding-review-2026-10-02.md) for current verification and [.fleet/story-mode-review-2026-10-02.md](.fleet/story-mode-review-2026-10-02.md) for the underlying story qualification.

Build another copy with `sh scripts/build-app.sh`; supply the input bundle and a fresh output app path, then `practice` for an isolated story build. The builder refuses to replace an existing app. `sh tests/test_app_launcher.sh` checks campaign/practice arguments, relocation and overwrite protection using a fake engine. Source-native story input, help return, the Gate victory, rune packing and its actual Ashen damage payoff were inspected on October 2. The persistent campaign wrapper receives preflight/integrity verification and is never launched by tests. Earlier bundles and the owner's existing session remain preserved.

The onboarding v2 practice app was native-launched on October 2 and left at the first battle with six orders untouched. Mouse/keyboard selection was inspected; the portrait/1–5 instruction remains visible even when a command card has focus. Its 17 source suites, 12 packaged suites and 45 native fixture captures passed then. This is historical evidence; first-time player comprehension still needs a human playtest.

The self-contained current bundle is at `builds/War Chest Onboarding v2 2026-10-02/`:

- Double-click `Play War Chest.command` to continue your saved campaign.
- Double-click `Practice War Chest.command` for a fresh, temporary story that never reads/writes your saves or settings.
- `Verify Local Game.command` checks integrity and runs twelve packaged suites: journey, journey UI, onboarding, motion, opening, opening startup, stability, current battle UI, story rules, earned story routes, story UI and story save slots. Logs stay in the bundle's `logs/` folder. Missing completion markers and engine errors fail verification even when the process exits successfully.

Keep the whole bundle together; it contains the existing Godot runtime, game pack, both Banner & Steel artwork images, engine notices and checksum manifest. It does not depend on the source checkout or Downloads path at runtime. Project-root Play/Practice launchers still prefer the older `builds/War Chest Local/` bundle; use the story paths above.

Rebuild with `sh scripts/build-local.sh builds/NewCandidate` to preserve existing bundles. The builder refuses to overwrite an existing output. It includes only the current game's explicit resource closure and fourteen isolated test scripts, never player data or previous art experiments. `sh tests/test_local_launcher.sh` tests launcher modes and failure paths without starting a game.

### Run from source instead

The existing bundled official Godot 4.7.2 runtime works on this machine. Scripts discover an explicit `GODOT_BIN`, the earlier Downloads location, the existing `builds/War Chest Local/` runtime, then `godot`/`godot4` on PATH. An invalid explicit override fails with a diagnostic instead of silently falling back.

```sh
cd /Users/sarthak/Desktop/fleet/war-chest
sh scripts/play.sh
```

Or open `project.godot` in Godot and press F5. On another machine, set `GODOT_BIN` to a Godot 4.7.x executable and separately copy `assets/banner-steel/` before importing the project. These required generated battle assets are local-only; fetch-assets.sh restores only the older prototype's external art.

Fresh authored-story practice (does not read or write player saves/settings): `sh scripts/play.sh -- --story-demo`.
Battle-only legacy practice: `sh scripts/play.sh -- --pocket-battle`.

## Story mode

Lysa's brother is missing among families outside Lantern Gate. Rowan signed the order that shut them out. Open the gate, find Ivo, follow the stolen winter wages and bring the chest home. Twelve encounters form three chapters: **The Gate We Opened**, **Names in the Ledger**, and **What We Keep**. [STORY.md](STORY.md) contains the complete authored arc.

Conversations lead to actual preparation and battles. Three choices alter the convoy, the frost marshal and Winterwatch, then return in the ending. Company levels advance after Gate, Convoy, Watchfires, Iron Oath and Winterwatch, adding 2 starting max HP to companions each time. The road names the next milestone. Other story victories still give gold and individual mastery; mastery ranks at 2/5/9 wins apply next battle. Merrin joins free after the Sunken Reliquary and deploys automatically next battle; his staff arrives in storage and must be packed for Storm. Fen stays with the company. Contracts and Talon open after the epilogue. No grinding is needed to complete either route.

Rescue, escort, watchfires and seal recovery require moving living companions. In the finale Rowan can collect the chest under fire or wait for cover; departure requires every foe defeated and a survived exit turn. Killing the captain alone cannot end the story. Defeat keeps your company and returns you to the same promise. The company road includes a journal and earned banner equipment.

Fresh persistent games begin in story mode. A saved original company gets **Begin story mode**, which creates a separate company; Menu can reopen the original. Story progress uses `winter-wages-story-v1.json`, preserving `iron-and-ember-v2.json`. A malformed slot is kept unchanged and never silently replaced.

## Controls

- All companions deploy. Click a bottom portrait or press **1–5** to select whose cards you command; switching spends no orders and cancels a selected card. With no card chosen, clicking a living hero also selects them.
- Choose a command card, then click a troop. **T** cycles legal targets; **F** confirms.
- **Space** ends the turn; **Z** undoes the last order within the current turn. Rewards and enemy turns cannot be undone.
- **Tab/Enter** navigates controls. **Esc** cancels a selection or returns from help. Menu opens the guide and sound/motion settings.
- In the war chest, select an owned item and click an empty anchor cell, or drag packed equipment. **WASD** moves its cursor, **R** rotates the selected placement shape, **F** places. Stored equipment gives no combat ability.
- Retreat requires a second click. Defeat preserves equipment, gold and experience.

### Interaction feedback

Attacks now lunge, arrows and spells travel to their targets, and damage follows impact. Cleave marks both victims; defeated troops fade before the formation closes up. Healing, shared shields, absorbed hits, stuns and incoming reinforcements have distinct cues. Rapid commands preserve movement continuity and moving targets keep their clickable regions.

Effects finish within 0.68 seconds. Enemy-turn results remain readable until the next hero/command selection. The final battlefield result stays briefly before rewards; Continue or Space skips this presentation without changing rewards. Undo and navigation cancel outstanding effects. Menu → reduced motion removes spatial effects and keeps a stationary result summary. Buttons have a short press response; victory illustrations reveal once on entering rewards.

### Legacy earned-rune opening

Genuinely new campaigns open directly into the Lantern Gate defense with sword, bow and shield already packed. Four optional contextual lessons teach attack, cross-front Volley, block and resolving the enemy turn. They advance on actual actions, respect Undo and can be skipped. First victory earns a storm rune instead of presenting the banner draft. The reward leads directly to the chest, highlights legal weapon-adjacent cells, and explains the real +2 command-damage benefit. Test this loadout opens battle two; the hint follows available linked attacks and recovers from fallen heroes or exhausted orders.

After battle two the legacy guided company opens up to side quests, contracts and banners. Explore without guidance exposes systems at their existing level/story requirements; rewards are not forfeited. The optional validated opening state survives saves. Existing campaigns are not enrolled, do not lose their starter rune or first banner, and keep their existing access. Story practice uses `--story-demo`; `--pocket-demo --banner-opening` preserves this earlier two-battle regression mode, and bare `--pocket-demo` remains the legacy isolated fixture.

Hints explain recovery if Lysa falls or her bow is stored. Mouse and keyboard target previews show damage after armor, Cleave's area, and stun's attack cancellation. At level one, contracts and the banner-management tab stay locked until level two; combat commands remain fully available.

Every level-up now explains how to use its unlocks: ready immediately, free in storage, earned-gold purchase, or recruitment followed by packing. Two focal effects are Cleave's paired impact strokes and a 0.65-second level seal. The seal never blocks reward selection and does not replay when inspecting rewards; reduced motion shows its finished state.

## Free exploration and legacy progression

Six main encounters plus six optional side quests, across three chapters and six company levels. Main first clears grant 70 XP; company levels need 70 XP each. Main replays award half gold and 35 XP, with enemy health scaling. Side quests grant 35 XP on their first clear only. Level 6 is the current content cap, not a promise of infinite new content.

| Level | Playable unlocks |
|---|---|
| 1 | Rowan, Lysa, Fen, sword/bow/shield; first victory earns the storm rune in new campaigns |
| 2 | Merrin recruitment and storm staff, permanent talent choice, side quests/contracts, forge +1 |
| 3 | Ballista kit, healing flask, forge +2 |
| 4 | Fen's Pin down, free Frostfang relic |
| 5 | Rowan's Rally, Winterwatch defense, masterwork forge +3 |
| 6 | Talon the owl with ranged disruption, Hollow Crown finale, veteran replays |

Equipment supplies deterministic ability cards rather than a shuffled hand. Baseline movement, strike and guard remain available. The rune boosts edge-adjacent weapons. A packed ballista kit adds a player-controlled ballista in every battle. The current prototype shares one battlefield layout with different enemy compositions; distinct authored maps are still needed.

### Side quests and loadout choices

Keep → Side quests opens after the first campaign victory. These are optional missions with actual objectives, not kill-count checklists:

| Quest | Opens after | Objective and unique reward |
|---|---|---|
| The Missing Scout | Main battle 1 | Rowan reaches front 3, then returns to front 1 alive; Scout's pennant |
| The Last Supply Cart | Scout + main battle 1 | Escort Rowan through fronts 1 → 2 → 3 → 1; contract tier II |
| The Sunken Reliquary | Main battle 2 | Shield a surviving hero on front 3 for three turns; Dawn aegis |
| Light the Watchfires | Reliquary + main battle 3 | Reposition survivors into all three fronts; contract tier III |
| The Iron Oath | Main battle 4 | Defeat a patrol under rotating bombardments; Watcher's lens + tier IV |
| Break the Siege Engine | Iron Oath + main battle 6 | Defeat escorts to remove the commander's protection; tier V |

Each quest has a turn deadline and awards gold, mastery and a banner on victory. Replays pay half base gold with no repeated unique item or XP. Missing a convoy escort stage costs 5 gate health. Losing Rowan fails rescue/escort. Defeat preserves the company and explains what went wrong.

Three unique six-cell relics must be packed to work: pennant makes the company's first move each turn free; aegis adds 4 block to Guard; lens adds 3 ranged damage when the shooter's own front is clear. They cannot be bought or forged. Eleven items occupy 43 cells in total, but the chest holds 30: builds now compete for room.

Main battles 3–6 and the last two quests show the next bombardment's front and damage. It lands before enemy attacks and consumes block first. Move or protect threatened heroes, or build around passive defenses. Old in-progress battles are not changed retroactively.

### War contracts and banners

At level 2, choose Supply Raid (ranged hunters), Powder & Steel (gate-attacking sappers), or Ironclad Patrol (armored guards and an enraging captain). Five difficulty tiers unlock at 0/6/12/18/24 renown, or through the corresponding side-quest milestones above. Contracts award earned gold, 35 XP up to the company cap, tier-scaled renown and a banner choice. They do not skip campaign encounters. Formations rotate with completed contracts; there are no daily locks.

Victories offer three persistent banner upgrades, except the new opening's first victory, which teaches the earned rune. Collect six banners, raise them to rank III, and equip one at the keep: melee damage, ranged damage, start-of-turn block, healing, disruption damage, or extra gold. A mastered duplicate pays 40 gold. Pending choices are saved and cannot be claimed twice. Bonuses require their matching commands; banners do not grant equipment or recruit heroes.

Armored guards reduce each hit by two (minimum one damage). Archers target the weakest living ally across fronts. Sappers bypass troops to attack the gate. Captains gain two attack at half health. Inspect a troop to read its rule and current intent.

### Hero mastery and optional objectives

Each deployed hero earns one mastery win when the company wins, even if that hero fell. Ranks I/II/III unlock at 2/5/9 wins. New ranks apply next battle; defeats do not erase progress. Fen and Talon share companion mastery, and ballistas do not gain mastery. Select mastery badges at the keep or rank-up buttons after victory to inspect benefits:

| Hero | Rank I / II / III benefit |
|---|---|
| Rowan | Guard gives other living allies on his front 2 / 4 / 6 block |
| Lysa | Volley deals 2 / 4 / 6 extra damage to an already-stunned foe |
| Fen / Talon | Strike restores 2 / 4 / 6 of the companion's own health |
| Merrin | Heal also grants its target 2 / 4 / 6 block |

New battles have an optional bonus-gold objective: protect the gate, keep all heroes standing, finish an assault by turn five, move three different heroes, or stun three different surviving foes. The campaign assigns objectives; contracts rotate them deterministically. Objectives pay only on victory, once, with no penalty for missing them. Move/stun counters and impossible-goal feedback are visible during play. Keyboard target previews include armor and Lysa's conditional mastery damage.

Old active saves keep their original battle rules. Mastery starts counting with new battles after this upgrade; no historical hero participation is invented.

## Saves

Auto-saves after meaningful actions. macOS storage: `~/Library/Application Support/Godot/app_userdata/War Chest/`. Story uses `winter-wages-story-v1.json`; the original company keeps `iron-and-ember-v2.json`. The earlier campaign-v1.json is preserved separately. No account, cloud sync, analytics, purchases, or runtime network traffic. Malformed saves are preserved and saving is disabled for that company with a visible recovery message. A healthy separate company remains accessible. Move a copy of a broken save aside before relaunching; never delete it as an automated fix.

`-- --pocket-demo` starts an isolated practice campaign; `-- --pocket-battle` opens its first battle directly. Neither reads or writes player saves/settings. The old scene's test-mode flags do not apply to Pocket Siege.

## Verification

```sh
sh scripts/check.sh
```

Source verification covers import, seventeen game suites and isolated runner/local/app launcher checks with official Godot 4.7.2. Coverage includes two complete earned story routes with exact save/restore replay, all three decisions, physical extraction, malformed-save retention, actual story UI callbacks and 40 battle/navigation cleanup cycles. Story rule/UI/save-slot suites contain 263/305/32 checks. The expanded UI checks exercise free switching, free Merrin arrival, packed commands and real level unlocks. Native input previously verified the opening conversation, Gate victory, rune packing and two actual 10-HP Ashen kills with the rune's 10-damage Cleave. The current onboarding pass adds 45 native fixtures across 1152×720, 1440×900 and 1600×1000. A legal-action solver proving winnability does not prove enjoyment or human difficulty balance; rendered teaching does not establish first-time player comprehension.

## Structure

- `scripts/siege_game.gd`: three-front combat, inheriting inventory/progression/persistence from game.gd.
- `scripts/pocket_campaign.gd`: contracts, renown, banners, enemy roles and backward-compatible save extensions.
- `scripts/hero_campaign.gd`: hero mastery snapshots, command synergies and optional battle objectives.
- `scripts/journey_game.gd`: legacy quests, milestone gates, packed relics and telegraphed hazards.
- `scripts/story_data.gd`, `story_game.gd`: authored scenes, decisions, paced campaign and save/objective rules.
- `scripts/pocket_story.gd`: selected native Company & Consequences story presentation.
- `scripts/pocket_main.gd`: current full-window game UI.
- `scripts/pocket_field.gd`, `pocket_art.gd`: battle presentation and art.
- `scripts/pocket_chest.gd`: shaped equipment packing view.
- `tests/`: isolated model checks and campaign regression.
- `ASSETS.md`, `ART_PROMPTS.md`: provenance and generated-art recipe.

Active scope and verification: https://github.com/Significant-Hobbies/war-chest/issues/1

## Current boundaries

Local playable story with reviewed rules, controls and packaging. The independent story presentation review records 36/40 critique and 16/20 audit, with concrete deductions. Owner acceptance, human attachment, long-term balance/enjoyment, a full manual story route, VoiceOver traversal and story performance remain unverified. Earlier battle timing averaged 20.37 ms per frame with 34.76 ms p95 on this host; the story work does not establish a performance improvement or smooth 60 fps. No exported/notarized release, distinct battle maps or soundtrack. The shared visual checker still requires unsupported 390/768 mobile widths; native applicability is recorded in the story review. No commit, push or release was made.
