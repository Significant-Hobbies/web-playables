#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
. ./scripts/godot-bin.sh
exec "$GODOT_BIN" --path . "$@"
