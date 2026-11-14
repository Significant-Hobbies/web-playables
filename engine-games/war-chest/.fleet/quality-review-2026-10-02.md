# War Chest quality review — October 2, 2026

The game now has a substantially hardened, native-reviewed local build. Three agents independently covered rules/save safety, packaging/test reliability, and presentation; the parent verified actual native input and earned play. No unresolved P0/P1 remains in the reviewed scope. This is a Good local game candidate, not owner acceptance or proof of top-of-category quality.

## Scope and direction

Work on main; no commit, push, deploy or release. No new dependency, assets, economy rebalance or save migration. Preserve the owner-selected **Banner & Steel** system in `DESIGN.md`. Fix bounded rule, failure handling, copy, focus and overlay defects. Keep the malformed-save write lock and isolated practice modes. Earlier builds and the original design receipt remain preserved; `.wrangler/` is unrelated and untouched.

Plan/gates: inspect product/model/tests; independently review rules, reliability and native presentation; make small defect fixes; run focused tests then `scripts/check.sh`; build fresh local candidates; inspect real native input and rendering; record limitations. The updated owner instructions introduced the v2 preflight during final qualification. The receipt was renewed to v2 and preflight passes; that is not a retrospective assertion that the new command preceded earlier UI edits.

## Concrete defects fixed

| Defect | Result | Evidence |
|---|---|---|
| Recruiting Merrin reset a previously upgraded staff | Existing purchased/forged staff rank survives recruitment | Rule regression |
| Malformed neighboring equipment records reached overlap arithmetic | All equipment record shapes are validated before geometry | Rule regression; corruption audit |
| Wrong-type save version or enemy target caused runtime comparison errors | Integer/String guards reject safely | Rule/siege regressions |
| Missing runtime silently stopped checks | Explicit runtime discovery and actionable diagnostics | Runner shell fixtures |
| Engine could exit successfully without completing a suite | Required completion marker and strict engine-error checks | Nonzero/error/wrong-marker fixtures |
| Packaging could accept an errored/incomplete pack | Captured diagnostics and file/integrity checks; runtime file hashes | Builder and eight-suite packaged verification |
| First physical mouse press accessed absent tween metadata | Guarded first access; second press cancels its predecessor | Actual native mouse click; `button_down` regression |
| Manual could overwrite its return destination with itself | No nested manual action; Back/Esc restore exact battle | UI test; actual native Menu/Esc |
| Used commands or defeated targets lost keyboard focus | Transfer to an enabled command, then End turn fallback | UI regressions |
| Programmatic focus overwrote action failures | Preserve latest action/error feedback after rebuilding | Invalid-target regression |
| Move focus/hover repainted text under destination controls | All inspection callbacks respect active Move choices | UI regressions; minimum-size native fixture |
| Actor focus left a stale target highlight | Clear the highlight on focus exit; include health/rules in descriptions | UI regressions; accessibility source review |
| Enemy-turn summary vanished with its animation | Preserve damage/block results until the next hero/card decision | Normal-motion regression after 0.75 s |
| Save failure covered Undo and command names | Compact warning below every battle control; full recovery message in Menu | UI geometry test for every Button; native minimum-size fixture |
| Unclear costs and inconsistent turn terminology | Name gold, state non-upgradeable equipment, use turns/orders with recovery advice | Native shop/manual/battle inspection |

## Verified source and local packages

`sh scripts/check.sh` passes source import, **13 game suites** and isolated check-runner, local-launcher and app-launcher checks. Final logs: `/var/folders/9_/1109_2dd1qz6zyvmxb5zp8pc0000gn/T/war-chest-check.skuT8S`. Numbered suites total 919 assertions, plus unnumbered campaign/UI assertions and shell scenarios. Important coverage is the legal earned twelve-encounter journey with save/restore after every turn, opening enrollment compatibility, malformed-save byte retention and bounded cleanup—not the assertion count.

Save corruption audit: 4,152 mutations; the baseline had 114 runtime errors and the fixed run has zero. This is a finite sample, not exhaustive input proof. The tests retain malformed file bytes and prevent subsequent writes. Evidence: `artifacts/quality-audit-baseline/fuzz-after.log` and rule/siege tests.

