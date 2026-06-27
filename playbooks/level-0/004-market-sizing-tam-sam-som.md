---
id: market-sizing-tam-sam-som
title: Market Sizing (TAM/SAM/SOM)
level: 0
summary: Triangulate market size with two independent methods and issue a go/no-go against VC-grade thresholds.
applies_to:
  types:
    - "*"
  requires_traits: []
  excluded_traits: []
relevance: core
selection_hint: Run for every business to confirm the opportunity is large enough to justify the build. Kill if SOM is below threshold.
depends_on: []
soft_after:
  - opportunity-scan
produces:
  - market_sizing_model
  - market_go_no_go
consumes:
  - opportunity_brief
  - refined_icp
effort: M
leverage: high
reversibility: easy
human_gate: false
blocks_revenue: false
recurring: false
typical_milestone: validated-opportunity
source: ../capx-ai/playbooks/playbooks-output/004-market-sizing-tam-sam-som.md
---
# Market Sizing (TAM/SAM/SOM)

Produce a market model a skeptical investor can interrogate, not a slide with a
big number. The market is the primary variable: a great market pulls a mediocre
product out; a bad market sinks a brilliant one.

## Procedure

1. Confirm inputs: ICP, pricing model (ACV or ARPU), geographic scope, business
   model, competitor revenues.
2. Compute TAM, SAM, SOM with at least two independent methods (top-down from
   analyst data and bottom-up from ICP count times price). Compare outputs; large
   divergence means an assumption is wrong.
3. State explicitly what the market is not (the TAM boundary).
4. Apply VC-grade thresholds and unit-economics sanity (e.g. a venture path needs
   a multi-billion TAM at a realistic capture rate). Issue a go/no-go.

## Output

`market_sizing_model` (assumptions, sources, calculations, narrative) and a
`market_go_no_go` recommendation, written to the company brain.

## Rules

- Replace every qualitative claim ("large market") with a number, a source, and a
  calculation.
- Flag any assumption older than two years or sourced from a single analyst report.
- A bottom-up and top-down number that disagree by more than ~3x is unresolved;
  do not pick the bigger one.

The full source draft (three methodologies, decision tree, case studies) is at the
path in the `source` field above.
