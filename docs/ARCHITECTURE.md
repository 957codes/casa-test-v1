# Architecture

Full plan and rationale: `docs/BUILD-PLAN.md`. This is the condensed map.

## Six layers

```
Plugin shell  (.claude-plugin/)
   |
Router / brain  (select -> sequence -> recommend -> adapt)
   |
Skills        Subagents        Loop engine        Hooks
(playbooks)   (personas)       (cadences)         (advisor, gates)
   |
Company brain  (durable, git-tracked markdown state)
```

Design law: deterministic code owns the graph math, scoring, gating, ordering,
and all state mutations. The model is used only at the fuzzy leaves (idea
validation, final selection from a shortlist, drafting, phrasing a
recommendation). This keeps the system trustworthy at 100 playbooks.

## The router (the brain), four stages

1. Select. Deterministic trait pre-filter drops any playbook whose `applies_to`
   excludes the business type or whose `excluded_traits` are present (this removes
   most of the library instantly). Then a retrieval shortlist of the survivors by
   relevance. Then the model disambiguates the final set from the shortlist only.
   Never reason over all 100 playbooks at once.
2. Sequence. Build a dependency graph from `depends_on` and the producer/consumer
   links, topologically sort it (Kahn, with cycle detection), and compute slack to
   each milestone. Each topological level becomes a parallel track. Output is
   `company-brain/build-map.json`.
3. Recommend. On each session, score every ready node and surface one next action
   plus anything parallelizable now:

   ```
   score = eligibility_gate            (0 if deps unmet / human-gate pending / trait missing; else 1)
         * leverage_weight             (critical 4, high 3, med 2, low 1)
         * (1 / (slack + 1))           (less slack is more urgent)
         * revenue_boost               (x1.5 if blocks_revenue and money not flowing yet)
         / effort_weight               (S 1, M 1.3, L 1.7, XL 2.2)
   ```

4. Adapt. On a completion, re-score only. On a failed gate, mark blocked and
   propagate. On a pivot, re-run selection on the delta and diff the map,
   preserving completed work. Never re-run a done playbook.

## Mapping to Claude Code primitives

- `agents/playbook-planner.md`: select plus sequence, in an isolated context so
  the catalog scan never pollutes the founder's main session. Returns structured.
- `agents/plan-auditor.md`: reviews a new or revised build map before commit.
- `skills/casa-start`: capture and validate the idea, confirm the profile, invoke
  the planner, initialize the brain, stamp CLAUDE.md.
- `skills/casa-next`: the recommender. Reads the brain and build map, scores,
  surfaces the next action, and runs the self-update of NOW.md and CLAUDE.md.
- `skills/casa-map`: show and approve the build map.
- `hooks/session-start.sh`: prints `company-brain/NOW.md` at session start so the
  founder sees status and next action before the first turn.

## The company brain

Git-tracked markdown in the founder's own repo. The history is the institutional
memory. Template in `templates/company-brain/`:

```
company-brain/
  CLAUDE.md         self-updating operating contract
  NOW.md            current level and next actions (the hook prints this)
  profile.json      business type, traits, ICP, confirmed idea  (router input)
  build-map.json    personalized sequenced DAG plus status      (plan of record)
  decisions/        one file per significant decision
  ledger/           append-only event log of what ran
  learnings.jsonl   append-only; recalled at the start of every loop and skill
  loops.json        recurring cadences (the loop engine reads this)
  finance/receipts.jsonl  paid-action receipts (Capx Pay writes, Casa reads)
```

## Loops and the ToS line

Interactive loops (the founder is present) are subscription-safe and ship in v1:
the SessionStart advisor, in-session loops, on-demand skills. Autonomous or
scheduled operate mode (headless, Agent SDK, cron plus a persistent shell) is a
later phase and runs only on the founder's own API key via the companion product
Capx Pay, never on a subscription. See BUILD-PLAN.md section 5.

## The Capx Pay seam

Casa decides and recommends; the companion product Capx Pay executes and bills the
real-world paid actions. Casa owns none of the payment machinery (no wallet, no
billing, no credential vault, no spend governance). It references a capability by
id (pay/capabilities.yaml), routes through Pay's capx_* MCP tools (quote, then
do), surfaces Pay's cost and confirmation, and degrades to a bring-your-own-key
path when Pay is absent. Pay writes receipts to company-brain/finance/receipts.jsonl;
Casa reads them for financial state and the eventual Pillar-1 metrics attestation
(attest.metrics). The stablecoin spend balance (via Pay) is always labeled
distinctly from any CAPX token holding.
