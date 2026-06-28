---
id: north-star-metric
title: North Star Metric Definition
level: 5
summary: Pick, instrument, and cascade a single value-denominated metric with inputs and guardrails.
applies_to:
  types:
    - "*"
  requires_traits: []
  excluded_traits:
    - pre_idea_only
relevance: core
department: Data
criticality: core
selection_hint: Define once early PMF signal exists so every agent optimizes one number. Before PMF, anchor it on retention or core-action completion, not growth.
depends_on:
  - analytics-stack-setup
soft_after:
  - event-taxonomy-design
produces:
  - north_star_metric
  - metric_tree
  - guardrail_metrics
consumes:
  - analytics_stack
  - event_taxonomy
effort: M
leverage: critical
reversibility: medium
human_gate: false
blocks_revenue: false
recurring: false
typical_milestone: nsm-defined
source: ../capx-ai/playbooks/playbooks-output/033-north-star-metric.md
---
# North Star Metric Definition

Pick one value-denominated number that every autonomous action must move, so
functions do not optimize conflicting local maxima. Decompose it into inputs and
protect it with guardrails.

## Procedure

1. Validate PMF (Sean Ellis >40%). If below, the NSM must focus on retention or
   core-action completion among the ICP, not growth or monetization.
2. Identify the core value exchange: the exact moment the customer realizes value
   (messages exchanged, not logins).
3. Apply the NSM checklist: expresses customer value, represents vision and
   strategy, leading indicator of revenue, actionable, understandable.
4. Define 3-4 MECE input metrics that combine into the NSM via a metric tree
   (for example breadth x depth x efficiency).
5. Establish 1-2 guardrail counter-metrics to prevent Goodhart's-Law damage (NSM
   "messages sent" guarded by "spam reports").

## Output

`north_star_metric` (the statement), `metric_tree`, and `guardrail_metrics` in the
company brain, plus an instrumentation plan. Unblocks the CEO dashboard (037),
funnel (034), cohort (035), and the Weekly Business Review (040).

## Rules

- Never define a scaling NSM before PMF; you will scale a leaky bucket.
- The NSM must pass all five checklist criteria, and a backtest should show a ~10%
  NSM lift correlating with a >5% retention or revenue lift within a defined lag.

The full source draft (DHM model, checklist detail, metric-tree math) is at the
path in the `source` field above.
