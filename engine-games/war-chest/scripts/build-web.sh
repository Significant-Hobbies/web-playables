#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
. ./scripts/godot-bin.sh
mkdir -p dist/web
touch dist/.gdignore
"$GODOT_BIN" --headless --path . --editor --import --quit
"$GODOT_BIN" --headless --path . --export-release Web dist/web/index.html
cp assets/banner-steel/lantern-gate.png dist/web/cover.png
node ../../scripts/compress-war-chest.mjs
