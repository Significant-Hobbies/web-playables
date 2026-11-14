#!/bin/sh
cd "$(dirname "$0")" || exit 1
if [ -f "builds/War Chest Local/Practice War Chest.command" ]; then
  exec sh "builds/War Chest Local/Practice War Chest.command"
fi
exec sh scripts/play.sh -- --pocket-demo --banner-opening
