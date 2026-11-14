#!/bin/sh
cd "$(dirname "$0")" || exit 1
sh ./launch.sh play
LOCAL_RESULT=$?
if [ "$LOCAL_RESULT" -ne 0 ] && [ -t 0 ]; then
  printf 'The game could not start or stopped unexpectedly. See logs. Press Return to close. '
  read -r LOCAL_REPLY
fi
exit "$LOCAL_RESULT"
