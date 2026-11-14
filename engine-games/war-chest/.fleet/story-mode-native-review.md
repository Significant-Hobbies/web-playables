# Story mode native review — 2026-10-02

Reviewer: `presentation_review`, reviewing the root agent's production interface. Selected direction: **A — Company & Consequences**, explicitly selected by the owner. This review records rendered craft and tested behavior; it does not record owner acceptance of the finished game, prove enjoyment, or certify commercial quality.

## Result

The production story surface carries the selected direction across speech, preparation, aftermath, defeat, spatial rune preparation and homecoming. Named people and their immediate need precede the practical order. The company remains visible; the finite road, chest and canonical choice consequences explain what happens next. **No unresolved P0/P1 defect was found in the final reviewed states.**

Critique: **36/40**. Native audit: **16/20**. These are rubric judgments with the deductions below, not probabilities of quality. No full marks for unmeasured performance, unverified assistive technology or an unplayed complete physical-input campaign.

## Rendered evidence

`tests/capture_story.gd` renders actual `pocket_main.gd` states under `--pocket-demo --story-ui-fixtures`, muted and with reduced motion. Nine states at 1440×900 and 1152×720 produce **18 native PNGs**. Injected completed-route milestones and settlement are explicitly UI fixtures, never earned-play proof. The campaign schema is validated before the late choice and ending captures. No player save is read or written by the fixture harness.

| State | 1440×900 | 1152×720 | Direct observation |
| --- | --- | --- | --- |
| Opening speech | [Image](../artifacts/story-mode/initial-scene-1440x900.png) | [Image](../artifacts/story-mode/initial-scene-1152x720.png) | Lysa's speech, the named illustrated companions, families' need and Continue are readable. |
| Preparation | [Image](../artifacts/story-mode/preparation-1440x900.png) | [Image](../artifacts/story-mode/preparation-1152x720.png) | Three chapters/twelve encounters, current promise, chest, march, journal and banner actions remain grouped and unclipped. |
| Gate reward | [Image](../artifacts/story-mode/gate-reward-1440x900.png) | [Image](../artifacts/story-mode/gate-reward-1152x720.png) | Human aftermath accompanies company gold and the earned-rune instruction; the next action leads to the conversation. |
| Earned rune chest | [Image](../artifacts/story-mode/earned-rune-chest-1440x900.png) | [Image](../artifacts/story-mode/earned-rune-chest-1152x720.png) | Stored rune, outlined adjacent cells, effect, keyboard instructions and blocked departure explain the spatial task. |
| Ivo choice | [Image](../artifacts/story-mode/ivo-choice-1440x900.png) | [Image](../artifacts/story-mode/ivo-choice-1152x720.png) | Exact two choices and cart-health consequences remain visible before activation; first-branch outline denotes keyboard focus. |
| Choice save warning | [Image](../artifacts/story-mode/ivo-choice-save-warning-1440x900.png) | [Image](../artifacts/story-mode/ivo-choice-save-warning-1152x720.png) | Compact warning is below both complete consequences and every action; no strip of duplicate raw error remains. |
| Defeat | [Image](../artifacts/story-mode/defeat-1440x900.png) | [Image](../artifacts/story-mode/defeat-1152x720.png) | Preservation, remaining human task and retry are explicit. |
| Decoy recalled at home | [Image](../artifacts/story-mode/ending-decoy-1440x900.png) | [Image](../artifacts/story-mode/ending-decoy-1152x720.png) | Ivo's lantern consequence and returning wages stay readable. |
| Evacuation recalled at home | [Image](../artifacts/story-mode/ending-evacuation-1440x900.png) | [Image](../artifacts/story-mode/ending-evacuation-1152x720.png) | Lost keep/new homes is explicit; the longer line wraps within the speech panel. |

Directly inspected all nine compact states and six corresponding large states, then re-inspected preparation and the corrected warning at both sizes after the final fixes. The final set uses **cart health** rather than abstract gate health in the convoy choice; rules remain the canonical 30/25 durability plus the decoy's displaced enemy.

## Six craft dimensions

| Dimension | Score | Evidence and deduction |
| --- | --- | --- |
| Hierarchy | 8/8 | Opening, choice, reward, preparation and ending each have an obvious job and next action. Speaker/title, speech and immediate promise form a consistent reading order. Costs are visible before choosing, and preparation keeps the current encounter stronger than future route entries. |
| Typography | 7/8 | Serif speech/titles and native sans controls/task text create a deliberate hierarchy. The complete Ivo and evacuation text fit both sizes; names, chapter labels and focused button text remain legible. Deduct 1 for compact secondary metadata and the limited weight range; this is not a large-text accessibility treatment. |
| Composition | 7/8 | The same world/company/speech/decision system continues into a finite road and real chest, not only a title screen. Final caption/control and warning/consequence overlaps are resolved. Deduct 1 for repeated armed poses and the single reused gate illustration, which limit the scene's emotional and spatial range. |
| Identity | 8/8 | Rowan's orders, Lysa/Ivo, households' winter wages, the company, three fronts and spatial rune chest connect the presentation to War Chest. A subject-name swap would not preserve its meaning. Existing Banner & Steel adult flat art remains coherent. |
| Interaction | 3/4 | Actual native callbacks, exact consequences, invalid-action feedback, focus handoffs, banner claim/equip, journal, retry and free-play departure are verified. Root manually earned the first Gate and used the rune in Ashen. Deduct 1 because later branches and the ending were driven through UI fixtures/callbacks, not a complete manual physical-input campaign. |
| Responsive | 3/4 | Both supported capture sizes retain speech, decisions and preparation capabilities without clipping. Deduct 1 because these new surfaces were not independently exercised through wide/tall resizing or increased text size in this pass. The game uses an aspect-preserving canvas, not responsive reflow. |

