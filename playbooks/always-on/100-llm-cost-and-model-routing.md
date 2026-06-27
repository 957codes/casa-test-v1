---
id: llm-cost-and-model-routing
title: LLM Cost and Model Routing
level: always-on
summary: Route each LLM call to the cheapest model that meets the quality bar, with caching, budgets, and hard kill-switches.
applies_to:
  types:
    - "*"
  requires_traits: []
  excluded_traits: []
relevance: core
selection_hint: Installed day zero before Level 0, right after HITL gates. Every LLM call passes through it. A misconfigured loop can burn five figures in minutes.
depends_on:
  - human-in-the-loop-approval-gates
soft_after: []
produces:
  - llm_routing
consumes:
  - hitl_gates
effort: M
leverage: critical
reversibility: easy
human_gate: false
blocks_revenue: false
recurring: true
typical_milestone: foundations-installed
source: ../capx-ai/playbooks/playbooks-output/100-llm-cost-and-model-routing.md
---
# LLM Cost and Model Routing

LLM inference is the largest variable cost in an AI-native business. Each action can
trigger dozens of calls and a single runaway loop can produce a five-figure invoice
before anyone notices. Most tasks do not need frontier intelligence; intelligent
routing cuts spend 50 to 98 percent while preserving 95 percent of quality.

## Procedure

1. Tier every task by difficulty. Reserve frontier (Tier 1) models for genuinely hard
   reasoning; route classification, extraction, and routine generation to mid-tier and
   small models. Tier 1 should be under 20 percent of call volume.
2. Query live pricing rather than hardcoding rates; the Tier 1 to Tier 3 cost ratio is
   roughly 100:1 to 200:1.
3. Cache aggressively. Target a prompt-cache hit rate above 40 percent for repetitive
   workflows; batch similar items.
4. Enforce budgets and hard kill-switches: alert when monthly LLM spend exceeds 15
   percent of gross revenue (8 percent post-PMF) and when any single agent's hourly
   spend exceeds $10. Cut off runaway loops automatically.
5. Track cost per unit of business output; drive it down 20 percent or more
   quarter-over-quarter.
6. Run the governance layer under HITL gates: budget overrides and kill-switch resets
   are gated actions, not autonomous ones.

## Output

`llm_routing`: the routing policy, cache configuration, budget thresholds, and
kill-switch state, recorded as a global precondition in the company brain.

## Rules

- This is a global precondition: it installs after HITL gates and before Level 0.
- Install after 099 so its own LLM calls are governed by the gates.
- Hard kill-switch on runaway spend is mandatory; target zero runaway incidents.
- Query live model pricing; never hardcode rates that drift.

Cadence: continuous; evaluated on every LLM call and on the monthly spend trigger for
the life of the company. Full pricing reference and the routing engine spec are in the
source draft.
