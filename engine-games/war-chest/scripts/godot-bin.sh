#!/bin/sh
# Source from the project root. An explicit override must never silently fall back.
if [ -z "${GODOT_BIN:-}" ]; then
  for GODOT_CANDIDATE in \
    "$HOME/.cache/war-chest-godot-4.7.2/Godot.app/Contents/MacOS/Godot" \
    "$HOME/.cache/war-chest-godot-4.7.2/Godot_v4.7.2-stable_linux.x86_64" \
    /Users/sarthak/Downloads/war-chest-tools/Godot.app/Contents/MacOS/Godot \
    "$(pwd)/builds/War Chest Local/runtime/Godot.app/Contents/MacOS/Godot"; do
    if [ -x "$GODOT_CANDIDATE" ]; then GODOT_BIN="$GODOT_CANDIDATE"; break; fi
  done
  if [ -z "${GODOT_BIN:-}" ]; then
    GODOT_BIN=$(command -v godot 2>/dev/null || command -v godot4 2>/dev/null || true)
  fi
fi
if [ -z "${GODOT_BIN:-}" ] || [ ! -x "$GODOT_BIN" ]; then
  echo "Godot runtime is unavailable: ${GODOT_BIN:-no executable found}." >&2
  echo "Set GODOT_BIN to a Godot 4.7.x executable, or restore the local runtime bundle." >&2
  exit 1
fi
