#!/bin/sh
cd "$(dirname "$0")" || exit 1
sh ./launch.sh verify
LOCAL_RESULT=$?
if [ -t 0 ]; then
  printf 'Verification finished. Press Return to close. '
  read -r LOCAL_REPLY
fi
exit "$LOCAL_RESULT"
