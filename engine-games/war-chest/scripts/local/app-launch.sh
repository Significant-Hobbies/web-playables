#!/bin/sh
# Finder launches this without opening Terminal. Never changes engine signing.
set -u
APP_CONTENTS=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
APP_GAME="$APP_CONTENTS/Resources/Game"
APP_MODE=play
if [ -f "$APP_CONTENTS/Resources/practice-mode" ]; then APP_MODE=practice; fi
APP_LOG=$(mktemp /private/tmp/war-chest-start.XXXXXX)
if /bin/sh "$APP_GAME/launch.sh" "$APP_MODE" > "$APP_LOG" 2>&1; then
  exit 0
fi
# Pass the path as an argument, never interpolate file contents into AppleScript.
/usr/bin/osascript - "$APP_LOG" <<'APP_ALERT'
on run arguments
  display alert "War Chest could not start or stopped unexpectedly" message ("Your saved campaign has not been reset. Startup details are at:" & return & item 1 of arguments & return & return & "Keep this log when reporting the problem. Do not bypass a macOS security warning.") as critical buttons {"OK"} default button "OK"
end run
APP_ALERT
exit 1
