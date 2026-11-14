# Hero mastery upgrade — September 23

Method: dual-agent, isolated read-only assessments A `/root/mastery_design_review` and B `/root/mastery_evidence_review`. B withheld findings until A finished. A rechecked corrected screenshots independently. Lane: preserve selected Pocket Siege. Target: scripts/pocket_main.gd; slug scripts-pocket-main-gd. No new visual-world selection or inferred whole-game acceptance.

## Assessment

Design specificity: the new rewards and effects belong to the existing illustrated company, equipment commands and three fronts. Optional goals are secondary to winning; mastery is attached to each hero rather than a separate dashboard. Victory preserves the three-banner decision. No P0/P1 after review/recheck.

| Nielsen heuristic | Final score /4 |
|---|---:|
| Status | 3 |
| Familiar language | 3 |
| Control and freedom | 3 |
| Consistency | 4 |
| Error prevention | 3 |
| Recognition | 3 |
| Efficiency | 3 |
| Minimalism | 4 |
| Recovery | 3 |
| Help | 3 |
| Total | 32/40 |

Provisional native audit 16/20: accessibility 2, performance 3, appearance 4, desktop game conventions 4, adaptivity 3. Source and fixtures only; not VoiceOver or performance certification. A's initial 30/40 improved after inspectable keep/reward benefits and consistent terminology.

## Review corrections

- P2: benefits unavailable while preparing. Native focusable mastery badges now explain current/next effects in the existing footer. Unique focus keys preserve the selected hero, even with identical progress text.
- P2: rank-up only displayed a number. Reward inspection now explains the effect and next-battle timing.
- P2: impossible goals still looked attainable. Swift/company/gate goals now report a miss with no penalty when irrecoverable under current rules.
- P3: Roman/Arabic ranks, capped headline and Guard/Brace result mismatch corrected.
- Existing boss label collided with the preceding front. Gold/star health badge replaces the overhead label; new fixtures show no collision.
- Optional discovery hint added to keep subtitle after recheck.

Cognitive load remains moderate: six Rowan commands are intentional tactical options; the former memory gap for mastery effects is fixed. Jordan can inspect before packing, Alex can see exact damage against a target, and Sam has named native buttons/focus continuity but still lacks qualified screen-reader support. A more detailed final objective breakdown is deferred P3; the optional rule, miss and absence of penalty are explicit.

## Verification

- `sh scripts/check.sh`: 75 base, 89 siege, 118 expansion, 47 mastery checks; UI scene checks and legal-action campaign/contract runs. All pass.
- Expansion simulations use the actual HeroCampaign model now, including all 15 contract/type-tier combinations and three level-two starter contracts. Winning routes are not human balance proof.
- Mastery tests cover all four effects, both companions, conditionally boosted damage, action atomicity, undo, all thresholds/cap, fallen heroes, no loss awards, legacy active state/next turn, pending victory restoration, invalid fields and at-most-once settlement.
- Added successful three-distinct-stun payout and contract mastery/objective tests. UI tests exercise keep mastery inspection, exact-hero focus and reward effect/timing text.
- Native fixtures: artifacts/mastery at 1152x720 and 1440x900. Each width starts from identical fixture state. Mastery-command fixture uses legal reposition + Guard and visibly shows Rowan's 6 block plus Fen's shared 2 block. Reward captures directly settle a fixture and do not prove an earned victory.
- Detector invoked once by B: exit 0, JSON [], zero findings. Explicit-file regex scan of GDScript is not native UI validation. No browser, overlay, server or detector temporary files created.
- CUA again bound the explicit Godot app path to Project Manager rather than the isolated practice process. No completed manual play claim. Only this task's practice process was stopped; no player saves accessed.
- Generic design gate still rejects unsupported 390/768 viewports. Desktop screenshots do not clear that gate; no final visual acceptance claim.

Questions skipped: review fixes were concrete and within the requested upgrade. No new assets/dependencies, commits, pushes, deployments or releases. Long-term balance, distinct maps, animation/audio polish, accessibility and packaging remain separate work.
