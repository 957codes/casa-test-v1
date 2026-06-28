# Playbook schema (the machine-readable contract)

Every playbook is a markdown file with a YAML frontmatter header. The router reads
ONLY the frontmatter to plan (cheap, like reading a manifest, not the source). The
body is the workflow Casa executes when the playbook runs.

## Frontmatter fields

```yaml
id: incorporate-us-entity         # stable kebab-case id, matches the file slug
title: Incorporate a US entity
level: 1                          # 0..8, or "always-on"
summary: Form the legal entity, EIN, registered agent.

# SELECTION  (which businesses this applies to)
applies_to:
  types: ["*"]                    # saas, marketplace, ecommerce, local-service, crypto, content, hardware, ...  "*" = all
  requires_traits: []             # e.g. ["takes_payments", "us_based", "b2b", "has_token"]
  excluded_traits: ["pre_idea_only"]
relevance: core                   # core | recommended | optional | conditional
selection_hint: >                 # one line that helps the model disambiguate (REQUIRED)
  Needed by any business that will take revenue or raise. Skip if only validating.

# ORDERING  (the DAG edges)
depends_on: ["validate-idea"]     # hard predecessors (ids); must be done first
soft_after: ["name-and-brand"]    # preference, not a hard gate
produces: ["legal_entity", "ein"] # artifacts/capabilities this unlocks
consumes: ["confirmed_business_idea"]

# RECOMMENDER  (scoring and gates)
effort: M                         # S | M | L | XL
leverage: high                    # low | med | high | critical  (upside magnitude WHEN done)
reversibility: hard               # easy | medium | hard
human_gate: true                  # requires explicit founder approval to execute
blocks_revenue: true              # money cannot legally or operationally flow until done
recurring: false                  # true = a loop (scheduled cadence), not a one-time checkbox
typical_milestone: company-exists # CPM milestone anchor for slack

# ORG + FITNESS  (department is REQUIRED; the rest tune the model-aware fitness score)
department: Legal                 # REQUIRED. one of: Strategy Brand Product Engineering Data
                                  #   Growth Sales Finance Legal Success Operations
criticality: existential          # existential | core | growth | optional  (survival CONSEQUENCE
                                  #   of NOT doing it at its stage; default growth). Distinct from
                                  #   leverage. Drives CRIT_W in the score.
existential_at: [revenue]         # optional stage list; promotes this play to existential within
                                  #   those stages only (idea|landing|building|launched|revenue|scaling)
model_fit: [recurring]            # optional. recurring|transactional|self_serve|sales_led|
                                  #   marketplace|physical_goods|local. Empty = model-agnostic.
                                  #   A match tilts the score up for that business model.
```

The fitness score (scripts/router.mjs) is `leverage * urgency(slack) * stageFit * fitFactor *
revenue / effort * pulseWeight`, where `stageFit` discounts work far below the company's level
and `fitFactor = clamp(CRIT_W[effective criticality] * modelFit, [0.7, 1.8])`. The north star
(scripts/northstar.mjs) is DERIVED from the profile (not a playbook field) for display and to
seed the initial pulse. See docs/DEEP-ENGINE-PLAN.md.

## Worked example: a Level 0 playbook

```yaml
id: opportunity-scan
title: Opportunity Scan
level: 0
summary: Mine trends, communities, reviews, and search data for underserved niches.
applies_to: { types: ["*"], requires_traits: [], excluded_traits: [] }
relevance: core
selection_hint: First step of validation. Surfaces and scores evidence of demand.
depends_on: []
soft_after: []
produces: ["opportunity_brief", "candidate_niches"]
consumes: []
effort: M
leverage: critical
reversibility: easy
human_gate: false
blocks_revenue: false
recurring: false
typical_milestone: validated-opportunity
```

## CI lint rules (enforced on `playbooks/_index.json`)

1. Every `id` is unique and matches its file slug.
2. Every `consumes` value is `produces`d by at least one other playbook.
3. No dependency cycles (the graph topologically sorts).
4. `selection_hint` is present and non-empty.
5. `level`, `relevance`, `effort`, `leverage`, `reversibility` use allowed values.
6. `recurring: true` playbooks declare a cadence in the body.

## Porting from the source drafts

The 100 source drafts are at `../capx-ai/playbooks/playbooks-output/`. Their
hand-authored dependencies and parallel clusters are at
`../capx-ai/playbooks/flows/dependencies.md` and `parallelism.md`. To port a
playbook: lift its preconditions and unblocks into `depends_on` / `produces` /
`consumes`, set the selection fields from the `domain` notes, condense the body
into an executable workflow, and add it to `playbooks/level-N/`.
