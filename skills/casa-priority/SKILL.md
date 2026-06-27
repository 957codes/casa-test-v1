---
name: casa-priority
description: Re-evaluate where the company is and return the founder's ranked priorities for this work session. Broader than casa-next, a full briefing (top actions, blockers, loops due, and what to defer) rather than a single action. Use at the start of a work session, when the user asks where are we or what should I focus on, or says casa priority.
---

# casa-priority

The session opener. Reads the current state of the company, works out what has
changed since the last check-in, and returns a short ranked briefing so the founder
knows where to spend this session. The ranking is computed by the deterministic
engine, not by hand.

## Steps

1. Read state. Load `company-brain/NOW.md`, `profile.json`, `build-map.json`,
   `state.json` (for `completed` and `last_priority`), the recent files in
   `decisions/`, `learnings.jsonl`, and `finance/receipts.jsonl`. If there is no
   build map, tell the founder to run `casa-start` and stop.

2. Work out what changed since the last check-in. Compare against
   `state.last_priority` and the completed set: what was finished, how much has been
   spent, and how many days have passed. Note anything that stalled.

3. Get the ranked actions from the engine (do not rank by hand):

   ```
   node ${CLAUDE_PLUGIN_ROOT}/scripts/router.mjs next company-brain/profile.json \
     --level <current_level> --completed <done-id,done-id,...>
   ```

   `current_level` is `build-map.json`'s `current_level`; the completed ids come from
   `state.json`. The engine applies the level gate and scores every ready node.

4. Deliver the briefing, in this order:
   - One line on the state of the company: level and name, progress, spend to date.
   - The top 3 priorities now, each with a one-line why. Flag any human-gate,
     irreversible, money, or legal step.
   - Blockers: what is waiting, and on what.
   - Loops due now (read the "Loops due now" section of `NOW.md`, if present).
   - Defer for now: one or two things the founder might expect to do but should not
     yet, with the reason.

5. Ask once whether the stage has changed (new traction, a launch, first revenue). If
   yes, point the founder to re-run `casa-start`. Do not re-stage inline.

6. Record the check-in:

   ```
   node ${CLAUDE_PLUGIN_ROOT}/scripts/brain.mjs priority-ran company-brain
   ```

   This sets `state.last_priority` and refreshes `NOW.md` and the `CLAUDE.md` AUTO
   blocks.

## Rules

- One ranked briefing, not a wall of tasks. Respect the founder's attention.
- Deterministic ranking comes from the engine, never from free reasoning here.
- Never auto-execute a human-gate, irreversible, money, or legal step. Surface it and
  let the founder decide.
- Do not re-recommend a deferred or refused item until its cooldown passes.
- No em-dashes, no emojis.
