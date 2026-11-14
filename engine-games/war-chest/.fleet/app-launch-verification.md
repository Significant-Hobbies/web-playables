# Local app launcher — September 23, 2026

Update: both `War Chest.app` and the isolated `Practice War Chest.app` now contain the selected Banner & Steel build. Practice starts the new opening without reading/writing player saves or settings. Updated fixtures cover practice arguments and distinct bundle identity. Post-build and post-relocation integrity checks pass. Earlier artifacts remain under `builds/`. See [current implementation evidence](banner-steel-review.md); the notes below describe the original launcher increment.

Artifact: `/Users/sarthak/Desktop/fleet/war-chest/War Chest.app`.

The owner confirmed the earlier Practice command opens the game. This artifact addresses launch friction only. It does not claim a crash fix, new gameplay, native visual acceptance, code signing or notarization.

## Changes

- `scripts/build-app.sh`: wraps a verified local bundle as a self-contained macOS application; copies an explicit file list plus the unchanged Godot app. Refuses existing output paths.
- `scripts/local/app-info.plist`: Finder application metadata; launcher is background-only while the child Godot game owns the game window.
- `scripts/local/app-launch.sh`: resolves its own resources, redirects startup output to a unique temp log, runs normal campaign mode without Terminal, and alerts on nonzero exit with the log path. Existing per-session engine logs remain under `Contents/Resources/Game/logs`.
- No save paths, game pack content, runtime binary, signing or quarantine attributes intentionally changed. App should be kept in a writable local folder because the existing bundled runner writes session logs inside itself. It is not a system-wide installer.

## Evidence

- `sh tests/test_app_launcher.sh` — pass. Fake engine only; no player data access. Plist, permission, preflight, relocation with source removed from its original path, space-safe paths, campaign mode, logging, overwrite refusal.
- `sh tests/test_local_launcher.sh` — pass. Practice/play, checks, missing/tampered pack, invalid mode.
- `sh -n scripts/build-app.sh scripts/local/app-launch.sh tests/test_app_launcher.sh` — pass.
- `sh scripts/build-app.sh` — pass. Source and destination pack/runtime/manifests checksums match; `/usr/bin/plutil -lint` passes.
- Diagnostic test fixtures: `/private/tmp/war-chest-app.wNEpji`, `/private/tmp/war-chest-launcher.aoTHjs`.

## Not verified

Finder launch of this new wrapper, the failure alert's native rendering, and background stability. Prior Computer Use denial and macOS GUI initialization restrictions were not bypassed. The runtime's previously recorded signature/host diagnostics remain unresolved. Nothing published or released.