## Native audit

| Dimension | Score | Evidence and limit |
| --- | --- | --- |
| Purpose | 4/4 | Immediate named human stakes, real tactical preparation, truthful choice effects and finite road; company gold is distinguished from the sealed household wages. No commerce or player-attachment claim is invented. |
| Accessibility | 4/6 | Native labelled Buttons, visible keyboard focus, tested focus handoffs, visible/exposed canonical choice consequences, keyboard chest placement and reduced-motion captures. Calculated opaque-token contrasts: paper/ink 11.01:1, paper/olive 6.47:1, paper/rust 5.47:1, paper/muted 5.51:1, gold/ink pressed state 6.23:1. These calculations do not certify every composited pixel. Deduct 2 for unverified VoiceOver/assistive navigation and increased text sizing. |
| Behavior | 3/4 | 90 UI checks drive actual Main callbacks through opening, preparation, battle/retry, banner claim, rune placement, Ivo choice, actual decoy convoy, journal, banner equipment, remembered ending and real free-play contract. Source/save-schema and forced settlement coverage is separated from earned play. Deduct 1 for later physical-input routes and slot-switch/recovery paths not independently exercised by this reviewer. |
| Responsive | 3/3 | The required native 1440×900 and minimum 1152×720 fixtures have no unresolved clipped task, action or choice consequence. Phone widths 390/768 are unsupported, not simulated proof. |
| Performance | 2/3 | Static bounded native scenes, no new runtime dependency, error-free native capture and fast focused UI test completion provide proportionate implementation evidence. Deduct 1: no production-equivalent story frame/memory profile was performed; earlier battle frame tails are not claimed fixed by this work. |

## Fixes and regression coverage

The review first reproduced the non-battle save-warning panel covering both convoy consequences. A targeted rectangle-intersection regression now checks every story choice action, both exact consequence labels and complete Menu recovery. Direct rendering subsequently exposed the preparation caption behind journal/banner controls and a thin duplicate raw-error strip above the compact warning. The root agent made the company caption one line and suppressed the duplicate status. The final captures confirm both corrections.

The root agent also corrected the four independently reported narrative continuity defects: the premature lens instruction, flooded-archive wording, inventory attribution for the chest's location, and the final engine captain's identity. Current source verification is recorded in `.fleet/story-directions-review.md`.

## Actual checks and attribution

Focused UI integration:

```sh
rtk proxy sh -c '. ./scripts/godot-bin.sh; "$GODOT_BIN" --headless --path . --script tests/test_story_ui.gd -- --story-demo'
```

Observed latest result: **STORY UI TESTS: 90 checks, 0 failures**, exit 0. All advancement loops are bounded. The suite uses the isolated story demo and validates injected late-route state; it never accesses player storage. It tests callbacks/state, not a claim of physical input or enjoyment across twelve encounters.

Native capture:

```sh
rtk proxy sh -c '. ./scripts/godot-bin.sh; "$GODOT_BIN" --path . --script tests/capture_story.gd --log-file /tmp/war-chest-story-ui-capture.log -- --pocket-demo --story-ui-fixtures'
```

Observed latest result: **18 native fixtures, 0 failures**, exit 0; Godot 4.7.2, compatibility renderer, Apple M5 Pro. Capture window exited normally. Syntax checks for both scripts passed.

The root agent separately reported CUA/manual native proof: earned Gate victory with 30 durability and all companions alive; three intro/outro lines into Ashen's briefing; automatic chest; F placement of the earned rune at (1,0); enabled March; and actual Ashen enemies with 10 HP defeated by the rune's 10-damage Cleave. This is attributed root evidence, not this reviewer's own manual run. Full source/check-runner/launcher results remain the root agent's project-check record.

## Limits and completion boundary

No 390 px or 768 px screenshot is presented: the native application has a minimum 1152×720 window, and those web/mobile widths are unsupported. The current shared workflow validator still requires the generic web widths; actual native evidence must not be relabelled as mobile proof to satisfy it. Record that tooling limitation explicitly if completion validation requests those widths.

Native slop-scale posture is advisory/not-applicable: Godot scenes have no browser page, DOM or CSS. Direction, iteration and final checkpoints refer to the direct native reviews without fabricated numeric scan scores.

The current evidence supports the selected visual system and the tested story integration. It does not establish VoiceOver/HIG certification, release build performance, an all-twelve-encounter manual playthrough, player attachment, commercial satisfaction, or the owner's acceptance of the finished game.
