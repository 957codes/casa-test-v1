---
name: casa-priority
description: Re-evaluate where the company is and return the founder's ranked priorities for this work session, weighed against their pulse (focus and what they are not doing yet). Broader than casa-next, a full briefing rather than a single action, and it refreshes the pulse when the founder's focus has shifted. Use at the start of a work session, when the user asks where are we or what should I focus on, or says casa priority.
---

# casa-priority

The session opener. Reads the state of the company, refreshes the founder's pulse if it
has changed, and returns a short ranked briefing that is in sync with what the founder
actually cares about. The candidates come from the deterministic engine; the relevance
ranking and the reasoning are the advisor's.

## Steps

1. Read state. Load `company-brain/NOW.md`, `profile.json`, `build-map.json`,
   `state.json` (for `completed` and `last_priority`), `pulse.json` (focus,
   anti-priorities, weights), recent `decisions/`, `learnings.jsonl`, and
   `finance/receipts.jsonl`. If there is no build map, tell the founder to run
   `casa-start`.

2. Refresh the pulse (the continuous part). State back the founder's current focus in
   one line and ask if it still holds or anything shifted this week. If it changed,
   update `company-brain/pulse.md` and `pulse.json` (including the weights), then
   re-render so the new weights take effect:

   ```
   node ${CLAUDE_PLUGIN_ROOT}/scripts/brain.mjs sync company-brain
   ```

   If there is no pulse yet, offer to capture it now (the pulse cascade from casa-start).

3. Note what changed since the last check-in: compare against `state.last_priority` and
   the completed set (what was finished, spend delta, days elapsed, anything that
   stalled).

4. Get the pulse-weighted candidates from the engine:

   ```
   node ${CLAUDE_PLUGIN_ROOT}/scripts/router.mjs next company-brain/profile.json \
     --level <current_level> --completed <done-id,...> --weights company-brain/pulse.json
   ```

5. Deliver the briefing, weighed against the pulse:
   - One line on the state of the company: level and name, progress, spend to date.
   - The top three priorities now, each with a one-line why tied to the founder's focus,
     win, or the one thing. Flag any human-gate, irreversible, money, or legal step.
   - Blockers: what is waiting, and on what.
   - Loops due now (the "Loops due now" section of `NOW.md`, if present).
   - Holding back: one or two eligible but off-pulse items, with why not now.

6. Record the check-in:

   ```
   node ${CLAUDE_PLUGIN_ROOT}/scripts/brain.mjs priority-ran company-brain
   ```

## Rules

- Eligibility and gating are the engine's; the relevance ranking and the reasoning are
  yours. Never recommend a blocked or out-of-level item.
- A ranked briefing tied to the founder's pulse, not a wall of tasks and not a bare
  table. Always say what you are holding back and why.
- Refresh the pulse when it has shifted, so the recommendations stay in sync. Do not
  re-stage the business here; for that, point the founder to `casa-start`.
- Never auto-execute a human-gate, money, or legal step.
- No em-dashes, no emojis.
