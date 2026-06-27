#!/usr/bin/env sh
# Capx Casa SessionStart advisor.
# Prints the current company status and next action before the first turn.
# Dependency-free on purpose (no jq). Reads a plain-text snapshot the router keeps.

NOW="company-brain/NOW.md"

printf '\n=== Capx Casa ===\n'
if [ -f "$NOW" ]; then
  cat "$NOW"
  if grep -q "Loops due now" "$NOW" 2>/dev/null; then
    printf '\nRun /casa-priority to re-evaluate and clear what is due, or /casa-next to act.\n'
  else
    printf '\nRun /casa-priority to re-evaluate, /casa-next for your next action, or /casa-map for the plan.\n'
  fi
else
  printf 'No company in this directory yet.\n'
  printf 'Run /casa-start to set up your company, whether it is an idea or already running.\n'
fi
printf '=================\n\n'
exit 0
