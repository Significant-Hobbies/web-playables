# Independent native onboarding review — October 2, 2026

Reviewed by `/root/presentation_review`. Result: **no unresolved P0/P1 defect observed in the changed onboarding copy or its rendered states**. This is a bounded copy/tooltips/contextual-teaching review within the owner-selected Company & Consequences direction. It does not establish owner acceptance of the finished game, novice-player success, fun or commercial quality. No new numeric visual score is assigned to this copy-only pass.

## Scope and isolation

The root agent owns production changes in `pocket_coach.gd`, `pocket_main.gd` and `pocket_story.gd`. This reviewer added only `tests/capture_onboarding.gd` and this report. The capture harness requires both `--story-demo` and `--onboarding-ui-fixtures`, rejects `--banner-opening`, and verifies Main is in demo mode. It renders actual Main controls and schema-checked model fixtures. Its injected past milestones and victory settlement are explicitly UI-only evidence, never an earned campaign-route claim. Player storage, the owner's existing application window/session, earlier capture scripts and previous artifact sets were preserved.

## Native evidence

Final capture run: **45 PNGs, 0 failures**, 15 states at each of these actual engine-reported window/readback sizes:

| Window and PNG dimensions | Logical content viewport | DisplayServer scale | Window content scale factor |
| --- | --- | --- | --- |
| 1152×720 | 1440×900 | 2.0 | 1.0 |
| 1440×900 | 1440×900 | 2.0 | 1.0 |
| 1600×1000 | 1440×900 | 2.0 | 1.0 |

Each image is a fresh native Godot Window viewport readback after `frame_post_draw`; decoded dimensions are checked against the requested/reported window. The same-aspect 1600×1000 capture covers its full window rather than dropping letterbox pixels. Logical canvas dimensions, engine window dimensions, raster dimensions and display scale remain distinct in `artifacts/story-onboarding/capture-evidence.json`; these are not relabelled Retina screen grabs or mobile evidence. Runtime: Godot 4.7.2, GL Compatibility, Apple M5 Pro.

The 15 states are fresh company road; first Rowan lesson with the actual Cleave button focused; Lysa selected; Lysa ranged lesson after an actual Main Cleave callback; manual; Gate level-2 reward; Cart level-3 reward; Merrin joining reward; Merrin company road; Merrin selected with staff stored; Merrin selected with staff packed; Watchfires level-4 reward; Iron Oath level-5 reward; Winterwatch level-6 reward; level-6 road before Crown. Every state class was inspected at the supported minimum during the render iterations. The final corrected manual and final persistent first-lesson heading were inspected at all three widths, with representative larger reward and lesson captures also inspected. Generation/dimension assertions cover all 45; not every larger-width image was separately visually reviewed.

Representative final evidence:

- `artifacts/story-onboarding/first-battle-rowan-1152x720.png`
- `artifacts/story-onboarding/first-ranged-lesson-1152x720.png`
- `artifacts/story-onboarding/field-manual-1152x720.png`
- `artifacts/story-onboarding/gate-level-2-reward-1152x720.png`
- `artifacts/story-onboarding/merrin-joins-reward-1152x720.png`
- `artifacts/story-onboarding/merrin-selected-staff-stored-1152x720.png`
- `artifacts/story-onboarding/merrin-selected-staff-packed-1152x720.png`
- `artifacts/story-onboarding/iron-oath-level-5-reward-1152x720.png`
- `artifacts/story-onboarding/winterwatch-level-6-reward-1152x720.png`
- `artifacts/story-onboarding/field-manual-1440x900.png`
- `artifacts/story-onboarding/field-manual-1600x1000.png`
- `artifacts/story-onboarding/merrin-joins-reward-1600x1000.png`

## Findings and resolution

