# Story onboarding — October 2, 2026

Owner request: clear onboarding for character selection, new characters joining, and how levels progress. The owner explicitly confirmed **Teach companion selection in battle** in the optional selection question. This teaches which authored companion receives orders while the full company deploys.

## Plan and design lane

Inspect current selection, story recruitment, progression, rewards and tests. Preserve the owner-selected Company & Consequences system. This is contextual copy, tooltips and read-only teaching in existing rectangles/lessons; no new surface, navigation, layout, tutorial state, rules or forced action. The design-workflow skill was read; its copy-only exemption applies, so a new direction selection or implementation gate is unnecessary. Historical receipts are preserved.

Teach switching through actual portraits/number keys and command-card changes. Explain automatic companion deployment, Merrin's free narrative arrival and stored staff. Show the next named company-level milestone on the road; disclose every real unlock with its required action. Distinguish company XP from companion mastery. Run focused onboarding/story UI checks, inspect native content at three desktop sizes, then make and verify fresh local apps without replacing old builds or touching player saves.

## Defects found

- “Select Rowan” did not explain the bottom portraits or number keys, and selection hints ignored the selected companion.
- Story quest/rune text hid the useful level 2–5 unlock instructions.
- The level-6 reward used legacy text offering Talon before the story allowed him.
- Merrin's actual free arrival and unpacked staff were absent from reward guidance; the manual used paid recruitment advice in story mode.
- The road/manual did not clearly distinguish story milestones, company levels and individual mastery.

## Implemented teaching

- The first lesson names portrait/1–5 selection and free switching; the next lesson reacts when Lysa is selected and explains her changed cards. Live packaged input found that focused/hovered command details can replace the longer helper text, so the first lesson's persistent heading now also names **portraits or 1–5**. Target/command preview precedence is preserved.
- Portrait descriptions name selection keys/roles and explain that switching spends no orders. Selected-companion text identifies the current actor; Merrin with stored staff explains usable Strike/Guard and packing at camp for Storm.
- The road shows current company level and the next XP-bearing encounter, derived from the canonical story data.
- Gate reward keeps the rune instruction and additionally teaches the free permanent talent and paid forge upgrades. Levels 3–6 distinguish purchases/packing, immediate next-battle commands, shared orders, the cap and the story-locked owl.
- Reliquary reward explains free automatic Merrin deployment next battle, key4, staff packing and the recovered aegis. The quartermaster and manual repeat the correct story/legacy rules for the current company.
- The manual explains full-company deployment, selection/card/target order, authored joining, automatic company milestones and separate mastery at 2/5/9 victories. It retains once-per-hero command use, Shield targeting any ally, and End turn's enemy response/order refresh. Every company level's +2 companion max HP is explicit.

No model/save schema change, new asset/dependency, commit, push or release. Runtime tests and captures use isolated practice state. Existing player companies and earlier artifacts remain preserved.

## Verification

Focused legacy onboarding: **51 checks, 0 failures** after the final copy change. Independent [native review](onboarding-native-review-2026-10-02.md): **45 actual-Main fixture captures, 0 failures** across 15 states at 1152×720, 1440×900 and 1600×1000. Selection, staff stored/packed, recruitment, all level rewards, the road and manual are readable; no unresolved P0/P1 in the reviewed pass. The minimum manual remains dense with about 12 pixels between its longest paragraph and the next heading; it does not overlap. Exact window, viewport, display-scale and PNG measurements are in `artifacts/story-onboarding/capture-evidence.json`. These injected UI states are not earned campaign evidence or a human comprehension test.

Focused story UI integration: **305 checks, 0 failures**. New checks use actual portrait/key selection, Gate talent/forge callbacks, legal four-turn Reliquary recovery/extraction, free automatic join, next-battle deployment, basic Merrin Guard before packing, chest controls followed by real Storm damage/stun, Pin and packed Freeze, six/seven order budgets and Rally's actual four block per ally. Selection leaves the entire game snapshot unchanged and cancels command/target UI state. Later-level setup is explicitly a validated UI fixture; the separate full earned-route suite remains the campaign proof.

