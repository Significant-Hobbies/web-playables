# Contracts and banners expansion — September 23

Method: dual-agent (A: /root/expansion_design_review; B: /root/expansion_interaction_review). Both bounded and read-only; B withheld detector findings until A finished. Preserve lane; owner-selected Pocket Siege, not new design approval.

Target: scripts/pocket_main.gd. Slug: scripts-pocket-main-gd. No ignore file. Before: artifacts/pocket-v2/battle-1440.png. After: artifacts/expansion at 1152x720 and 1440x900. Screens are native rendering fixtures, not manual play evidence.

## Assessment and fixes

A: 32/40. Nielsen scores: status 4, familiar language 3, control 3, consistency 3, prevention 3, recognition 3, efficiency 3, restraint 4, recovery 3, help 3. Native audit 16/20: accessibility 2, performance 3, appearance 4, platform 3, adaptivity 4. These provisional source/image scores are not VoiceOver or performance certification. No P0/P1 identified.

The illustrated company and snowy fronts retain game-specific identity. Clear contract rules, exact enemy intents and a three-choice victory reward create a coherent preparation/combat/progression loop. Main friction was matching upgrades to available commands. Six banner entries and five commands are reasonable game complexity, but terminology should not add recall work. Victory is visually satisfying; applicability uncertainty weakened its final choice.

Both reviews found mismatched command names; corrected to live card names. A additionally found pre-armor damage ambiguity, loss of trait details on click, and missing upgrade applicability guidance; all corrected. B found hover-only next-tier thresholds and discarded keep focus; added visible thresholds and stable text-key focus restoration, regression-tested. Existing save failures now display an explicit persistent SAVING DISABLED warning rather than a small normal-play footer.

Persona risks: new players still need to learn equipment combinations; tactical users need actual play balance; keyboard and assistive users need a complete native accessibility pass. No whole-game redesign recommended.

## Evidence and limits

- sh scripts/check.sh: base 75, siege 89, expansion 118 checks; legacy and expanded campaign simulations; native scene UI tests including claim-to-contract and focus restoration.
- All three contract types at all five tiers won via legal-command automation with prepared endgame company. Tier-one contracts also won with level-two starter company. This establishes feasible paths, not fun or fair human difficulty.
- Legacy active save/next-turn equivalence, pending reward reload, invalid extension rejection and at-most-once rewards tested. No player save files accessed.
- Actual detector invoked once by B: exit 0, JSON [], zero findings. GDScript absent from supported extensions; unsupported, not clean proof.
- Browser/overlay/live server not applicable to native Godot; none started. CUA selected Godot Project Manager, not the new practice process, so no fresh full manual expansion-loop claim. Only the isolated practice process started by this task was stopped.
- No detector temporary files or server cleanup needed. Native captures and test fixtures intentionally retained. Existing/generated media remains ignored and local-only.
- Generic design receipt gate requires 390/768 browser/mobile captures. Those are unsupported; gate remains uncleared. No completed visual-quality or owner-acceptance claim.

Remaining product work: distinct authored maps, animation/audio polish, long-session balance, complete native accessibility, export packaging. No commit, push, deployment or release.
