---
name: Banner & Steel
description: A company worth commanding. Flat illustrated turn-based warfare.
colors:
  paper: "#f4ebd8"
  navy: "#203340"
  blue: "#405947"
  sky: "#dfd4bb"
  coral: "#9d4133"
  gold: "#dbac51"
  muted: "#596050"
---
# Design System: War Chest

## Current direction — The Last Crossing, October 3

Platform: native-macos
Supported minimum width: 1152

Owner explicitly selected A — The Last Crossing after rejecting the preceding playable experience. Selection: `.fleet/game-experience-owner-selection-2026-10-03.md`; current receipt: `.fleet/design-review-game-experience-2026-10-03.json`. The older Banner & Steel and Company & Consequences descriptions below are implementation history, superseded where they conflict with this direction.

The world owns the window. An elevated crossing places the defended gate, visible civilian road, raiders and company in one coherent scene. Sparse corner HUDs state objective, four enemy phases and gate health. Selecting a companion brings compact contextual orders beside the actor. Threat arrows and model-derived previews explain whom an enemy will hit and what the selected command will change. Shared orders and enemy-turn controls remain visible; selection never spends an order.

Deep river/forest surfaces (#102a30, #294743), warm stone, paper narrative (#efe8d6), gold useful actions (#e9b85f), rust incoming threats (#c15b49), and muted olive (#739489) define the selected roles. Georgia gives story/mission identity; Avenir Next carries controls and rules; Menlo is limited to small metadata. Body text remains18–20px on the1440x900 logical canvas. Reduce administrative panels, not necessary rules or target information.

Camp stays in the same world and brings the physical6x5 chest to the company. Rescue progress derives from actual resolved enemy phases, not an invented independently tracked civilian count. Rewards show the kept promise, earned company level and tangible equipment payoff. The first Storm rune empowers a touching weapon by2 command damage; Cleave8 becomes10. Story recruitment and later level unlocks are introduced at their actual authored milestones.

The deployed teaser at site/index.html and native game are paired surfaces. Both use this identity and the authored company/stolen-wages vocabulary. The teaser must accurately state local prototype/in-development status; no public game download or storefront exists. Preview-to-first-value means a truthful view of the native opening, local practice launch, companion order, enemy resolution and camp/rune payoff.

Review target: native Godot practice window. Logical canvas1440x900, minimum window1152x720, aspect-preserving. Qualifying capture uses actual Godot viewport/window screenshots with measured logical window size, image dimensions and display scale; static proposals and scaled images do not qualify. Current session denied native windows and Chromium bootstrap access. Fresh rendered acceptance remains unknown until real inspection succeeds. Preserve reduced motion, exact hit regions, keyboard controls and save compatibility.

## Overview
**Creative North Star: "Banner & Steel"**
Owner explicitly selected refined A on September 23 after rejecting the childish Pocket Siege presentation. Approved reference: `artifacts/onboarding-directions/a-banner-steel.png`. Mature, simple flat illustration with adult-proportioned troops, an olive company standard and warm stone terrain. Preserve every tactical rule and saved campaign. The previous system is archived at `.fleet/pocket-siege-design-history.md`.

## Colors
Warm paper controls over limestone scenery; ink text, olive company identity, brick hostile intent, ochre orders and selection. Pair every status color with text or an outline. No pastel blue expanses or candy accents.

## Typography
Georgia titles with Times New Roman fallback; Avenir Next/Arial for rules and controls. 18–20 px body, 28–44 px titles on a 1440x900 canvas. Compact serif identity without engraved ornament; no rounded display faces.

## Layout
Full-window world. Three vertical approaches with troops facing opposing formations, objective/turn above, native equipment commands on a paper rail below. One inspection area explains selected commands and targets. Keep/chest/reward use quiet paper surfaces over the same world. New story companies open with a short named conversation, then preparation and the actual first defense. Earned-rune packing is the first equipment decision. Supported desktop canvas 1152x720 or larger, aspect-preserving; mobile unsupported.

## Elevation & Depth
Flat illustrative layers with restrained two-tone shading, olive woodland and broad warm-stone bridges. No photographic texture, ornate metal frames or realistic rendering. Borders distinguish playable commands. Existing short hit/reposition feedback and one-shot reward seal respect reduced motion.

## Shapes
Adult-proportioned illustrated troops, lean wolf, broad castle planes, squared low-chrome controls with 4px corners. Scenery and the company use generated raster assets; command symbols, stats, instructions, fronts, selection and all controls remain native and live. Never bake interface or troops into the background.

## Components
Native Buttons expose text, focus, hover and disabled state. Target actors use focusable controls as well as mouse hit regions. Exact health and intent remain inspectable. Equipment cells show footprint, valid placement and rune linkage. Purchases state earned-gold costs.

## Do's and Don'ts
- Keep scenery quieter than characters and decisions.
- Use the same simple art throughout the game, including rewards and inventory.
- Show rules in context; never remove necessary information for minimalism.
- Preserve progress and saves, including on defeat.
- Do not reintroduce realistic illustrations, chibi proportions, dense floating labels or ornate fantasy chrome.
- Do not describe a generated concept as the working game.

## October 2 quality qualification — preserve lane

Preserve the selected illustration, world composition, typography and command rail. Fix concrete interaction defects: manual return loops, lost focus after a command/target disappears, obscured Move choices and overwritten error feedback. Tactical controls carry health/rule descriptions; this does not certify VoiceOver traversal. Enemy health/intent labels are slightly larger, all prices name gold, and enemy-turn outcomes remain visible until the next decision. Save failures use a compact battle footer below every command and Undo; Menu retains the complete recovery message.

Independent native fixture review covers battle, earned rune, equipment, quests, banners, shop, manual, later enemies and mastery rewards at the supported minimum. Actual full native windows preserve the 1440x900 canvas with side bars at 1600x900 and top/bottom bars at 1152x900; mouse targeting and T/F work after resizing to 1152x720. The earned two-battle loop was played using native input. Critique 33/40 (Good), desktop audit 16/20; these are review evidence, not owner acceptance or a claim of commercial polish. VoiceOver, long-term fun and frame pacing remain open. Details and the shared checker's unsupported mobile-width requirement are in `.fleet/quality-review-2026-10-02.md`.

## October 2 story mode — Company & Consequences

Owner selected A after three native systems, each showing a canonical Ivo conversation and its next preparation context at 1440x900 and 1152x720. Separate v2 receipt: `.fleet/design-review-story-mode.json`; selection evidence: `.fleet/story-mode-owner-selection.md`. Implementation preflight passed before production UI integration.

World-scale companions stand around a centered paper speech inset. Their names distinguish the staged company from a textual speaker such as Ivo, who has no atlas portrait. The lower rail contains the current promise or remembered result and one continuation action; decision scenes show both actual consequences before commitment with equal unselected treatment. Georgia speech and chapter headings keep the human story above administrative metadata. A three-chapter road shows all twelve encounters, current preparation, earned banner equipment and the company journal. Dialogue and decisions persist; Menu returns to the exact line. No skip control chooses a branch silently.

After victory, show the kept promise and companion's account before the rewards. Company gold is separate from the households' sealed wages. Defeat explains the failed objective and offers another preparation attempt without erasing progress. Compact save-error footers stay below every choice; full recovery details live in the manual. Button focus keeps readable ink on paper, and removing a claimed banner transfers focus to the enabled story continuation.

The historical Company & Consequences receipt declared a standalone native game. The October 3 audit found the deployed teaser and supersedes that declaration with the paired-surface contract above. There is no storefront. The local launch, opening conversation, preparation and first tactical payoff form onboarding; native and paired browser evidence require their respective current renders. Existing atlas artwork is reused. Direction acceptance remains separate from acceptance of the finished game.

### Companion and level teaching — copy-only preservation

Keep the existing four field lessons and all rectangles. Explain bottom-portrait/number-key selection at the first actionable order; switching is free and all companions deploy. Adapt the ranged instruction to Lysa's actual selection. Existing portraits/inspection carry names, roles and keys. Story rewards disclose each level's real automatic effect or purchase/packing step; Merrin's archive arrival explicitly requires packing his staff for Storm. The road's subtitle names the next canonical company-level milestone. The manual separates company progression from 2/5/9-win individual mastery and uses the current company's story or legacy recruitment rules. No new tutorial state, modal, forced action or visual system.

## Historical implementation notes — superseded visual system

The sections below describe earlier Pocket Siege increments. Their gameplay/motion invariants remain useful; their palette, composition and shape descriptions are historical, not the approved Banner & Steel contract above.

### September 23 gameplay expansion — preserve lane
Extend the existing keep with Campaign / War contracts / Banners selectors, and the reward screen with three concrete upgrade choices. Keep palette, typography, positions and native controls. Illustrated company sprites now also appear on keep/reward/shop; a matching transparent atlas adds Merrin, Talon, ballista, armored guards, archers and sappers. Traits and banner effects remain readable text, not sprite-only information. This bounded expansion does not imply final owner acceptance of the whole visual system.

The mastery upgrade preserves this system: native two-line mastery buttons below keep heroes, inspectable rank-up buttons in unused reward space, and one optional-objective text strip above the fronts. Effects use the existing feedback footer and command inspection, not a new menu. Boss health uses a star and gold fill instead of a colliding overhead label. New rank effects apply next battle and are described at the point of reward. Supported evidence is native desktop, not mobile/browser certification.

## Interaction motion — preserve lane

Command-to-impact is the focal moment. Use short lunges, slashes, arrow/spell trails and outcome-specific pulses; no idle loops, camera shake or delayed rules. A copied presentation timeline expires within 0.68s. Projectile aftermath begins after arrival; defeated silhouettes fade before slot compression. Native hit regions follow interpolated positions and replacement timelines begin from the current rendered position. Shoulder labels avoid the preceding front's health badge. Enemy feedback excludes attacks skipped after a fixed target dies and explicitly reports absorbed block.

The final battlefield result has a skippable 0.57s presentation hold; rewards are already committed. Native button response lasts 0.14s and reward illustrations reveal once over 0.32s. Undo, navigation and reduced motion cancel unfinished effects. Reduced motion uses stationary outcome text instead of spatial effects. No palette, layout, gameplay rule, save-schema or asset changes in this increment. October 2 native checks verify the current aspect-preserving behavior at wide and tall supported desktop sizes.

## First-session guidance — preserve lane

Teach through actual orders, not a modal tour. Four optional field lessons reuse the objective strip and inspection footer, temporarily replacing the optional-objective display without removing its reward. Successful attack, cross-front Volley, block and enemy-turn resolution teach the core decisions; actions are never forced or restricted. Guidance must recover from changed equipment, fallen heroes and exhausted orders. Skipping remains visible; completion and undo track actual campaign actions. Existing saves are not enrolled retroactively.

Keep existing cards, scenery and reward hierarchy. Starter preparation copy reflects actual packed gear. Contracts/banner management are labelled level-two unlocks. Reward text separates immediate skills from things that need buying/recruiting/packing. Focal animations: paired Cleave strokes with a short impact burst, and a bounded 0.65s gold level seal. Neither delays rules or hides actionable controls. No new assets or dependencies. Native visual requalification is pending; headless layout and logic checks do not certify appearance or feel.

## Side-story journey — preserve lane

Reuse the keep's selector panel for six optional quests, with chapter, prerequisite, progress and concrete rewards. Level-two guidance announces the new route. The battlefield's existing objective strip states the next destination or survival condition; coral front shading is paired with exact bombardment text. Quest losses explain timeout, escort death, gate loss or voluntary withdrawal. Contract tier tooltips name the alternate quest milestone.

Quest rewards occupy the existing blank upper-left reward area; mastery buttons and bonus-gold notices remain independent. Owned equipment uses two columns inside the existing chest panel so all eleven items remain accessible. Relics reuse native command glyphs. No new art, dependency or visual identity. The original journey pass had headless geometry evidence and an application-initialization blocker. October 2 native reviews supersede that blocker; see the quality and story reports for current rendered evidence.
