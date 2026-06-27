---
name: casa-next
description: The always-on advisor. Returns the single next best action for the company plus anything that can run in parallel right now. Use when the user asks what is next, what should I do, says casa next, or at the start of a working session.
---

# casa-next

The recommender. Decides what the founder should do next and keeps the operating
context current. The ranking is computed by the deterministic engine, not by hand.

## Steps

1. Read state. Load `company-brain/NOW.md`, `profile.json`, `build-map.json`,
   recent files in `decisions/`, and `learnings.jsonl`. If there is no build map,
   tell the founder to run `casa-start`. From `build-map.json` determine the
   current level (the highest level with active or ready nodes) and the list of
   completed playbook ids (nodes with status done).

2. Get the ranked recommendation from the engine:

   ```
   node ${CLAUDE_PLUGIN_ROOT}/scripts/router.mjs next company-brain/profile.json \
     --level <current_level> --completed <done-id,done-id,...>
   ```

   The engine applies the level gate and scores every ready node by
   eligibility x leverage / (slack + 1) x revenue / effort. Do not score by hand.

3. Surface the result: the single highest-scoring action as "do this next", then
   any nodes at the same level that can run in parallel now, then one or two
   alternates. Give a one-line why for each. Flag any human-gate or irreversible
   step clearly.

4. Advance the level if the current level's exit gate is now satisfied. Record the
   transition in `ledger/`.

5. Self-update (triggers T2 and, if a gate resolved, the level change). Update the
   AUTO blocks in `company-brain/CLAUDE.md`: `current-level`, `next`, `done` (keep
   last 10). Regenerate `NOW.md`. If a significant decision was made, append to
   `decisions/` and update `locked-decisions` (trigger T3). Edit inside AUTO
   markers only, date entries, no em-dashes or emojis.

## Rules

- One primary action, not a wall of tasks. Respect the founder's attention.
- Do not re-recommend a deferred or refused item until its cooldown passes.
- Never auto-execute a human-gate, irreversible, money, or legal step.
