#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
APP_TEST_ROOT=$(mktemp -d /private/tmp/war-chest-app.XXXXXX)
APP_FIXTURE="$APP_TEST_ROOT/Bundle With Spaces"
mkdir -p "$APP_FIXTURE/runtime/Godot.app/Contents/MacOS"
cp scripts/local/launch.sh "$APP_FIXTURE/launch.sh"
cp tests/fixtures/local-engine.sh "$APP_FIXTURE/runtime/Godot.app/Contents/MacOS/Godot"
cp scripts/local/app-info.plist "$APP_FIXTURE/runtime/Godot.app/Contents/Info.plist"
chmod +x "$APP_FIXTURE/runtime/Godot.app/Contents/MacOS/Godot"
for APP_FILE in 'War Chest.pck' 'Play War Chest.command' 'Practice War Chest.command' \
  'Verify Local Game.command' GODOT-NOTICES.txt content-manifest.json ASSET-PROVENANCE.md START-HERE.txt; do
  cp tests/fixtures/local-engine.sh "$APP_FIXTURE/$APP_FILE"
done
(cd "$APP_FIXTURE" && shasum -a 256 'War Chest.pck' runtime/Godot.app/Contents/MacOS/Godot launch.sh > SHA256SUMS)
export WAR_CHEST_TEST_ARGS="$APP_TEST_ROOT/arguments.txt"
APP_BUILT="$APP_TEST_ROOT/War Chest.app"
sh scripts/build-app.sh "$APP_FIXTURE" "$APP_BUILT" > "$APP_TEST_ROOT/build.log"
test ! -e "$WAR_CHEST_TEST_ARGS"
test -x "$APP_BUILT/Contents/MacOS/WarChest"
# Test relocation and independence from the source bundle. Only the fake engine runs.
mv "$APP_BUILT" "$APP_TEST_ROOT/Relocated Game.app"
mv "$APP_FIXTURE" "$APP_TEST_ROOT/Original Bundle Moved"
APP_BUILT="$APP_TEST_ROOT/Relocated Game.app"
(cd /private/tmp && "$APP_BUILT/Contents/MacOS/WarChest")
grep -Fx -- "$APP_BUILT/Contents/Resources/Game/War Chest.pck" "$WAR_CHEST_TEST_ARGS"
if grep -Eq -- '^--(pocket-demo|story-demo|banner-opening)$' "$WAR_CHEST_TEST_ARGS"; then exit 1; fi
test -d "$APP_BUILT/Contents/Resources/Game/logs"
APP_BEFORE=$(shasum -a 256 "$APP_BUILT/Contents/MacOS/WarChest")
if sh scripts/build-app.sh "$APP_TEST_ROOT/Original Bundle Moved" "$APP_BUILT" > "$APP_TEST_ROOT/refused.log" 2>&1; then exit 1; fi
test "$APP_BEFORE" = "$(shasum -a 256 "$APP_BUILT/Contents/MacOS/WarChest")"
grep -Fq 'Nothing was overwritten' "$APP_TEST_ROOT/refused.log"
sh scripts/build-app.sh "$APP_TEST_ROOT/Original Bundle Moved" "$APP_TEST_ROOT/Practice Game.app" practice > "$APP_TEST_ROOT/practice-build.log"
"$APP_TEST_ROOT/Practice Game.app/Contents/MacOS/WarChest"
grep -Fx -- '--story-demo' "$WAR_CHEST_TEST_ARGS"
if grep -Eq -- '^--(pocket-demo|banner-opening)$' "$WAR_CHEST_TEST_ARGS"; then exit 1; fi
test "$(/usr/bin/plutil -extract CFBundleIdentifier raw "$APP_TEST_ROOT/Practice Game.app/Contents/Info.plist")" = local.warchest.practice
echo "APP LAUNCHER: plist, no-start preflight, relocation, spaces, campaign/practice modes, logs and overwrite refusal passed"
echo "Fixtures retained at $APP_TEST_ROOT"
