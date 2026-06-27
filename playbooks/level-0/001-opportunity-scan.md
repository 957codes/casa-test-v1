---
id: opportunity-scan
title: Opportunity Scan
level: 0
summary: Mine communities, reviews, search, and trends for evidence of underserved demand.
applies_to:
  types:
    - "*"
  requires_traits: []
  excluded_traits: []
relevance: core
selection_hint: First step of validation. Surfaces and scores real evidence of demand. Run for every business.
depends_on: []
soft_after: []
produces:
  - opportunity_brief
  - candidate_niches
consumes: []
effort: M
leverage: critical
reversibility: easy
human_gate: false
blocks_revenue: false
recurring: false
typical_milestone: validated-opportunity
source: ../capx-ai/playbooks/playbooks-output/001-opportunity-scan.md
---
# Opportunity Scan

Opportunity discovery is signal mining, not invention. Find and quantify explicit
evidence of unmet demand, then score it. Complaints, workarounds, and fragmented
workflows are the raw material.

## Procedure

1. Aggregate signals. Pull from at least three channels (for example community
   posts, product reviews, search demand, public forums). Target a few hundred raw
   signals across the candidate space.
2. Cluster into candidate niches. Group signals by the underlying job and the
   audience expressing it.
3. Score each candidate on urgency of the pain, frequency, willingness to pay
   evidence, reachability of the audience, and how crowded existing solutions are.
4. Write the opportunity brief: the top candidate niches, the evidence behind
   each, and a confidence tag per claim.

## Output

`opportunity_brief` and a ranked list of `candidate_niches`, written to the
company brain.

## Rules

- An opportunity is not valid until at least three independent signals from at
  least two channels support it. One complaint is an anecdote.
- Tag confidence on every claim. No fabrication; if a data source is unavailable,
  say so and ask the founder.

The full source draft (deeper method, citations, scoring rubric) is at the path in
the `source` field above. Condense, do not pad.