Full source verification passes import, **17 game suites** and the isolated check-runner/local/app launcher harnesses. Definitive current run after the persistent selection-heading fix: `war-chest-check.EYezMS`, retained in `artifacts/story-onboarding-build-audit-v2/source-check.log`. Story rules remain **263/0**, full earned routes **2589/0**, story UI **305/0**, story save slots **32/0**, and legacy onboarding **51/0**. All **12 packaged suites** also pass in the final v2 bundle, with strict completion-marker/engine-error checks.

Independent final rule-claim audit found no materially false teaching in the milestone rewards, road, manual, roles or bundled play instructions. It checked recruitment/packing, portrait order, paid/free/automatic unlocks, next-battle timing, company HP, cap, mastery and actual turn/Shield rules against source.

## Native input and final app handoff

The first local onboarding candidate's actual wrapper was opened in isolated story practice. The manual, authored introduction and new road were physically inspected. Mouse selection changed Rowan to Lysa without spending any of six orders; number keys 1/2 switched their visible command cards. Clicking Cleave then pressing T created a real target preview; key 2 cleared the command/preview and retained six orders. Menu and Escape returned to the same Lysa selection, turn, health and orders. These input behaviors are unchanged in v2; the only runtime resource changed afterward is the persistent first-lesson heading.

One earlier CUA session lost its binding and its practice process ended with no recorded engine/script error; its cause is unknown. A fresh serialized session completed the mouse/keyboard checks above. Querying the closed engine through CUA subsequently opened Godot's project manager; that extra test process was closed too. The owner's original v2 story process/session remained live throughout. This is bounded input evidence, not a long-session stability claim.

The initial onboarding bundle and wrappers are preserved as superseded candidates after the real focused-card teaching defect. Final artifacts:

- `builds/Practice War Chest Onboarding v2.app`: isolated story practice, native-launched and left at Gate turn 1, Rowan selected, all six orders and full starting health retained.
- `builds/War Chest Onboarding v2.app`: persistent play; no-start integrity/preflight only, never launched by verification.
- `builds/War Chest Onboarding v2 2026-10-02/`: self-contained Play/Practice/Verify bundle.

The final wrapper physically reached preparation and the first battle. With Cleave focused/hovered, its description remained visible and the heading explicitly retained **Select: portraits or 1–5**. Key 2 selected Lysa's actual cards while retaining six orders; clicking Rowan's portrait returned to Rowan and revealed the full free-switching lesson. Native full-window screenshots were 1440×964 including the 64-pixel sharing/title strip, separate from the measured fixture dimensions. Final native log: `builds/Practice War Chest Onboarding v2.app/Contents/Resources/Game/logs/session.0me7QF/game.log`; no engine/script error was recorded.

All **36 actual packed resources** match the manifest and current source; both wrapper packs/manifests and copied launcher/docs match. Source and all three copied official Godot signatures verify. Pack SHA256: `b16967736584fe02370d866e3dbf06d3a05ae20d538412f1f2bf3f44bf187935`. Exact proof: [complete-content-proof.json](../artifacts/story-onboarding-build-audit-v2/complete-content-proof.json), [source-check.log](../artifacts/story-onboarding-build-audit-v2/source-check.log), [verify-pack.log](../artifacts/story-onboarding-build-audit-v2/verify-pack.log). Packaged per-suite logs: `builds/War Chest Onboarding v2 2026-10-02/logs/session.u9RDnh/`.

All **115 prior control/pack/manifest files** and **469 original artifact files** remain unchanged. The original owner story process/session remains live. No persistent wrapper, player save or player preference was opened. No commit, push or release was performed. First-time player comprehension, full physical-input campaign completion and commercial satisfaction remain unmeasured.
