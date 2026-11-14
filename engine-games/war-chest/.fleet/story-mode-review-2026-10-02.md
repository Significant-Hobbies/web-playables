# War Chest story mode — October 2, 2026

The game has a finite authored campaign about returning the valley's stolen winter wages. Twelve encounters span three chapters, with rescued companions, three decisions that alter battles, and a homecoming that remembers each decision. This records implemented behavior and verification; player attachment, buyer satisfaction and owner acceptance remain unproven.

## Scope and selected direction

The owner asked for story mode and explicitly selected **A — Company & Consequences** after three materially different native presentation systems. Preserve Banner & Steel's existing adult flat artwork. The new system carries visible companions, world scenes, short named conversations and a finite campaign road through opening, preparation, aftermath, decisions and ending. Separate direction receipt: `.fleet/design-review-story-mode.json`; exact selection: `.fleet/story-mode-owner-selection.md`. Implementation preflight passed before production UI integration.

Godot remains the only runtime dependency. No new asset, payment system, account, network call, analytics, cloud save, commit, push or release. The original company and all earlier builds are preserved. `.wrangler/` is unrelated and untouched.

## Playable story

Lysa's brother Ivo is missing outside Lantern Gate. Rowan signed the order that shut the families out. Opening the gate leads to the recovered army rune, Ivo's rescue, delivery of his remaining supplies, and discovery that household wages funded the winter engines. Merrin joins after recovering the ledger; Rowan's seal makes his responsibility concrete. The Crown's defeat does not finish the journey: the company must recover the chest and extract Rowan alive, then return the wages.

- Three chapters/four encounters each; levels advance after Gate, Convoy, Watchfires, Iron Oath and Winterwatch.
- Reinforce the cart for 30 health, or use a 25-health decoy that shifts an enemy away from the first escort front.
- Shelter every hero with 4 initial block, or add 2 damage to hits on the frost marshal.
- Hold Winterwatch for six turns, or evacuate for four with a more fragile gate and a living Rowan on the lower road; the ending acknowledges the lost keep.
- Rune packing produces the actual 8→10 Cleave payoff against Ashen's 10-HP enemies. Rescue, convoy, watchfire, protected seal recovery and final extraction require living companions in the stated positions.
- In the finale, collecting under fire exposes Rowan to real attacks. Killing the captain or leaving with live escorts cannot settle victory. Cleared foes still require a survived exit turn.
- Defeat returns to the same encounter without erasing company progress. Claimed banners remain accessible/equippable from the road. Contracts and Talon become available after the epilogue.

Story data and rules are separated from rendering in `story_data.gd` and `story_game.gd`; `pocket_story.gd` presents the selected system. Legacy battle rules and isolated regression modes retain their previous behavior.

## Save protection

New persistent companies begin in the story slot `winter-wages-story-v1.json`. An existing original company can explicitly begin or resume a separate story company; Menu can reopen `iron-and-ember-v2.json`. Tests exercise startup, exact cursor restore, switching healthy companies when the other slot is broken, and both-malformed recovery. A malformed slot is never replaced and disables writes to that company.

The final audit found and fixed an extraction-save invariant: completed extraction cannot coexist with a playing battle. Invalid victories also reject a dead carrier, a carrier away from the exit, or live engine escorts. A saved evacuation victory must retain Rowan alive on the lower road. An outro must retain its victory battle so a damaged save cannot discard a pending banner; the public camp action preserves it until the final authored advance clears it atomically. Focused regressions reject these states before restore and preserve their exact file bytes when subsequent writes are attempted. Tests use isolated storage; verification never reads or writes actual player saves or preferences.

## Source and earned-route evidence

`sh scripts/check.sh` passes source import, all **17 game suites** and the isolated check-runner/local/app launcher harnesses after the source freeze. Definitive log directory: `/var/folders/9_/1109_2dd1qz6zyvmxb5zp8pc0000gn/T/war-chest-check.Zeno6c`. Packaged artifact proof is recorded below after the fresh local build. The focused story suite passes **263 checks, 0 failures** after the last extraction fix. Story UI passes **90/0** and save-slot integration **32/0**. The complete earned-route suite passes **2589/0**: two legal campaigns use actual public actions and rewards, with exact save/restore replay. It does not inject gold, XP, gear or direct settlement into its earned routes.

The two finale policies separately demonstrate collection under fire with damage and collection after clearing escorts. This proves the implemented route is winnable without grinding; it does not measure human difficulty, pacing or enjoyment. Late UI fixture captures and callback checks are kept separate from earned-play evidence.

