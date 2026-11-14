#!/bin/sh
set -eu
cd "$(dirname "$0")"
LOCAL_GAME_DIR=$(pwd)
LOCAL_ENGINE="$LOCAL_GAME_DIR/runtime/Godot.app/Contents/MacOS/Godot"
LOCAL_PACK="$LOCAL_GAME_DIR/War Chest.pck"
LOCAL_MODE="${1:-play}"
case "$LOCAL_MODE" in play|practice|check|verify) ;; *) echo "Use play, practice, check or verify." >&2; exit 2 ;; esac
if [ ! -x "$LOCAL_ENGINE" ] || [ ! -s "$LOCAL_PACK" ] || [ ! -s SHA256SUMS ]; then
  echo "The local game is incomplete. Keep the entire War Chest Local folder together." >&2
  exit 1
fi
if ! shasum -a 256 -c SHA256SUMS; then
  echo "A local game file is missing or changed. Rebuild before playing." >&2
  exit 1
fi
if [ "$LOCAL_MODE" = check ]; then
  echo "Local runtime, game pack and launchers verified. No game or save was opened."
  exit 0
fi
mkdir -p logs
LOCAL_LOG_DIR=$(mktemp -d "$LOCAL_GAME_DIR/logs/session.XXXXXX")
if [ "$LOCAL_MODE" = verify ]; then
  LOCAL_FAILURE=0
  for LOCAL_SUITE in journey journey_ui onboarding motion opening opening_boot stability pocket_ui story story_campaign story_ui story_slots command_preview crossing_story; do
    LOCAL_LOG="$LOCAL_LOG_DIR/$LOCAL_SUITE.log"
    case "$LOCAL_SUITE" in
      journey) LOCAL_MARKER='^JOURNEY TESTS: [0-9]+ checks, 0 failures$' ;;
      journey_ui) LOCAL_MARKER='^JOURNEY UI TESTS: [0-9]+ checks, 0 failures$' ;;
      onboarding) LOCAL_MARKER='^ONBOARDING TESTS: [0-9]+ checks, 0 failures$' ;;
      motion) LOCAL_MARKER='^MOTION TESTS: [0-9]+ checks, 0 failures$' ;;
      opening) LOCAL_MARKER='^OPENING TESTS: [0-9]+ checks, 0 failures$' ;;
      opening_boot) LOCAL_MARKER='^OPENING BOOT TESTS: [0-9]+ checks, 0 failures$' ;;
      stability) LOCAL_MARKER='^STABILITY TESTS: [0-9]+ checks, 0 failures$' ;;
      pocket_ui) LOCAL_MARKER='^POCKET UI TEST: 0 failures$' ;;
      story) LOCAL_MARKER='^STORY TESTS: [0-9]+ checks, 0 failures$' ;;
      story_campaign) LOCAL_MARKER='^STORY CAMPAIGN TESTS: [0-9]+ checks, 0 failures$' ;;
      story_ui) LOCAL_MARKER='^STORY UI TESTS: [0-9]+ checks, 0 failures$' ;;
      story_slots) LOCAL_MARKER='^STORY SLOT TESTS: [0-9]+ checks, 0 failures$' ;;
      command_preview) LOCAL_MARKER='^COMMAND PREVIEW TESTS: [0-9]+ checks, 0 failures$' ;;
      crossing_story) LOCAL_MARKER='^CROSSING STORY TESTS: [0-9]+ checks, 0 failures$' ;;
    esac
    # Preserve legacy demos; story presentation/slot callbacks need story isolation.
    set -- --pocket-demo
    if [ "$LOCAL_SUITE" = opening_boot ]; then set -- "$@" --banner-opening; fi
    if [ "$LOCAL_SUITE" = story ]; then set -- "$@" "--story-test-storage=$LOCAL_LOG_DIR/story-fixtures"; fi
    if [ "$LOCAL_SUITE" = story_ui ] || [ "$LOCAL_SUITE" = story_slots ] || [ "$LOCAL_SUITE" = crossing_story ]; then set -- --story-demo; fi
    if [ "$LOCAL_SUITE" = story_slots ]; then set -- "$@" "--story-slot-test-storage=$LOCAL_LOG_DIR/story-slot-fixtures"; fi
    if ! "$LOCAL_ENGINE" --headless --main-pack "$LOCAL_PACK" --log-file "$LOCAL_LOG_DIR/$LOCAL_SUITE-engine.log" \
      --script "res://tests/test_$LOCAL_SUITE.gd" -- "$@" > "$LOCAL_LOG" 2>&1; then
      echo "FAILED: packaged $LOCAL_SUITE exited unsuccessfully. Details: $LOCAL_LOG" >&2
      LOCAL_FAILURE=1
    fi
    cat "$LOCAL_LOG"
    if ! grep -Eq "$LOCAL_MARKER" "$LOCAL_LOG"; then
      echo "FAILED: packaged $LOCAL_SUITE did not report successful completion. Details: $LOCAL_LOG" >&2
      LOCAL_FAILURE=1
    fi
    if grep -Eq 'SCRIPT ERROR|Parse Error|Compile Error|ERROR:|FAIL:' "$LOCAL_LOG"; then
      echo "FAILED: packaged $LOCAL_SUITE reported an engine or test error. Details: $LOCAL_LOG" >&2
      LOCAL_FAILURE=1
    fi
  done
  echo "Verification logs: $LOCAL_LOG_DIR"
  if [ "$LOCAL_FAILURE" -ne 0 ]; then
    echo "Verification is not clean. Inspect the logs; no player save was opened."
    exit 1
  fi
  echo "Packaged gameplay checks passed. Native graphics/background stability still need a playtest."
  exit 0
fi
echo "Session log: $LOCAL_LOG_DIR/game.log"
if [ "$LOCAL_MODE" = practice ]; then
  echo "Practice: temporary progress only; existing saves and settings are untouched."
  exec "$LOCAL_ENGINE" --main-pack "$LOCAL_PACK" --log-file "$LOCAL_LOG_DIR/game.log" -- --story-demo
fi
echo "Campaign: resumes your story or original company and autosaves progress. A fresh company begins the story."
exec "$LOCAL_ENGINE" --main-pack "$LOCAL_PACK" --log-file "$LOCAL_LOG_DIR/game.log"
