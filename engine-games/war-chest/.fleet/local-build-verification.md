# Local play bundle — 2026-09-23

Owner scope: “at least make it ready locally.” Delivered a self-contained local runner at `builds/War Chest Local`, not a public/private remote release or a standalone notarized export. No gameplay/visual changes, dependency additions, commits or player-save access.

## Artifact

- Existing Godot.app copied unmodified into `runtime/`; no Downloads-path dependency at runtime.
- `War Chest.pck`: explicit 27-file closure of current rules/UI, scene/config, three source images with their imported textures, and four isolated test scripts. No old prototypes, player data, configuration secrets or editor cache wholesale.
- Play, Practice and Verify double-click launchers. Source-root launchers prefer this bundle. Play uses the existing save namespace; Practice passes `--pocket-demo` and cannot read/write the normal save/settings.
- Integrity manifest, per-session logs, quick-start instructions, asset provenance, complete Godot/third-party license notices from the bundled engine.
- Builder never overwrites an existing build; failures do not create a successful integrity manifest. No export template required for this local-runner approach.

## Executed verification

- `sh scripts/build-local.sh`: success; 27 packed files, checksum verification passed.
- Same build command again: expected exit1, refusing to overwrite existing bundle.
- `sh tests/test_local_launcher.sh`: passed preflight, both launch modes, space-safe paths, log argument, invalid mode, missing pack and checksum mismatch. Uses a test double only to prove launch arguments, not native game behavior. Test fixture location printed; no player data used.
- `sh builds/War\ Chest\ Local/launch.sh verify` launched from `/private/tmp`: all four packed test scripts ran, 174 + 32 + 51 + 34 = 291 assertions pass. Verifier correctly returned1 because the host emitted its existing system-CA ERROR. No errors hidden or ignored.
- Bundled runtime with `--main-pack` and `--pocket-demo` ran the actual packed main scene from `/private/tmp` for 600 frames, exit0. Still the same host CA diagnostic. No source tree resource fallback errors.
- GDScript packer checked with Godot `--check-only --script scripts/pack_local.gd`: exit0. Shell scripts checked with `sh -n`: exit0. An initial accidental shell syntax check against the GDScript file was invalid and was replaced with the proper engine check; not a source defect.
- `codesign --verify --deep --strict` fails on both installed and copied Godot.app: invalid signature in arm64. Signature inspection reports authority unavailable; cause is not established. Original ZIP executable, installed executable and bundled executable all have SHA-256 `c7cccbf8fb143e34e02fd6521e09be2c2b974f0d5db080b19071c9c570718ccf`. No modification/re-signing/security bypass performed. This is not Gatekeeper acceptance or notarization proof.

## Remaining boundary

No native GUI launch in this restricted session because prior macOS application initialization attempts failed. Local package is assembled and its headless behavior is exercised, but native window rendering, audio, background stability and security acceptance still need a desktop playtest. Strict repository check remains blocked by the certificate/editor-preference host errors, as recorded in release-verification.md. No release claim.

## Follow-up stability verification

The normal Computer Use launch was explicitly denied with `Computer Use was not approved to use Godot`. No alternate UI/terminal path was used to bypass that denial. Asked the owner to open the Practice launcher and report whether the game opens, shows a security warning, or closes/errors; no response was available when recording this check.

Added `tests/test_stability.gd` and included it in the repository check script. It requires `--pocket-demo` and mutes test audio. Both source and existing packaged runtime pass 177 assertions: forty actual UI-controller battle/navigation cycles; exact attack/undo and move/undo state restoration; navigation cancels motion; five seconds of keep idle plus ten seconds of battle idle cause no progression mutation; twelve scene closures during animation free their scene and leave no orphan-node growth. Warmed live-node count stays at 41 through all cycles. Idle elapsed time was 15,001 ms in each run.

Packaged command ran from `/private/tmp`, using the bundled Godot executable and `--main-pack` against `War Chest.pck`; the new external diagnostic script preloaded the game's resources from that pack. No game code or bundle content changed, so the existing bundle's four internal verification suites remain 291 assertions; these additional 177 checks are a separate source diagnostic against that same bundle. Logs: `/private/tmp/war-chest-stability-first.log` and `/private/tmp/war-chest-packed-stability.log`. Both processes exit0 with the existing host certificate ERROR.

`sh scripts/check.sh` was rerun after adding the test; it still exits1 during import because of certificate/editor-preference host errors. This is bounded headless lifecycle evidence, not a reproduction or fix of the reported native background crash, an RSS/memory-leak certification, or a successful native launch. No speculative gameplay changes were made.

The but-for-real skill drove testing of the actual package from outside the source folder and failure-path tests instead of relying on source-only assertions. XcodeBuildMCP was inspected but does not own this Godot build; no Xcode project or Xcode commands were introduced. Spec-driven was considered and skipped for build/config-only scope. Packaging API references: [PCKPacker](https://docs.godotengine.org/en/stable/classes/class_pckpacker.html), [Engine license notices](https://docs.godotengine.org/en/stable/classes/class_engine.html).
