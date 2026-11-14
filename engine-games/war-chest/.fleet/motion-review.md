# Interaction animation upgrade — September 23

Preserve lane: owner-selected Pocket Siege, same cartoon atlas, layout and native controls. Design-workflow and Impeccable animate/polish guided this bounded pass; no new visual-world selection or whole-game approval implied. Issue #1 owns the active specification.

## Independent review

Read-only A: /root/motion_design_review. Read-only B: /root/motion_evidence_review; detector and findings withheld until A completed. A judged Nielsen 32/40: status 3, real-world match 4, control 3, consistency 4, prevention 3, recognition 3, efficiency 3, minimalism 3, recovery 3, help 3. Provisional desktop audit 16/20: accessibility 3, performance 3, appearance 4, native interaction 4, adaptation 2. Scores are conservative source/render judgments, not certifications. No P0/P1 reported.

Review corrections:

A's refreshed recheck accepted the four requested motion corrections, retained 32/40 and 16/20, and found no new concrete regression. Rapid-input continuity was source-reviewed and covered by executable tests, not demonstrated by these stills.

- Projectile impact now precedes damage effects and ghost fading. Slot compression waits for the defeated silhouette/label to leave; authoritative rule state still commits immediately.
- New timelines carry over current rendered positions, preventing rapid Move → Guard from snapping troops.
- Enemy resolution uses copied effective attack power and ordered HP/block eligibility, excluding attacks skipped after their fixed target dies. Absorbed hits show Blocked N rather than treating expiring shields as damage.
- Reduced motion retains stationary actual-outcome text in the existing footer.
- Final impact hold is 0.57s, covering the last staggered projectile plus aftermath; Continue/Space skips it. Rewards are committed before the hold and never repeated.
- Damage/heal/block labels moved to the shoulder to avoid preceding-front health collisions.

## Verification

- `sh scripts/check.sh` passes: 75 base, 89 siege, 118 expansion, 47 mastery and 34 motion assertions; scene UI tests, six-encounter campaigns and all contract-tier legal-action runs pass.
- Motion tests cover actual multi-target deltas, copied snapshots, projectile timing, ghost positions, movement continuity, exact absorbed block, skipped post-death attacks, bounded rapid replacement, invalid commands, native moving hit regions, undo, mid-flight reduced motion, stationary results, navigation cancellation and at-most-once rewards.
- Native Godot rendering captures: `tests/capture_motion.gd -- --pocket-demo`, invoked with `--fixed-fps 30`; 174 consecutive frames across Cleave, Volley, Storm, Heal, Move, Guard, enemy turn, victory and reduced motion. Samples are one process tick apart at a fixed simulation step; capture/PNG encoding wall time is not a performance measurement. Earlier variable-step captures were replaced with these fixed-step artifacts.
- 1152x720 artifacts: `artifacts/motion/`; local encoded preview: `interaction-preview-v2.mp4`. Initial preview is retained separately, not the current result.
- 1440x900 capture uses `--motion-wide`, writing `artifacts/motion-wide/`.
- B ran the generic detector once against pocket_main.gd: exit 0, JSON []. GDScript is not a supported native analysis target; explicit-file text scanning is not visual/accessibility validation. No browser/DOM overlay or live server applies.

## Remaining limits

Native deterministic fixtures are not manual play, input-latency or frame-pacing proof. Prior CUA binding selected Project Manager; no new manual-play claim. VoiceOver and non-16:10 adaptation remain unqualified. Existing stretch/aspect ignore contradicts the aspect-preserving design intent; deferred outside this motion increment. The generic design receipt requires unsupported 390/768 mobile widths, so that gate is not cleared. Human feel, fun and final owner visual acceptance remain open.

No new assets, dependencies, model rules, player-save access, commits, pushes, deployments or releases. No memory files used.
