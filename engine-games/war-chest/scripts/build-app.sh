#!/bin/sh
# Local convenience app; not a signed/notarized release or a Godot export.
set -eu
cd "$(dirname "$0")/.."
APP_SOURCE="${1:-builds/War Chest Local}"
APP_OUTPUT="${2:-War Chest.app}"
APP_MODE="${3:-play}"
case "$APP_MODE" in play|practice) ;; *) echo "Use play or practice." >&2; exit 2 ;; esac
if [ -e "$APP_OUTPUT" ]; then
  echo "App already exists; choose a new output path. Nothing was overwritten." >&2
  exit 1
fi
# Validate without starting the runtime or opening player data.
(cd "$APP_SOURCE" && /bin/sh launch.sh check)
test -f "$APP_SOURCE/runtime/Godot.app/Contents/Info.plist"
mkdir -p "$APP_OUTPUT/Contents/MacOS" "$APP_OUTPUT/Contents/Resources/Game"
cp scripts/local/app-launch.sh "$APP_OUTPUT/Contents/MacOS/WarChest"
cp scripts/local/app-info.plist "$APP_OUTPUT/Contents/Info.plist"
if [ "$APP_MODE" = practice ]; then
  cp scripts/local/practice-mode "$APP_OUTPUT/Contents/Resources/practice-mode"
  /usr/bin/plutil -replace CFBundleIdentifier -string local.warchest.practice "$APP_OUTPUT/Contents/Info.plist"
  /usr/bin/plutil -replace CFBundleDisplayName -string 'Practice War Chest' "$APP_OUTPUT/Contents/Info.plist"
  /usr/bin/plutil -replace CFBundleName -string 'Practice War Chest' "$APP_OUTPUT/Contents/Info.plist"
fi
chmod +x "$APP_OUTPUT/Contents/MacOS/WarChest"
APP_GAME="$APP_OUTPUT/Contents/Resources/Game"
# Deliberately exclude logs and any incidental files from the input folder.
for APP_FILE in 'War Chest.pck' launch.sh 'Play War Chest.command' \
  'Practice War Chest.command' 'Verify Local Game.command' SHA256SUMS \
  GODOT-NOTICES.txt content-manifest.json ASSET-PROVENANCE.md START-HERE.txt; do
  cp "$APP_SOURCE/$APP_FILE" "$APP_GAME/$APP_FILE"
done
mkdir -p "$APP_GAME/runtime"
ditto "$APP_SOURCE/runtime/Godot.app" "$APP_GAME/runtime/Godot.app"
(cd "$APP_GAME" && /bin/sh launch.sh check)
/usr/bin/plutil -lint "$APP_OUTPUT/Contents/Info.plist"
echo "Local app prepared: $APP_OUTPUT"
echo "Double-click in Finder. Mode: $APP_MODE. No Terminal window is needed. Existing saves are preserved."
echo "This local app is unsigned. Do not bypass macOS security warnings."