## Native input and presentation

The parent manually played the actual native story introduction, Lantern Gate victory, companion aftermath, Ashen briefing, automatic chest transition, F placement of the earned rune at (1,0), enabled March, and actual 10-damage Cleave killing both 10-HP Ashen front enemies. Keyboard and physical mouse input were used. This was isolated source story practice with official Godot 4.7.2 on Apple M5 Pro; no engine errors were observed.

Independent production-interface review: **18 actual-Main fixtures**, nine states at 1440×900 and the supported minimum 1152×720. Full canonical choice costs, warning footers, preparation, rewards, defeat and recalled endings remain visible. Concrete fixes include caption/control overlap, duplicate error-strip exposure, readable focus text, exact guide return and focus after reward removal. Narrative review also corrected four continuity errors before the final captures.

The independent [native review](story-mode-native-review.md) records critique **36/40**, audit **16/20** and zero unresolved P0/P1 in the reviewed scope. These rubric judgments have explicit deductions for repeated poses/background, compact metadata, later physical-input routes, assistive access and unmeasured performance. They are not owner acceptance or commercial certification.

## Workflow and practical limits

Godot scenes have no DOM, CSS or browser URL. Native direction/iteration/final slop checkpoints record a justified web-scanner exemption, direct native findings and no invented numeric score. The repo has no landing page or storefront; the receipt records standalone native product scope and the local onboarding/first-value path.

The current shared design validator requires generic 390/768 web widths despite the native game's minimum 1152×720. Actual native screenshots are never relabelled as mobile proof. The final receipt-specific `check --json` exits 1 with exactly two findings: `missing required viewport 390` and `missing required viewport 768`. Direction selection, project checks and native evidence pass validation. The formal visual gate remains open for those unsupported mobile requirements. The [design-workflow skill](/Users/sarthak/.agents/skills/design-workflow/SKILL.md) says, “Do not claim the meaningful visual change is complete until this command passes.” Native review and playable implementation remain separate from that gate.

A full twelve-encounter physical-input playthrough, VoiceOver, larger text, story frame/memory profiling, human emotional attachment and buyer satisfaction remain unverified. Previous battle timing does not establish smooth 60 fps or a story performance improvement. Reused battlefield geometry and armed poses limit scene variety; no soundtrack or exported/notarized release is included.

## Final local qualification

Final artifacts:

- `builds/Practice War Chest Story Mode v2.app`: fresh isolated authored story; native-launched through the wrapper, inspected and left open at the first conversation.
- `builds/War Chest Story Mode v2.app`: persistent play; preflight/integrity only. Never launched by this verification.
- `builds/War Chest Story Mode v2 2026-10-02/`: self-contained Play, Practice and Verify commands.

All **12 packaged suites pass** with strict marker/engine-error checks. All **36 actual PCK resources** match both the manifest and current source; copied launchers/docs match source. Folder and both wrapper packs/manifests are byte-identical. The source official Godot runtime and all three copied signatures verify. Pack SHA256: `7d64fc5357268e282ed6a319ed22e5a5b8498c9adc7042c4298a6eb61d2b6134`.

Proof: [complete-content-proof.json](../artifacts/story-build-audit-v2/complete-content-proof.json), [verify-pack.log](../artifacts/story-build-audit-v2/verify-pack.log), [runtime-signatures.json](../artifacts/story-build-audit-v2/runtime-signatures.json). Full packaged per-suite logs: `builds/War Chest Story Mode v2 2026-10-02/logs/session.ZicjqD/`.

The parent native-launched only the v2 practice wrapper. Actual observed behavior: opening speech, physical mouse advancement, Menu, Esc restoring the same third line, visible Tab focus, Enter reaching the three-chapter preparation road, and clean quit. The native game log contains no engine/script errors. A fresh wrapper launch was then left at Lysa's first line; native window zoom preserved the entire conversation, promise, Continue action and practice footer with proportional scaling and side letterboxes. Default captured native window was 1440×964 including the sharing/title strip; zoomed capture was 3456×2168 including that strip. These are full-window CUA observations, not relabelled fixture dimensions. A failed corner-drag attempt did not resize the window; no new minimum-size physical-input result is claimed. Minimum-size story evidence remains the 18 rendered fixtures and callback checks.

All **91 prior pack/manifest/launcher/plist files** and **469 original artifact files** remain unchanged. Initial Story Mode candidates are preserved as superseded because final save invariants were added after their pack was created. No player saves/preferences were accessed, no release was made, and no completed-game owner acceptance is claimed.
