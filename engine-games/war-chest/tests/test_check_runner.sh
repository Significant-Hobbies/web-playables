#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
CHECK_TEST_ROOT=$(mktemp -d /private/tmp/war-chest-check-runner.XXXXXX)
if GODOT_BIN="$CHECK_TEST_ROOT/Missing Godot" sh scripts/check.sh > "$CHECK_TEST_ROOT/missing.log" 2>&1; then exit 1; fi
grep -Fq 'Godot runtime is unavailable:' "$CHECK_TEST_ROOT/missing.log"
grep -Fq 'Set GODOT_BIN' "$CHECK_TEST_ROOT/missing.log"

cp tests/fixtures/local-engine.sh "$CHECK_TEST_ROOT/Fixture Godot"
chmod +x "$CHECK_TEST_ROOT/Fixture Godot"
for CHECK_FAILURE_KIND in exit error marker; do
  if GODOT_BIN="$CHECK_TEST_ROOT/Fixture Godot" WAR_CHEST_TEST_FAIL_STAGE=game WAR_CHEST_TEST_FAILURE="$CHECK_FAILURE_KIND" sh scripts/check.sh > "$CHECK_TEST_ROOT/$CHECK_FAILURE_KIND.log" 2>&1; then exit 1; fi
  grep -Fq 'FAILED: game' "$CHECK_TEST_ROOT/$CHECK_FAILURE_KIND.log"
  CHECK_RETAINED=$(sed -n 's/^Check logs: //p' "$CHECK_TEST_ROOT/$CHECK_FAILURE_KIND.log")
  test -s "$CHECK_RETAINED/game.log"
done
if GODOT_BIN="$CHECK_TEST_ROOT/Fixture Godot" WAR_CHEST_TEST_FAIL_STAGE=import sh scripts/check.sh > "$CHECK_TEST_ROOT/import.log" 2>&1; then exit 1; fi
grep -Fq 'Fixture engine refused import' "$CHECK_TEST_ROOT/import.log"
grep -Fq 'FAILED: import exited 9.' "$CHECK_TEST_ROOT/import.log"
echo "CHECK RUNNER: missing engine, failed import, nonzero exit, engine error, wrong completion marker and retained diagnostics passed"
echo "Isolated fixtures retained at: $CHECK_TEST_ROOT"
