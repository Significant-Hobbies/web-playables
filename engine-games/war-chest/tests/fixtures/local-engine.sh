#!/bin/sh
# Test double for launch/check failures. Never starts Godot or accesses saves.
set -eu
if [ -n "${WAR_CHEST_TEST_ARGS:-}" ]; then printf '%s\n' "$@" > "$WAR_CHEST_TEST_ARGS"; fi
TEST_STAGE=import
TEST_NEXT_SCRIPT=false
for TEST_ARG in "$@"; do
  if [ "$TEST_NEXT_SCRIPT" = true ]; then
    TEST_STAGE=${TEST_ARG##*/}
    TEST_STAGE=${TEST_STAGE#test_}
    TEST_STAGE=${TEST_STAGE%.gd}
    TEST_NEXT_SCRIPT=false
  fi
  if [ "$TEST_ARG" = --script ]; then TEST_NEXT_SCRIPT=true; fi
done
if [ -n "${WAR_CHEST_TEST_TRACE_DIR:-}" ]; then printf '%s\n' "$@" > "$WAR_CHEST_TEST_TRACE_DIR/$TEST_STAGE.args"; fi
if [ "$TEST_STAGE" = "${WAR_CHEST_TEST_FAIL_STAGE:-}" ]; then
  case "${WAR_CHEST_TEST_FAILURE:-exit}" in
    exit) echo "Fixture engine refused $TEST_STAGE" >&2; exit 9 ;;
    error) echo 'ERROR: fixture engine error' >&2 ;;
    marker) echo 'OTHER TESTS: 1 checks, 0 failures'; exit 0 ;;
  esac
fi
case "$TEST_STAGE" in
  import) ;;
  game) echo 'RULE TESTS: 1 checks, 0 failures' ;;
  campaign) echo 'CAMPAIGN TEST: 0 failures' ;;
  pocket_ui) echo 'POCKET UI TEST: 0 failures' ;;
  journey_ui) echo 'JOURNEY UI TESTS: 1 checks, 0 failures' ;;
  opening_boot) echo 'OPENING BOOT TESTS: 1 checks, 0 failures' ;;
  story_campaign) echo 'STORY CAMPAIGN TESTS: 1 checks, 0 failures' ;;
  story_ui) echo 'STORY UI TESTS: 1 checks, 0 failures' ;;
  story_slots) echo 'STORY SLOT TESTS: 1 checks, 0 failures' ;;
  command_preview) echo 'COMMAND PREVIEW TESTS: 1 checks, 0 failures' ;;
  crossing_story) echo 'CROSSING STORY TESTS: 1 checks, 0 failures' ;;
  *) printf '%s TESTS: 1 checks, 0 failures\n' "$(printf '%s' "$TEST_STAGE" | tr '[:lower:]' '[:upper:]')" ;;
esac
