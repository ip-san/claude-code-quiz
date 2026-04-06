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
    echo "BLOCK: git reset --hard detected. Use git stash or git checkout for specific files." >&2
    exit 2 ;;
  *'git clean -f'*)
    echo "BLOCK: git clean -f detected. Review untracked files first." >&2
    exit 2 ;;
  *'git push --force'*|*'git push -f '*)
    echo "BLOCK: force push detected. Coordinate with team before force pushing." >&2
    exit 2 ;;
  *'git checkout -- .'*)
    echo "BLOCK: git checkout -- . would discard all changes. Use specific file paths." >&2
    exit 2 ;;
  *)
    exit 0 ;;
esac
