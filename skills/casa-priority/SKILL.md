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
   `state.json` (for `completed`, `last_priority`, and the `loops` run dates), `pulse.json`
   (focus, anti-priorities, the do-or-die `constraint`, and weights), recent `decisions/`,
   `learnings.jsonl`, and `finance/receipts.jsonl`. If there is no build map, tell the
   founder to run `casa-start`. Read `active_north_star` from `build-map.json` (its `label`
   and `band`; the same value is on the "North star now:" line of `NOW.md`) and the
   `constraint` from `pulse.json`. These two, the north star and the do-or-die constraint,
   are the frame for the whole briefing.

2. Refresh the pulse (the continuous part). State back the founder's current focus and the
   do-or-die constraint, one line each, and ask if they still hold or anything shifted this
   week. If it changed,
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

   Each returned action carries an `effective_criticality` (existential, core, growth, or
   optional) and a `department`; treat both as given by the engine, do not recompute them.

5. Deliver the briefing, weighed against the pulse and framed by the north star:
   - Open with the north star and the do-or-die constraint: "North star now:
     <active_north_star.label>. The constraint in the way: <pulse.constraint>." Every
     priority below is judged by whether it moves the north star now and clears that
     constraint.
   - One line on the state of the company: level and name, progress, spend to date.
   - The top three priorities now, ranked, each with a one-line why tied to the north star
     and the founder's focus, win, or the one thing. Lead any existential
     (`effective_criticality` is "existential") item first and name it as do-or-die for this
     stage; never list it below optimization work even when a lower-criticality item scores
     slightly higher. The deterministic order is the default; you may lift an existential
     item and say why. Flag any human-gate, irreversible, money, or legal step.
   - On track, not re-headlined: a recurring existential play (for example north-star-metric
     or unit-economics) run within its cadence window. Check `state.loops` for its last-run
     ISO date (the recorded key may be the play's own id or the loop id whose `runs` names
     it) and compare days elapsed against that loop's `cadence_days` in `loops.json`
     (default 7). If it is inside the window, report it as "on track, last reviewed <date>"
     and lead with the next forward move instead of re-ranking it to the top. If it is past
     its window or never run, it may headline.
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
- Frame the briefing around the active north star and the do-or-die constraint from
  `pulse.json`. Every ranked priority is judged by whether it moves that one number now and
  clears the constraint.
- An existential item is do-or-die for the stage and is never buried below optimization
  work, even when a lower-criticality item scores slightly higher. A recurring existential
  play reviewed within its cadence is reported as on track, not re-headlined.
- Refresh the pulse when it has shifted, so the recommendations stay in sync. Do not
  re-stage the business here; for that, point the founder to `casa-start`.
- Never auto-execute a human-gate, money, or legal step.
- No em-dashes, no emojis.
