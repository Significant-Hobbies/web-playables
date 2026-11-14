# Authored journey expansion — September 23

Method: dual-agent (A: /root/journey_design_review; B: /root/journey_evidence_review). B held findings and its single detector run until A completed. Source-only assessment: no current screenshots, visual scores or visual acceptance. Preserve lane, owner-selected Pocket Siege direction.

Design-workflow kept additions in existing keep, battlefield briefing, chest and reward controls. Six side quests extend the journey without replacing the visual system. New six-cell relics compete for actual chest capacity; campaign/quest milestones gate content, while optional contracts supply another growth route. This record documents implementation and verification, not a replacement for GitHub issue #1.

## Review and polish outcomes

- Fixed P2: side-quest reward branch hid mastery rank-up controls and bonus payout. Quest copy now uses blank space above the company illustration; mastery remains independently visible. Native geometry and rank-up assertions pass.
- Fixed P2: quest defeats offered generic advice. Deadline, Rowan loss, gate loss and voluntary retreat now have distinct persisted explanations. UI asserts one actual failure label and bounded text.
- Fixed minor clarity: each contract tier names its alternate unlocking quest; level-two reward guidance announces side quests.
- Fixed interaction correctness: pre-enemy hazard/convoy defeat previously could invent attack animations; presentation now receives whether the enemy phase actually began, post-hazard health/shield and absorbed block. Tests cover no phantom attacks and exact block feedback.
- Fixed test weakness: quest descriptions and reward/failure copy must actually exist, not merely fit if found. All eleven equipment buttons are tested for reachability and overlap.

No proven P0/P1 remains in these bounded source reviews. Assessment A rechecked the fixes and confirmed both P2 issues and tier guidance resolved in source; no new visual qualification was claimed. This is not a visual pass. Cognitive load remains a playtest concern: first victory introduces several progression systems, and the quest selector exposes six choices. Locked quests remain inspectable with explicit prerequisites. The game still shares one battlefield layout and six company levels; no claim of endless content or retention.

## Gameplay evidence

`tests/test_journey.gd`: 174 assertions, zero failures. Real earned progression, legal actions, and JSON round-trips after turns complete this route:

Main 1 → Scout → Convoy → Main 2 → Reliquary → Main 3 → Watchfires → Main 4 → Iron Oath → Main 5 → Main 6 → Siege Engine.

All twelve finish in victory. Final two gate results are 26/30; preceding encounters end at 30/30 with the tested policy. Earned gold funds recruitment, upgrades and equipment; no fixture resources or direct settlement are used in this route. All three unique relics are earned, tier V opens, and zero contracts are required. Actual commands include attacks, nine moves, 36 Guards, three Wards, two heals and several stun attacks.

This route does not equip every new relic: focused tests separately prove pennant's free first move/refresh/invalid-action atomicity, aegis's extra Guard block and lens's clear-front damage. Eleven equipment footprints sum to 43 cells, exceeding the 30-cell chest. This proves a capacity tradeoff, not that every build is equally competitive.

The comparison attack-focused policy still clears 6/6 main battles without movement, active shielding or healing. It uses damaging stun commands and a passive Stoneguard banner, so calling this pure damage-only would be misleading. Its gate results are 30, 30, 18, 27, 10, 18. Four objective-quest fixtures lose when this policy ignores their objectives. These results demonstrate reachable content and mechanically different goals, not general balance difficulty or human enjoyment.

Save/edge coverage: legacy active battles retain identical next-turn results; completed/pending quest rewards round-trip; first-clear rewards cannot duplicate; replay gives no XP or repeat relic; campaign clears are not fabricated; malformed journey fields reject atomically; deadline cannot fall through to automatic defense victory; fallen rescuers/carriers do not earn progress; commander protection ends when escorts fall.

`tests/test_journey_ui.gd`: 32 assertions, zero failures. Actual native buttons start a quest, move/rescue Rowan, resolve victory, require banner selection and return to keep. All six descriptions exist and fit. Quest/mastery rewards coexist; all eleven owned items fit the list; zero-order free Move works and Undo restores its charge. No real player storage is used.

All eight previous suites also pass: base75, siege89, expansion118, mastery47, motion34, onboarding51 plus campaign and existing UI smoke suites. Total numbered assertions: 620. New suites are included in `scripts/check.sh`.

## Qualification boundaries

Headless commands use `scripts/play.sh --headless --log-file /private/tmp/<unique>.log --script tests/test_<suite>.gd -- --pocket-demo`. Tests exit0, but every invocation emits the host macOS `get_system_ca_certificates` diagnostic. The strict wrapper must not be reported green; earlier editor import also encountered unwritable editor preferences. No host workarounds or secrets accessed.

The prior graphical launch aborted in macOS application initialization before game loading. No new native GUI launches attempted. No after screenshots, smoothness claim, crash regression pass, VoiceOver qualification or current visual score. Earlier motion images are before-only evidence. Non-16:10 adaptation remains open. Design-workflow's visual gate remains blocked, not waived.

GitHub could not be reached; tracking issue #1 was not updated. No commits, pushes, deployments, exports or releases. No new runtime dependencies, assets or network behavior. Player saves/settings untouched.

## Review provenance

Target scripts/pocket_main.gd; helper-derived slug scripts-pocket-main-gd; no critique ignore file. A reviewed independently before detector findings entered synthesis. B's exact explicit-file generic text scan returned exit0, JSON[], zero findings/rules/locations. The detector does not validate Godot native rendering. No browser, DOM injection, live server or detector temporary files used. Numeric heuristic/audit scores and historical trends deliberately not carried forward without rendered evidence. Questions skipped because concrete fixes were within approved scope; remaining judgments need human playtesting.
