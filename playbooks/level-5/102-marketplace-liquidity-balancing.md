---
id: marketplace-liquidity-balancing
title: Marketplace Liquidity Balancing
level: 5
summary: Diagnose and fix the short side of a two-sided marketplace so supply and demand clear, using match rate and time-to-fill as the operating metrics.
applies_to:
  types:
    - marketplace
  requires_traits: []
  excluded_traits: []
relevance: core
department: Operations
criticality: existential
model_fit: [marketplace]
selection_hint: Run once the marketplace has live transactions and a measurable match rate. The single most important marketplace growth lever; balance the short side before spending on the long side.
depends_on: []
soft_after:
  - marketplace-trust-and-safety
produces:
  - liquidity_plan
consumes: []
effort: L
leverage: critical
reversibility: easy
human_gate: false
blocks_revenue: true
recurring: true
typical_milestone: liquidity-balanced
---

# Marketplace Liquidity Balancing

The defining work of a marketplace: making sure that when one side shows up, the other is
there. Recurring, because the balance shifts as you grow.

## Procedure

1. Measure the core liquidity metrics: match rate (searches that result in a transaction),
   time-to-fill, and the fill rate per geography or category.
2. Identify the short side (usually supply) and the segments where it is shortest.
3. Concentrate: pick the narrowest geography or category where you can saturate the short
   side, rather than spreading thin.
4. Pull the short-side levers: targeted acquisition, onboarding friction reduction,
   incentives that retire once liquidity holds, and removing dead inventory.
5. Constrain the long side if needed so demand does not outrun a thin supply and churn.
6. Re-measure and rebalance on a cadence.

## Output

A `liquidity_plan`: the current match rate and time-to-fill, the identified short side and
segment, the levers in flight, and the saturation target, updated each cycle.

## Rules

- Balance, do not just grow. Adding demand to a supply-starved market increases churn.
- Concentrate on one segment to liquidity before expanding.
