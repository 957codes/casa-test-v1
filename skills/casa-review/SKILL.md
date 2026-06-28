---
name: casa-review
description: Critique a company artifact (a decision, a plan, copy, a price, a positioning line, a deck, a metrics readout) with a panel of specialist persona agents, then merge and confidence-gate their findings into one ranked verdict. Interactive mode applies safe fixes on request; mode:agent returns JSON and changes nothing. Use after building or drafting something, before a launch, a price, or a commitment.
argument-hint: "[mode:agent] [grade <nodeId>] [path to the artifact, or blank for the most recent decision]"
---

# casa-review

The critic. Adapts the parallel-persona review pipeline (always-on plus conditional
personas, structured findings, confidence-gated merge) from code review onto company
decisions. It is the review half of the build then review loop.

## Argument parsing

- `grade <nodeId>`: run the GRADE MODE below instead of the persona critique. It scores
  a completed node's deliverable 0-100 against the playbook's `deliverable` spec and
  `rubric`, combining deterministic checks with an LLM judgment, and persists the score.
- `mode:agent` (or `mode:headless`): return only the merged JSON verdict, apply no
  fixes, mutate nothing. Default mode is interactive (render a briefing, offer to
  apply safe fixes).
- A path: the artifact to review. Blank means the most recent file in
  `company-brain/decisions/` or the artifact the last `casa-build` produced.

## Steps

1. Scope. Identify the artifact and its type (decision, copy, plan, pricing,
   positioning, design, metrics, deck). Read it, plus `profile.json`,
   `build-map.json`, and any `decisions/` it references.

2. Select personas. Always-on: `customer-skeptic`, `investor-redteam`,
   `brand-copy-critic`, `analyst-honesty`. Add conditional personas by signal:
   `designers-eye` for UI, `legal-risk` for legal or contract or privacy artifacts,
   `tokenomics-critic` when the artifact touches a token or on-chain mechanics,
   `compliance-trust` when it touches custody or payments. Select by judgment about
   the artifact, not by keyword.

3. Spawn the personas in parallel as subagents. Give each the artifact and the
   context. Each returns ONLY this JSON, no prose:

   ```json
   {
     "persona": "<name>",
     "findings": [
       { "severity": "P0|P1|P2|P3", "confidence": 0|25|50|75|100,
         "title": "<short>", "where": "<section, line, or claim>",
         "why": "<the risk>", "fix": "<specific correction>" }
     ],
     "residual_risks": ["<what you could not assess>"]
   }
   ```

4. Merge and gate, deterministically (not by hand):
   - Fingerprint a finding by `where` plus a normalized `title`.
   - When two or more personas raise the same fingerprint, promote its confidence one
     step (cross-reviewer agreement is signal).
   - Suppress anything below confidence 75, except every P0 (a P0 always surfaces).
   - Order by severity, then confidence.

5. Output.
   - Interactive: a ranked briefing. For each surviving finding give the persona,
     severity, the why, and the fix. Group safe, reversible fixes and offer to apply
     them. Never auto-apply an irreversible, legal, or money change.
   - mode:agent: print the merged JSON only and stop.

6. Record. Append a short review record to `company-brain/ledger/` (artifact,
   personas run, count of surviving findings, verdict). Do not edit the artifact in
   mode:agent.

## Rules

- The gating is deterministic (fingerprint, promotion, threshold). Do not re-rank by
  feel.
- Independence is the point: each persona judges on its own, never as a committee.
- Never apply a fix that files, pays, signs, sends, or publishes. Surface those.
- No em-dashes, no emojis in the briefing or any fix.
