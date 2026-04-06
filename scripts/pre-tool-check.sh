#!/bin/bash
# PreToolUse hook: block destructive Bash commands
# Reads tool input from stdin, checks command safety

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

[ -z "$CMD" ] && exit 0

case "$CMD" in
  *'rm -rf'*)
    echo "BLOCK: rm -rf detected. Use targeted rm instead." >&2
    exit 2 ;;
  *'git reset --hard'*)
    echo "BLOCK: git reset --hard. Use git stash or checkout specific files." >&2
    exit 2 ;;
  *'git clean -f'*)
    echo "BLOCK: git clean -f. Review untracked files first with git status." >&2
    exit 2 ;;
  *'git push --force'*|*'git push -f '*)
    echo "BLOCK: force push. Coordinate with team before force pushing." >&2
    exit 2 ;;
  *'git checkout -- .'*|*'git restore .'*)
    echo "BLOCK: would discard all changes. Use specific file paths." >&2
    exit 2 ;;
  *'drop table'*|*'DROP TABLE'*|*'truncate '*)
    echo "BLOCK: destructive SQL detected." >&2
    exit 2 ;;
  *'> /dev/null 2>&1 &'*|*'nohup'*)
    # Warn about background daemon processes (not block)
    echo "⚠️ Background process detected. Ensure it will be cleaned up." >&2
    exit 0 ;;
  *)
    exit 0 ;;
esac
