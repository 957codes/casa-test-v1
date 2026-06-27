---
name: casa-next
description: The always-on advisor. Returns the single next best action for the company, chosen for THIS founder by weighing the engine's eligible candidates against the founder's pulse (their stated focus and what they are not doing yet), with a one-line why. Use when the user asks what is next, what should I do, says casa next, or at the start of a working session.
---

# casa-next

The recommender. The engine decides what is ELIGIBLE; this skill decides what is WISE
for this founder right now, and explains it. It never recommends a wall of tasks and
never a bare table.

## Steps

1. Read state. Load `company-brain/NOW.md`, `profile.json`, `build-map.json`, `pulse.json`
   (the founder's focus, anti-priorities, and weights), recent files in `decisions/`, and
   `learnings.jsonl`. If there is no build map, tell the founder to run `casa-start`. From
   `build-map.json` determine the current level and the completed playbook ids.

2. Get the pulse-weighted candidates from the engine (do not score by hand):

   ```
   node ${CLAUDE_PLUGIN_ROOT}/scripts/router.mjs next company-brain/profile.json \
     --level <current_level> --completed <done-id,done-id,...> \
     --weights company-brain/pulse.json
   ```

   The engine returns only eligible, unblocked actions, already re-ranked by the
   founder's pulse weights. You will never recommend something blocked or out of level.

3. Make the call (judgment over the eligible set). Pick the single best NEXT action for
   this founder, not merely the top score: weigh it against the pulse (their focus, the
   win they named, the one thing, what they are avoiding). If a high-scoring item is off
   the founder's current focus, hold it back. Pick one or two more that are genuinely
   ready and on-pulse.

4. Deliver the briefing, not a table:

   ```
   Next: <action>  -- because <tie to their focus, win, or the one thing>.
   Also ready:     <up to 2 more, one line why each, only if genuinely on-pulse>.
   Holding back:   <eligible but off-pulse item> -- <why not now, tied to their
                    anti-priorities or the stage>.
   ```

   Flag any human-gate, irreversible, money, or legal step clearly.

5. Advance the level if the current level's exit gate is now satisfied; record the
   transition in `ledger/`.

6. Self-update. Update the AUTO blocks in `company-brain/CLAUDE.md` (`current-level`,
   `next`, `done`, keep last 10) and regenerate `NOW.md` via `brain.mjs sync`. Edit
   inside AUTO markers only, date entries, no em-dashes or emojis.

## Rules

- Eligibility, dependencies, and gating are the engine's. The relevance call and the
  reasoning are yours. Never recommend a blocked or out-of-level item.
- One primary action with a why, not a wall of tasks. Always say what you are holding
  back and why, so it never reads as a generic checklist.
- If there is no pulse yet, run with the engine order but say so, and offer to capture
  the pulse (re-run `casa-start` or `casa-priority`) so the next call is in sync.
- Never auto-execute a human-gate, irreversible, money, or legal step.
- No em-dashes, no emojis.
