#!/bin/sh
# Stands in for codex in tests. Records each call, and reports a login for any CODEX_HOME that has an auth.json,
# on stderr like the real one.
echo "${CODEX_HOME:-default} $*" >> "$HOME/codex-calls.log"
dir="${CODEX_HOME:-$HOME/.codex}"
if [ "$1 $2" = "login status" ]; then
  if [ -f "$dir/auth.json" ]; then echo "Logged in using ChatGPT" >&2; exit 0; fi
  echo "Not logged in" >&2; exit 1
fi
[ "$1" = "--version" ] && echo "codex-cli 9.9.9"
exit 0
