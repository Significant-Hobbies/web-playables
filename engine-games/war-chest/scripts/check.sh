#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
. ./scripts/godot-bin.sh
CHECK_LOG_DIR=$(mktemp -d "${TMPDIR:-/tmp}/war-chest-check.XXXXXX")
echo "Runtime: $GODOT_BIN"
echo "Check logs: $CHECK_LOG_DIR"

run_check() {
  CHECK_STAGE=$1
  CHECK_MARKER=$2
  shift 2
  CHECK_LOG="$CHECK_LOG_DIR/$CHECK_STAGE.log"
  CHECK_STATUS=0
  echo "Checking $CHECK_STAGE..."
  "$GODOT_BIN" --headless --path . --log-file "$CHECK_LOG_DIR/$CHECK_STAGE-engine.log" "$@" > "$CHECK_LOG" 2>&1 || CHECK_STATUS=$?
  cat "$CHECK_LOG"
  if [ "$CHECK_STATUS" -ne 0 ]; then
    echo "FAILED: $CHECK_STAGE exited $CHECK_STATUS. Details: $CHECK_LOG" >&2
    exit 1
  fi
  if grep -Eq 'SCRIPT ERROR|Parse Error|Compile Error|ERROR:|FAIL:' "$CHECK_LOG"; then
    echo "FAILED: $CHECK_STAGE reported an engine or test error. Details: $CHECK_LOG" >&2
    exit 1
  fi
  if [ -n "$CHECK_MARKER" ] && ! grep -Eq "$CHECK_MARKER" "$CHECK_LOG"; then
    echo "FAILED: $CHECK_STAGE did not report its successful completion. Details: $CHECK_LOG" >&2
    exit 1
  fi
}

run_check import '' --editor --import --quit
run_check game '^RULE TESTS: [0-9]+ checks, 0 failures$' --script tests/test_game.gd
run_check campaign '^CAMPAIGN TEST: 0 failures$' --script tests/test_campaign.gd
run_check siege '^SIEGE TESTS: [0-9]+ checks, 0 failures$' --script tests/test_siege.gd
run_check pocket_ui '^POCKET UI TEST: 0 failures$' --script tests/test_pocket_ui.gd -- --pocket-demo
run_check expansion '^EXPANSION TESTS: [0-9]+ checks, 0 failures$' --script tests/test_expansion.gd
run_check mastery '^MASTERY TESTS: [0-9]+ checks, 0 failures$' --script tests/test_mastery.gd
run_check motion '^MOTION TESTS: [0-9]+ checks, 0 failures$' --script tests/test_motion.gd -- --pocket-demo
run_check onboarding '^ONBOARDING TESTS: [0-9]+ checks, 0 failures$' --script tests/test_onboarding.gd -- --pocket-demo
run_check journey '^JOURNEY TESTS: [0-9]+ checks, 0 failures$' --script tests/test_journey.gd
run_check journey_ui '^JOURNEY UI TESTS: [0-9]+ checks, 0 failures$' --script tests/test_journey_ui.gd -- --pocket-demo
run_check stability '^STABILITY TESTS: [0-9]+ checks, 0 failures$' --script tests/test_stability.gd -- --pocket-demo
run_check opening '^OPENING TESTS: [0-9]+ checks, 0 failures$' --script tests/test_opening.gd -- --pocket-demo
run_check opening_boot '^OPENING BOOT TESTS: [0-9]+ checks, 0 failures$' --script tests/test_opening_boot.gd -- --pocket-demo --banner-opening
run_check story '^STORY TESTS: [0-9]+ checks, 0 failures$' --script tests/test_story.gd -- "--story-test-storage=$CHECK_LOG_DIR/story-fixtures"
run_check story_campaign '^STORY CAMPAIGN TESTS: [0-9]+ checks, 0 failures$' --script tests/test_story_campaign.gd
run_check story_ui '^STORY UI TESTS: [0-9]+ checks, 0 failures$' --script tests/test_story_ui.gd -- --story-demo
run_check story_slots '^STORY SLOT TESTS: [0-9]+ checks, 0 failures$' --script tests/test_story_slots.gd -- --story-demo "--story-slot-test-storage=$CHECK_LOG_DIR/story-slot-fixtures"
run_check command_preview '^COMMAND PREVIEW TESTS: [0-9]+ checks, 0 failures$' --script tests/test_command_preview.gd
run_check crossing_story '^CROSSING STORY TESTS: [0-9]+ checks, 0 failures$' --script tests/test_crossing_story.gd -- --story-demo
sh tests/test_check_runner.sh
sh tests/test_local_launcher.sh
sh tests/test_app_launcher.sh
echo "CHECKS PASSED: source import, 19 game suites and isolated runner/launcher checks. Logs: $CHECK_LOG_DIR"
