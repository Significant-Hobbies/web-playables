# First-session onboarding and unlocks — September 23

Method: dual-agent (A: /root/onboarding_design_review; B: /root/onboarding_evidence_review). B held findings and detector output until A completed. Source-only review: no current rendered evidence, visual score or appearance acceptance. The current receipt explicitly leaves scores unknown rather than carrying the previous motion pass's 32/40 and 16/20 forward.

Preserve lane: Pocket Siege's existing objective strip, footer, card controls and reward text. Design-workflow/Impeccable onboard shaped contextual, optional lessons instead of a new tutorial surface; animate shaped two bounded focal effects. The native game remains mouse/keyboard, offline, personal, full-window and fully turn-based. No new runtime dependencies, art or engine migration.

## Review findings and fixes

- P2 fixed: storing Lysa's bow or losing Lysa could leave an impossible ranged instruction. Both now have specific recovery advice; skip remains visible.
- P2 fixed: level-one keep always claimed gear was packed. Preparation copy now checks all four starter placements.
- P2 fixed: target preview omitted stun. Storm, Freeze and Pin explicitly say they cancel the next enemy attack, alongside damage after armor.
- P3 fixed: selected-command lesson was mouse-only. It now explains T preview/F confirm and Esc/Z.
- Additional native layout test exposed zero-width initial Label wrapping creating enormous retained bounds. Setting the intended width before text fixes this. Level 2–6 reward copy and first-lesson footer have executable native layout-size assertions.
- P3 open: the first victory still exposes multiple progression concepts (banner choice, mastery, recruitment, talent and forge). Actionable unlock text prioritizes recruiting/packing, but human comprehension should determine further simplification.
- Error/undo messages temporarily take priority over lesson body; this intentionally preserves immediate feedback. Lesson heading remains and selection resumes guidance.

## Gameplay and motion evidence

51 onboarding assertions pass: real guided first victory, level two, affordable Merrin recruitment, free talent and staff requiring packing; completed/out-of-order lessons; invalid actions; undo; JSON round-trip; six malformed lesson values rejected atomically; legacy save compatibility; skip; missing equipment/fallen archer; native mouse previews; reduced motion; seal duration/no replay; text geometry.

Previously existing suites invoked directly with `--headless --log-file /private/tmp/war-chest-onboarding-<suite>.log` pass: 75 base checks, 89 siege, 118 expansion, 47 mastery, 34 motion; UI and campaign tests also report zero failures. Legal-action runs still win all six encounters and 15 contract/tier combinations. This is correctness and winnability evidence, not proof of human enjoyment or balance.

Cleave now adds a secondary gold stroke and a short four-ray impact burst at each actual target. Existing impact ordering, ghosts and reduced-motion handling remain. A gold level seal draws a closing blue ring and fading sparks, finishing in 0.65s. It ignores pointer input, never blocks selection, does not replay during reward inspection, and becomes static under reduced motion. The native scripts run in headless tests; visual quality and frame pacing are not verified.

## Boundaries

The host now runs restricted. The prior graphical launch aborted during macOS NSApplication initialization before game loading; no further graphical launches were attempted in this task. No native after screenshots; old motion screenshots are before-only evidence. Native layout-size assertions are not screenshots or manual interaction proof. VoiceOver and non-16:10 adaptation remain unqualified.

Every Godot headless invocation reports a system-CA read error; editor import additionally cannot save editor settings outside writable roots. Assertions run and pass, but the strict `scripts/check.sh` error gate must not be labelled green in this host. Synthetic save tests now use ignored workspace test files rather than the real player-data directory. Player saves/settings were not read or written.

GitHub issue read failed with `error connecting to api.github.com`; existing issue #1 could not be updated. No new local specification replaces that issue; this file records implemented behavior and verification only. No commits, pushes, deployments or releases.

## Review provenance

Target: scripts/pocket_main.gd; helper-derived slug: scripts-pocket-main-gd. No critique ignore file found. A reviewed design clarity, cognitive load, progression and animation source. B ran the explicit-file generic detector exactly once: exit 0, JSON [], zero rules/locations. This text scan does not understand Godot native rendering. No browser, DOM overlay, injection, local server or detector temporary files were applicable. Questions skipped: fixes were concrete and within the requested scope. Current numeric visual score/trend deliberately not claimed without rendered evidence.
