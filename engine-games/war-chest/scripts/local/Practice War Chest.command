#!/bin/sh
cd "$(dirname "$0")" || exit 1
sh ./launch.sh practice
LOCAL_RESULT=$?
if [ "$LOCAL_RESULT" -ne 0 ] && [ -t 0 ]; then
  printf 'Practice stopped unexpectedly. See logs. Press Return to close. '
  read -r LOCAL_REPLY
fi
exit "$LOCAL_RESULT"
