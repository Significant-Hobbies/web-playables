# Banner & Steel — local implementation evidence

September 23, 2026. Owner selected refined direction A. Implemented on the existing local main checkout without committing, pushing or releasing. Issue #1 was verified readable; remote status writes remain unavailable under the prior session denial.

## Delivered

- Flat adult-proportioned company art, warm stone/olive battlefield, restrained square controls, serif headings and readable sans rules. Actual enemy power/intent stays visible. Original concept images are direction evidence, not native captures.
- Fresh campaigns enter the first defense directly. Victory earns one unpacked storm rune; legal adjacent packing leads straight to battle two and its real +2 damage payoff. The first reward defers banner drafting. After the second victory normal broader progression is exposed; an explicit opt-out retains existing unlock requirements.
- Validated optional opening state, idempotent rewards and Undo support. Existing saves retain their state/access and are not enrolled or reset.
- Self-contained local campaign and Practice app bundles. Practice runs the new opening without reading/writing saves/settings. Previous local app and bundle are preserved under `builds/`.
- Generated production artwork and exact prompts documented in `ASSETS.md` and `assets/banner-steel-prompts.md`. No new production dependency, external copied artwork or Blender requirement.

## Checks

Thirteen source suites passed assertions: game 75, siege 89, expansion 118, mastery 47, motion 34, onboarding 51, journey 174, journey UI 32, stability 177, opening 90 and opening boot 1, plus campaign and pocket UI smoke suites. Total numbered assertions: 888. These include legal-action completion of all six main battles and six side quests, without forced contract grinding.

Six packed suites ran outside the checkout: journey 174, journey UI 32, motion 34, onboarding 51, opening 90 and opening boot 1. Total: 382 assertions. App and command fixture tests, plist validation and SHA-256 manifests pass. Both finished app bundles passed integrity checks after relocation. The packaged Practice main scene also exited 0 after 600 headless frames.

Final source-to-artifact comparison: all 27 content-manifest SHA-256 entries match current source files in both apps. Receipt and design-sidecar JSON parse successfully.

Final stability rerun: 177 assertions, 40 battle/navigation cycles, warmed scene nodes flat at 41, and 15 seconds of real idle. This is headless evidence only, not a native/background-crash clearance.

Independent read-only design and interaction reviewers reported no unresolved P0/P1. Their concrete findings led to corrections for the chest's last-row overlap, hints targeting a fallen hero or unavailable command, lost command-card keyboard focus, and long-name enemy hit targets growing beyond their visual region. New assertions cover these fixes. Source-only review cannot supply honest native visual scores.

One advisory detector run returned zero findings. Its generic GDScript scan does not establish layout, accessibility or visual quality.

## Qualification limits

Strict `scripts/check.sh` remains failing: the host emits the existing macOS system-CA diagnostic; editor import also cannot write host editor preferences. Direct engine assertion runs exit 0 but are not clean-log verification. These diagnostics were not filtered out of the strict check.

Native screenshots, font rendering, Finder launch of the updated app wrappers, failure-alert rendering, animation quality, the reported background crash and human fun/balance remain unverified. Prior Godot Computer Use denial was not bypassed; no GUI was launched. Design-workflow completion remains on hold without native evidence, honest critique/audit scores and a clean project check. Desktop-native scope does not justify fabricated mobile-width screenshots or web-library references.

Final `design-workflow.mjs check --project /Users/sarthak/Desktop/fleet/war-chest` exited 1: exact upstream component URL, 390/768/1440 viewport evidence, critique/audit scores and a passing named project check are absent. Owner selection itself is recorded and accepted by the gate. The first two requirements reflect the checker’s web-oriented schema; the remaining qualification gaps are real and remain open.

The bundles use the unchanged existing Godot runtime. They are unsigned local convenience apps, not notarized standalone exports. No security settings or signing changes; do not bypass macOS warnings. No real player save was accessed by tests.

## Local playtest

Close an older running game window first. Double-click `Practice War Chest.app` to try the opening with temporary progress; use `War Chest.app` for the existing campaign. Keep each app in a writable local folder because its session logs live inside the bundle. Observe first battle, rune reward, packing, second battle, then background/resume behavior. Owner feedback on these native states is still required before visual acceptance or release.