Stability: 40 battle/navigation cycles, warmed node count 41–41, and 15 seconds idle without game progression. This covers bounded cleanup/idle behavior, not an overnight soak.

Latest playable artifacts:

- `builds/Practice War Chest Quality Complete.app`: temporary practice campaign, native-launched and inspected.
- `builds/War Chest Quality Complete.app`: saved campaign; integrity/mode preflight passes. Never launched by this verification, so owner saves are not accessed.
- `builds/War Chest Quality Complete 2026-10-02/`: self-contained local runner with Play, Practice and Verify commands.

Eight packaged suites pass with no engine errors: journey, journey UI, onboarding, motion, opening, opening startup, stability and current battle UI. All 29 packed resources match current source, both wrappers contain the identical pack, and the copied official Godot signature verifies. The wrapper remains unsigned and is not a notarized export. Pack SHA256: `cf203de3b7b7330c83eab1ec9bc5c0d875d724d3ac3b6a884505c8fe742bfbd8`.

Evidence: `artifacts/quality-build-audit/complete-content-proof.json`, `complete-packaged-tests.log`; packaged logs under `builds/War Chest Quality Complete 2026-10-02/logs/`. No player data is packed. All earlier candidate packs and original artifacts remain preserved.

## Actual native play and rendering

Official bundled Godot 4.7.2, OpenGL compatibility over Metal, Apple M5 Pro. No runtime download or renderer change was required. The earlier Downloads installation is absent; scripts now discover the existing runtime.

Using native mouse and keyboard, the parent completed the first defense in four turns with all three heroes alive, earned the rune, packed it adjacent to weapons, and started battle two with the real Cleave preview increased from 8 to 10 damage. Battle two was won in three turns, reaching level three with mastery/banner rewards. This run used the first preserved candidate; subsequent changes were presentation callbacks and the warning layout, with unchanged combat/economy rules. The final candidate was separately native-launched and verified for Menu/Esc, physical mouse card press, T/F targeting and Z Undo (10 HP → 2 → 10, 6 orders → 4 → 6).

`tests/capture_quality.gd -- --pocket-demo` produces **52 native rendered fixtures**: opening, Move, save warning, rune reward, rune chest, quests, banners, all equipment, merchant, manual, late battle, enemy aftermath and mastery rewards. Requested windows are 1152×720, 1440×900, 1600×900 and 1440×1000. They use synthetic isolated state for composition review; they do not demonstrate an earned campaign. Wide/tall viewport PNGs contain the 1440×900 game canvas and exclude letterboxes, so file names are requested window dimensions, not image dimensions.

Separate real full-window CUA inspection confirms:

- 1600×900: 80-pixel side bars preserve proportions and all controls.
- 1152×900: 90-pixel top/bottom bars preserve the 1152×720 scaled game.
- 1152×720: readable, unclipped primary controls; actual mouse Cleave and T/F work after resizing, spending two orders and hitting both targets.

The 90-second window fixture stayed on turn one until an actual order. The final practice app also retained the exact restored turn-one battle when switching to Finder and returning: six orders, gate 30, all starting troop health, no crash or engine errors. This is bounded foreground/background verification, not a long-session soak. Tests use isolated practice state, never a player save. Normal/reduced-motion fixtures and the persistent-result regression pass; complete VoiceOver traversal/announcements and subjective sound quality remain unverified.

## Concrete visual review

Independent presentation agent: **33/40 critique (Good)**. Breakdown: status 4, terminology 4, control 3, consistency 4, prevention 3, recognition 3, efficiency 3, aesthetics 3, recovery 3, help 3.

Desktop audit: **16/20**: accessibility 2, performance 3, appearance 3, desktop conformance 4, adaptivity 4. The agent independently reviewed source and rendered fixtures; adaptivity also incorporates the parent's full-window CUA/input evidence. Scores express the evidence limits; they do not establish owner acceptance or top quality.

