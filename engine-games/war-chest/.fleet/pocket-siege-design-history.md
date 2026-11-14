---
name: Pocket Siege
description: A tiny company, a big adventure. Flat cartoon turn-based warfare.
colors:
  paper: "#fffcf5"
  navy: "#163a60"
  blue: "#367dde"
  sky: "#d9edfa"
  coral: "#ff6a64"
  gold: "#ffc750"
  muted: "#526e89"
---
# Design System: War Chest

## Overview
**Creative North Star: "Pocket Siege"**
Owner explicitly selected cartoon option B. On September 23 the owner rejected the crude geometric execution, then agreed to retry B with illustrated characters, proper terrain, larger equipment cards and fewer controls. This pass is limited to the battle screen for owner review; it is not approval of the whole game.

## Colors
Off-white sky and controls; pale-blue terrain; navy troops and text; blue selections/actions; coral enemy identity; gold command currency. Hue never carries state alone.

## Typography
Rounded system sans (Arial Rounded MT Bold for headings; Avenir Next for rules). 18–20 px body, 28–44 px headings on a 1440x900 canvas. No serif/engraved lettering.

## Layout
Full-window world. Three broad fronts fill the center, objective/turn above, compact command tiles below. One inspection area explains selected commands and targets. Keep, chest and recruitment remain full-screen scenes with one primary action. Supported desktop canvas 1152x720 or larger, aspect-preserving; mobile unsupported.

## Elevation & Depth
Simple illustrated layers with restrained two-tone shading, snowy banks and readable bridge arches. No photographic texture, ornate metal frames or realistic rendering. Small offset card shadows separate playable equipment from snow. Short purposeful hit/reposition feedback respects reduced motion.

## Shapes
Expressive illustrated troops, clean castle silhouettes, round command markers and equipment cards. Battle scenery and the initial company use generated raster assets; command symbols and all controls remain native and live. Other screens retain the previous treatment until the battle direction is accepted.

## Components
Native Buttons expose text, focus, hover and disabled state. Target actors use focusable controls as well as mouse hit regions. Exact health and intent remain inspectable. Equipment cells show footprint, valid placement and rune linkage. Purchases state earned-gold costs.

## Do's and Don'ts
- Keep scenery quieter than characters and decisions.
- Use the same simple art throughout the game, including rewards and inventory.
- Show rules in context; never remove necessary information for minimalism.
- Preserve progress and saves, including on defeat.
- Do not reintroduce realistic illustrations, dense floating labels or ornate fantasy chrome.
- Do not describe a generated concept as the working game.

## September 23 gameplay expansion — preserve lane
Extend the existing keep with Campaign / War contracts / Banners selectors, and the reward screen with three concrete upgrade choices. Keep palette, typography, positions and native controls. Illustrated company sprites now also appear on keep/reward/shop; a matching transparent atlas adds Merrin, Talon, ballista, armored guards, archers and sappers. Traits and banner effects remain readable text, not sprite-only information. This bounded expansion does not imply final owner acceptance of the whole visual system.

The mastery upgrade preserves this system: native two-line mastery buttons below keep heroes, inspectable rank-up buttons in unused reward space, and one optional-objective text strip above the fronts. Effects use the existing feedback footer and command inspection, not a new menu. Boss health uses a star and gold fill instead of a colliding overhead label. New rank effects apply next battle and are described at the point of reward. Supported evidence is native desktop, not mobile/browser certification.

## Interaction motion — preserve lane

Command-to-impact is the focal moment. Use short lunges, slashes, arrow/spell trails and outcome-specific pulses; no idle loops, camera shake or delayed rules. A copied presentation timeline expires within 0.68s. Projectile aftermath begins after arrival; defeated silhouettes fade before slot compression. Native hit regions follow interpolated positions and replacement timelines begin from the current rendered position. Shoulder labels avoid the preceding front's health badge. Enemy feedback excludes attacks skipped after a fixed target dies and explicitly reports absorbed block.

The final battlefield result has a skippable 0.57s presentation hold; rewards are already committed. Native button response lasts 0.14s and reward illustrations reveal once over 0.32s. Undo, navigation and reduced motion cancel unfinished effects. Reduced motion uses stationary outcome text instead of spatial effects. No palette, layout, gameplay rule, save-schema or asset changes in this increment. Existing non-16:10 stretch behavior still needs a separate adaptation pass; it does not yet meet the aspect-preserving intent above.

## First-session guidance — preserve lane

Teach through actual orders, not a modal tour. Four optional field lessons reuse the objective strip and inspection footer, temporarily replacing the optional-objective display without removing its reward. Successful attack, cross-front Volley, block and enemy-turn resolution teach the core decisions; actions are never forced or restricted. Guidance must recover from changed equipment, fallen heroes and exhausted orders. Skipping remains visible; completion and undo track actual campaign actions. Existing saves are not enrolled retroactively.

Keep existing cards, scenery and reward hierarchy. Starter preparation copy reflects actual packed gear. Contracts/banner management are labelled level-two unlocks. Reward text separates immediate skills from things that need buying/recruiting/packing. Focal animations: paired Cleave strokes with a short impact burst, and a bounded 0.65s gold level seal. Neither delays rules or hides actionable controls. No new assets or dependencies. Native visual requalification is pending; headless layout and logic checks do not certify appearance or feel.

## Side-story journey — preserve lane

Reuse the keep's selector panel for six optional quests, with chapter, prerequisite, progress and concrete rewards. Level-two guidance announces the new route. The battlefield's existing objective strip states the next destination or survival condition; coral front shading is paired with exact bombardment text. Quest losses explain timeout, escort death, gate loss or voluntary withdrawal. Contract tier tooltips name the alternate quest milestone.

Quest rewards occupy the existing blank upper-left reward area; mastery buttons and bonus-gold notices remain independent. Owned equipment uses two columns inside the existing chest panel so all eleven items remain accessible. Relics reuse native command glyphs. No new art, dependency or visual identity. Headless geometry checks cover descriptions, reward copy and equipment controls; fresh native visual evidence is still blocked by the host's application-initialization failure.
