# Release verification — 2026-09-23

Owner requested “verify and release.” This authorizes release work; it does not waive verification. Result: **HOLD — no release published**.

## Fresh checks

- All ten existing suites ran directly with isolated practice flags and explicit `/private/tmp/war-chest-release-<suite>.log` paths. All exited 0: base 75, siege 89, expansion 118, mastery 47, motion 34, onboarding 51, journey 174, journey UI 32; campaign and prior UI smoke suites also reported zero failures. Total numbered assertions: 620.
- The earned twelve-encounter journey and all fifteen contract/type-tier combinations pass. This is rules/progression evidence, not native rendering, human fun or crash-regression evidence.
- Current main scene ran headlessly for 600 frames with `--pocket-demo`, exited 0. No real player saves/settings used. This does not exercise macOS window creation or GPU rendering.
- Actual `sh scripts/check.sh` exited 1 during import: host `get_system_ca_certificates` error and inability to save Godot editor preferences. Direct suites also emit that certificate diagnostic. The strict check has not been bypassed or relabelled green.
- Shell syntax check passed for check/play scripts.
- Design receipt validation failed: no current screenshots, no current numeric critique/audit scores, and no passing strict project check. Its mobile widths do not qualify a native game; a current supported-desktop visual pass is still independently missing.

## Packaging and publication blockers

- No `export_presets.cfg`, export/build/release script or exported application exists in this repository.
- Installed Godot export-template directory is empty. macOS export templates must be installed before a normal standalone export can be produced.
- Three required generated images exist locally but are intentionally Git-ignored. Any distributable must include them; a source-only push would not produce a self-contained playable checkout. Their provenance is in ASSETS.md.
- No commit exists locally, and the connected GitHub repository metadata reports private visibility, default branch main and size 0. No release SHA/artifact exists to qualify.
- GitHub CLI cannot reach api.github.com in this shell. The connector can read the private repository and issue, but the attempted release-status issue comment was rejected: `MCP tool call requires approval, but approval policy is never`. No remote tracking update occurred; publication access is not available in this session.
- Native graphical/background-crash regression remains unverified. No new GUI launch was attempted following the prior macOS application-initialization failures; UI inventory found no running Godot window.

## Remaining release sequence

1. In a desktop-capable environment, run the strict check cleanly and exercise the native preparation → battle → reward → unlock loop, resume, idle/background stability and reduced motion in isolated practice storage.
2. Install matching official export templates; configure and build a self-contained macOS artifact with the three required images and Godot license notices. Keep signing/notarization status explicit.
3. Verify the exported artifact itself, then commit reviewed source to main, tag that exact revision, upload the private release artifact and verify its download. No public exposure intended.

No commit, push, tag, export, release or security-setting change performed in this attempt. Ship-check stops at its real-runtime verification requirement; unverified runtime is not promoted to a release.
