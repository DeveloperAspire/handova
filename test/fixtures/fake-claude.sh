#!/bin/sh
# Stands in for claude in tests. Records each call, and reports a login for any
# config folder that has a "logged-in" file holding the email.
echo "${CLAUDE_CONFIG_DIR:-default} $*" >> "$HOME/claude-calls.log"
dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
if [ "$1 $2" = "auth status" ]; then
  if [ -f "$dir/logged-in" ]; then
    printf '{"loggedIn":true,"email":"%s","orgName":"Org of %s"}\n' "$(cat "$dir/logged-in")" "$(cat "$dir/logged-in")"
  else
    echo '{"loggedIn":false}'
  fi
fi
# "sleep" acts like an interactive session that survives Ctrl-C.
if [ "$1" = "sleep" ]; then
  trap 'echo interrupted >> "$HOME/claude-calls.log"' INT
  sleep 1; sleep 1
  echo finished >> "$HOME/claude-calls.log"
fi
[ "$1" = "--version" ] && echo "9.9.9 (Claude Code)"
exit 0