| Dimension | Rendered observation |
|---|---|
| Hierarchy | Objective, turn/orders and gate lead; three fronts and command cards read separately; the latest turn result remains visible. |
| Typography | Serif headings and legible sans rules preserve identity. Larger 17-pixel enemy HP/16-pixel intent fit existing badges; minimum-size prices and warnings remain readable. |
| Composition | Quiet world, adult illustrated company and paper command rail remain coherent. Move destinations, save warning and mastery rewards leave primary controls unobscured. |
| Identity | Banner & Steel's olive company, limestone terrain, warm paper and hostile brick remain consistent across reviewed battle, chest, shop, quest, manual and reward surfaces. |
| Interaction | Exact help return, target previews, invalid-action feedback, enabled focus fallback, actual mouse presses and Undo work. Costs describe real gold; unforgeable items are explicit. |
| Responsive | Supported desktop aspect ratios preserve proportions and controls; resized native input works at 1152×720. Mobile is not a supported surface. |

Advisory GDScript detector returns no findings; this is not native accessibility or aesthetic certification. No new composition or visual system is justified by the reviewed defects.

## Performance and gameplay limits

Native timing (`tests/measure_native.gd -- --pocket-demo`): 180 samples per scenario after 30 warm-up frames, on one host, with two retained runs. The table records the second run, without selecting only its favorable tails.

| Scenario | Mean frame ms | Median ms | p95 ms | Max ms |
|---|---:|---:|---:|---:|
| Battle idle | 16.53 | 17.42 | 31.85 | 37.82 |
| Attack/enemy turn/HUD rebuild | 20.37 | 19.74 | 34.76 | 38.78 |
| Full equipment chest | 16.97 | 17.21 | 33.43 | 39.55 |

Rebuild workload takes 10.05–13.29 ms and includes a model reset and multiple HUD rebuilds. Godot's TIME_PROCESS monitor is not isolated script CPU time. Files: `artifacts/quality-2026-10-02/native-timing.json` and `native-timing-first.json`. Host scheduling/display capture are uncontrolled; these measurements do not prove smooth 60 fps or justify a renderer rewrite. Further optimization needs a causal profile and paired same-workload evidence.

No-orders audit uses 27 battle starts legally earned through the opening/journey. All six main fights lose with no orders; a prepared Reliquary can win through equipped passive defense. A level-six company can survive low-tier siege contracts without actions, while other inspected contract cases lose. Evidence: `artifacts/quality-audit-baseline/no-orders-results.json`. This demonstrates preparation effects and low-tier farming, not balanced high-tier challenge. Attack-only legal play clears all six main encounters with varying gate loss; advanced tactics are optional in that route. Do not claim every tactical system is necessary or long-term balance is proven.

Human play must still determine whether progression, repeated formations and the rune's felt benefit remain enjoyable. Battle two's scaled enemy HP can mute the perceived +2 payoff despite the truthful preview. Distinct authored battle maps, soundtrack, VoiceOver traversal, a longer background soak and performance qualification remain future work; no new content promise is made.

## Workflow qualification

Current `.fleet/design-review.json` is v2, preserve lane, selected `banner-steel`; owner feedback is `not-required` for this bounded pass. Historical September receipt is `.fleet/banner-steel-design-review-2026-09-23.json`.

Preflight passes. `node ../saas-maker/tooling/scripts/design-workflow.mjs check --project . --json` exits 1 with exactly two findings: `missing required viewport 390` and `missing required viewport 768`. The policy currently requires 390/768/1440 widths for every platform. This native desktop game explicitly supports 1152×720 or larger. Actual screenshot widths are recorded truthfully; no mobile screenshots, fabricated scores or changes to shared policy are used to force green. The formal visual gate remains open because of those unsupported mobile requirements, separately from passing native review evidence.

The [design-workflow skill](/Users/sarthak/.agents/skills/design-workflow/SKILL.md) says: “Do not claim the meaningful visual change is complete until this command passes.” Source tests, packaged verification, actual native play and the Good review therefore remain separate from that formal gate and from owner acceptance.