1. The first lesson originally said to select Rowan without identifying the portraits or number keys. Final copy names free switching and its helper text reacts to the selected hero. The capture's actual Main selection changes to Lysa without consuming orders; an actual Cleave callback reaches the second lesson. The active name, highlighted portrait and changed command rail make the result visible. Command hover/focus intentionally gives its inspection preview precedence over the longer helper body; helper text is not claimed to remain visible in that state.
2. Original story rewards hid level 2–5 instructions behind rune/quest descriptions and reused recruitment/free-play advice inconsistent with the authored story. Final Gate reward preserves the rune teaching while showing the permanent free talent and paid forge. Later rewards separately identify purchases and packing, automatic next-battle commands, seven shared orders, the company cap and Talon's post-ending availability. Level-6 copy correctly leaves Crown and Engine ahead.
3. Merrin's free narrative arrival and stored staff previously lacked practical teaching. Final Reliquary reward names his next-battle deployment, key 4 and staff packing. The road repeats the unpacked-staff instruction. Native battle captures show selectable Merrin with only Strike/Guard/Move when the staff is stored, and Storm after actual model packing. Joining alone does not falsely promise the equipment command.
4. Company levels and individual mastery were previously difficult to distinguish. Final road shows the next named XP-bearing encounter, while the manual separates five company milestones (+70 XP each, +2 max HP per level) from companion mastery at 2/5/9 victories, applied next battle.
5. An intermediate manual revision dropped once-per-hero card use and enemy-turn refresh teaching. The root restored both within the existing sections. A temporary `Protect` label/front restriction was also corrected against the actual Shield card and ally-target rule. Final wording is “Rowan's Shield protects any ally.”
6. In live packaged native play, the root observed auto-focused/hovered Cleave replacing the long selection helper with its command preview. This exposed a real onboarding gap despite the earlier no-focus fixture. The root changed only the first-lesson heading to “Field lesson 1/4 · Select: portraits or 1–5”. The capture harness now focuses the real Cleave button for its first-Rowan shot. A final full regeneration produced 45 captures with zero failures. Independent inspection at 1152×720, 1440×900 and 1600×1000 confirms the command preview is visible below while the portrait/key guidance remains readable on one line above, comfortably separate from Skip lessons. The root's physical-input packaged checks remain attributed to the root rather than this fixture reviewer.

All changed lesson, joining, unlock and manual text is readable at 1152×720. No instruction covers cards, portraits, banner choices, continuation controls or the footer. The four-line selection paragraph ends around y354; “Company levels” begins around y366. The roughly 12-pixel visible separation and distinct serif heading prevent merging. This is dense but legible, a minor craft limitation rather than a usability blocker; no typography/layout change is recommended for this pass.

## Limits and checks

The selected visual system, existing composition, navigation and four lesson states remain intact. Supported native desktop coverage is demonstrated; phone/tablet widths remain unsupported. This reviewer did not conduct a novice usability session, a full physical-input earned campaign, VoiceOver review, increased-text-size review, OS-window-coordinate conversion audit or performance profile. Those claims remain separate from fixture rendering and source review.

The smallest new-script check and final native render both passed:

```sh
rtk proxy sh -c '. ./scripts/godot-bin.sh; "$GODOT_BIN" --headless --path . --check-only --script tests/capture_onboarding.gd -- --story-demo --onboarding-ui-fixtures'
rtk proxy sh -c '. ./scripts/godot-bin.sh; "$GODOT_BIN" --path . --script tests/capture_onboarding.gd --log-file /tmp/war-chest-onboarding-ui-capture.log -- --story-demo --onboarding-ui-fixtures'
```

Final native output: `ONBOARDING UI CAPTURES: 45 native fixtures, 0 failures; injected UI state only, no earned-route claim or player storage`.

The missing-`--story-demo` guard was also executed headlessly and correctly returned exit 1 with the required-flags error before creating Main. Its error is an expected isolation check, not a product failure.

No production files, shared receipt, model/save schema, dependencies, assets, commit, push or release were changed by this reviewer. Design-workflow's copy-only exemption applies; a new design receipt or alternate direction round is unnecessary for this scope.
