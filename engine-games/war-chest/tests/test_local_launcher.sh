#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
LOCAL_TEST_ROOT=$(mktemp -d /private/tmp/war-chest-launcher.XXXXXX)
LOCAL_FIXTURE="$LOCAL_TEST_ROOT/Game With Spaces"
mkdir -p "$LOCAL_FIXTURE/runtime/Godot.app/Contents/MacOS"
cp scripts/local/launch.sh "$LOCAL_FIXTURE/launch.sh"
cp tests/fixtures/local-engine.sh "$LOCAL_FIXTURE/runtime/Godot.app/Contents/MacOS/Godot"
chmod +x "$LOCAL_FIXTURE/runtime/Godot.app/Contents/MacOS/Godot"
printf 'test pack\n' > "$LOCAL_FIXTURE/War Chest.pck"
export WAR_CHEST_TEST_ARGS="$LOCAL_TEST_ROOT/arguments.txt"
cd "$LOCAL_FIXTURE"
shasum -a 256 'War Chest.pck' runtime/Godot.app/Contents/MacOS/Godot launch.sh > SHA256SUMS
sh launch.sh check > "$LOCAL_TEST_ROOT/check.log"
test ! -e "$WAR_CHEST_TEST_ARGS"
sh launch.sh practice > "$LOCAL_TEST_ROOT/practice.log"
grep -Fx -- '--story-demo' "$WAR_CHEST_TEST_ARGS"
grep -Fx -- "$LOCAL_FIXTURE/War Chest.pck" "$WAR_CHEST_TEST_ARGS"
grep -Fx -- '--log-file' "$WAR_CHEST_TEST_ARGS"
if grep -Eq -- '^--(pocket-demo|banner-opening)$' "$WAR_CHEST_TEST_ARGS"; then exit 1; fi
sh launch.sh play > "$LOCAL_TEST_ROOT/play.log"
if grep -Eq -- '^--(pocket-demo|story-demo|banner-opening)$' "$WAR_CHEST_TEST_ARGS"; then exit 1; fi
grep -Fx -- "$LOCAL_FIXTURE/War Chest.pck" "$WAR_CHEST_TEST_ARGS"
export WAR_CHEST_TEST_TRACE_DIR="$LOCAL_TEST_ROOT/verify-arguments"
mkdir -p "$WAR_CHEST_TEST_TRACE_DIR"
sh launch.sh verify > "$LOCAL_TEST_ROOT/verify.log" 2>&1
grep -Fq 'Packaged gameplay checks passed' "$LOCAL_TEST_ROOT/verify.log"
for LOCAL_SUITE in journey journey_ui onboarding motion opening opening_boot stability pocket_ui story story_campaign story_ui story_slots command_preview crossing_story; do
  if [ "$LOCAL_SUITE" = story_ui ] || [ "$LOCAL_SUITE" = story_slots ] || [ "$LOCAL_SUITE" = crossing_story ]; then
    grep -Fxq -- '--story-demo' "$WAR_CHEST_TEST_TRACE_DIR/$LOCAL_SUITE.args"
    if grep -Fq -- '--pocket-demo' "$WAR_CHEST_TEST_TRACE_DIR/$LOCAL_SUITE.args"; then exit 1; fi
  else
    grep -Fxq -- '--pocket-demo' "$WAR_CHEST_TEST_TRACE_DIR/$LOCAL_SUITE.args"
    if grep -Fq -- '--story-demo' "$WAR_CHEST_TEST_TRACE_DIR/$LOCAL_SUITE.args"; then exit 1; fi
  fi
  grep -Fxq -- "res://tests/test_$LOCAL_SUITE.gd" "$WAR_CHEST_TEST_TRACE_DIR/$LOCAL_SUITE.args"
  if [ "$LOCAL_SUITE" = opening_boot ]; then
    grep -Fxq -- '--banner-opening' "$WAR_CHEST_TEST_TRACE_DIR/$LOCAL_SUITE.args"
  elif grep -Fq -- '--banner-opening' "$WAR_CHEST_TEST_TRACE_DIR/$LOCAL_SUITE.args"; then exit 1; fi
  if [ "$LOCAL_SUITE" = story ]; then
    grep -Eq -- "^--story-test-storage=$LOCAL_FIXTURE/logs/session\.[^/]+/story-fixtures$" "$WAR_CHEST_TEST_TRACE_DIR/$LOCAL_SUITE.args"
  elif grep -Fq -- '--story-test-storage=' "$WAR_CHEST_TEST_TRACE_DIR/$LOCAL_SUITE.args"; then exit 1; fi
  if [ "$LOCAL_SUITE" = story_slots ]; then
    grep -Eq -- "^--story-slot-test-storage=$LOCAL_FIXTURE/logs/session\.[^/]+/story-slot-fixtures$" "$WAR_CHEST_TEST_TRACE_DIR/$LOCAL_SUITE.args"
  elif grep -Fq -- '--story-slot-test-storage=' "$WAR_CHEST_TEST_TRACE_DIR/$LOCAL_SUITE.args"; then exit 1; fi
done
for LOCAL_BAD_SUITE in journey pocket_ui story_campaign story_ui story_slots command_preview crossing_story; do
  for LOCAL_FAILURE_KIND in exit error marker; do
    LOCAL_FAILURE_LOG="$LOCAL_TEST_ROOT/verify-$LOCAL_BAD_SUITE-$LOCAL_FAILURE_KIND.log"
    if WAR_CHEST_TEST_FAIL_STAGE="$LOCAL_BAD_SUITE" WAR_CHEST_TEST_FAILURE="$LOCAL_FAILURE_KIND" sh launch.sh verify > "$LOCAL_FAILURE_LOG" 2>&1; then exit 1; fi
    grep -Fq "FAILED: packaged $LOCAL_BAD_SUITE" "$LOCAL_FAILURE_LOG"
    grep -Fq 'Verification logs:' "$LOCAL_FAILURE_LOG"
  done
done
unset WAR_CHEST_TEST_TRACE_DIR
LOCAL_BEFORE=$(shasum -a 256 "$WAR_CHEST_TEST_ARGS")
if sh launch.sh bad > "$LOCAL_TEST_ROOT/bad.log" 2>&1; then exit 1; else test "$?" -eq 2; fi
test "$LOCAL_BEFORE" = "$(shasum -a 256 "$WAR_CHEST_TEST_ARGS")"
mv 'War Chest.pck' 'War Chest.pck.saved'
if sh launch.sh practice > "$LOCAL_TEST_ROOT/missing.log" 2>&1; then exit 1; fi
grep -Fq 'local game is incomplete' "$LOCAL_TEST_ROOT/missing.log"
mv 'War Chest.pck.saved' 'War Chest.pck'
printf 'changed test pack\n' > 'War Chest.pck'
if sh launch.sh practice > "$LOCAL_TEST_ROOT/changed.log" 2>&1; then exit 1; fi
grep -Fq 'missing or changed' "$LOCAL_TEST_ROOT/changed.log"
test "$LOCAL_BEFORE" = "$(shasum -a 256 "$WAR_CHEST_TEST_ARGS")"
echo "LOCAL LAUNCHER: preflight, modes, fourteen-suite isolated verification, engine failure diagnostics, spaces, logging and missing/tampered pack passed"
echo "Isolated diagnostic fixtures retained at: $LOCAL_TEST_ROOT"
