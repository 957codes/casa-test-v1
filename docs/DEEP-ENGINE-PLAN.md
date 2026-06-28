# Deep Engine Plan (2026-06-27)

The plan to deepen the Casa engine: business-type north star, existential-vs-optimization
criticality, a unified fitness score, accurate departments, a business-aware initial pulse,
and deeper adaptive intake. Produced by a grounded multi-agent design pass (5 lenses ->
2 adversarial reviews -> synthesis), prototyped against the live engine before write-up.

## The diagnosis

The "headline = stale infra" complaint is mostly already fixed by the stage seed (a seeded
revenue company already headlines north-star-metric). The genuine remaining bug is the
**#2-#5 band**: stale Level-2 infra loops (incident-response, data-backup-recovery) outrank
unit-economics and bury cohort-retention at ~#10, and a marketplace produces byte-identical
output to a SaaS app (model-blindness). Relevance regressed to 74 in round-5 because the
default ranking is business-model-blind; the pulse is a corrective, not a substitute for a
sensible default.

## The unified fitness score (replaces score() in router.mjs)

`score(pb, slack, flags, weights, fit?)` gains an OPTIONAL 5th arg. When `fit` is absent the
result is byte-identical to today (every existing score unit test passes).

```
lev * urgency * stageFit * fitFactor * rev / eff * priorityWeight
```

- `urgency = 1.3 - 0.6 * min(slack/SLACK_SPAN, 1)` (unchanged, the only slack term).
- `stageFit(level, currentLevel)`: pure DISCOUNT, max 1.0 (distance d = currentLevel-level;
  d<=1 -> 1, d==2 -> 0.85, d==3 -> 0.7, else 0.55; always-on -> 1). Demotes stale work below
  the frontier. This is the load-bearing fix for the #2-#5 band.
- `fitFactor = clamp(CRIT_W[effectiveCriticality] * modelFitW, [0.7, 1.8])` -- the ONE
  bounded model-awareness tilt.
  - `CRIT_W = { existential: 1.5, core: 1.15, growth: 1.0, optional: 0.85 }`, default growth.
  - `effectiveCriticality(pb, stage)`: existential if base==existential OR stage in
    `existential_at`, else base.
  - `modelFitW`: model_fit empty -> 1; some model matches -> 1.25 (hit); none match -> 0.85.
  - `modelSet(profile)`: recurring (recurring_revenue), transactional (takes_payments and not
    recurring_revenue), self_serve (self_serve_only), sales_led (high_acv or b2b-and-not-self
    _serve), marketplace (type), physical_goods (ecommerce/hardware), local (local_service_only).
- `priorityWeight` UNCHANGED and stays the OUTERMOST multiplier so the founder pulse can
  always cross the bounded fit factor (preserves pulse_effect 89 and the weights-steer tests).

Determinism + invariants hold: pure function of static fields + level + flags + weights;
strictly-decreasing-in-slack (urgency is the only slack term); multiplicative pulse + revenue
boost untouched; rule 4 holds because fit re-weights only the already-ready set. NOTE: strict
leverage ordering is explicitly NOT an invariant -- a strongly on-model existential play can
outrank a higher-leverage generic one (intended: retention beats generic infra).

`nextActions` computes `fit = { currentLevel, stage, models }` once, threads it, attaches
`effective_criticality` to each action, and uses a total order: `score desc, level asc, id`.

### Verified prototype (live seeded engine)
- Memescope L5 no-pulse: north-star 4.255, unit-economics 3.618, cohort-retention 3.581,
  churn 3.157, support-workflow 2.631; incident-response 2.181 (#7), data-backup 2.036 (#8).
- + pulse promote cohort-retention: 8.952 at #1 (pulse still crosses the bounded factor).
- Marketplace L5 no-pulse: surfaces marketplace-liquidity-balancing at #3 (model-differentiated).

## North star (scripts/northstar.mjs, derivation + display + initial-pulse only; NO score boost)

`matureNorthStar(profile) -> { growth, retention, guardrails }` total cascade on primary_type,
refined by monetization then audience (b2b if traits has b2b/high_acv, else b2c). local_service
_only override -> retention local_rebooking, growth bookings. `band(level)`: L<=3 validation,
L4 activation, L5 retention, L6+ scale. `northStar(profile, level)` returns the stage-active
metric. Model-awareness in RANKING is carried by model_fit + criticality, not the north star,
so the north star is non-redundant (legibility + initial-pulse seeding only).

## Criticality + model_fit (catalog fields)

- `criticality`: existential | core | growth | optional. Derived-with-override (build-index
  `deriveCriticality` seed from relevance/blocks_revenue/leverage/department/recurring; author
  value wins). Default growth (neutral). NOT required initially.
- `existential_at`: optional list of stage tiers; promotion-only to existential within them.
  Named promotions: churn-diagnosis-winback / cohort-retention-analysis [revenue,scaling];
  support-workflow [revenue]; local-reviews-reputation [revenue,scaling]; financial-model
  -forecast [scaling]; repeat-purchase-and-aov [revenue,scaling].
- `model_fit`: optional string[] (recurring|transactional|self_serve|sales_led|marketplace|
  physical_goods|local), default []. Tight assignment to model-central members only.

## Departments (11, hand-authored, REQUIRED)

Strategy, Brand, Product, Engineering, Data, Growth, Sales, Finance, Legal, Success, Operations.
Deltas vs the 9 heuristic values: ADD Strategy (validation/research), ADD Data (metrics
cluster), RENAME Marketing->Growth, Support->Success, Design->Product. north-star-metric = Data
(Engineering builds the pipes, Data reads them). Retag via a dev-only codemod carrying a curated
{id: department} map for all 107; build-index makes department REQUIRED + vocab-linted (ERROR on
missing/invalid). router.mjs L170 runs_paid_media lift: Marketing -> Growth.

## Catalog gaps

- New physical-goods playbooks (types [ecommerce, hardware]): supplier-sourcing-and-cogs (L2
  Finance), inventory-and-fulfillment-setup (L3 Operations), shipping-returns-policy (L3
  Operations), repeat-purchase-and-aov (L5 Data, recurring), optional merchandising-and-catalog
  (L3 Growth). Every consumes resolves to an existing/sibling producer; graph stays acyclic.
- Local-service tightening: add excluded_traits [local_service_only] to 10 national content/
  social/PR loops (programmatic-seo, pillar-cluster-content, technical-seo-audit, link-building,
  reddit-marketing, twitter-x-playbook, youtube-strategy, podcast-tour, community-seeding,
  long-form-blog-post). Keep local-google-business-profile, local-reviews-reputation, seo-keyword
  -research, landing-page-cro, newsletter-growth, email lifecycle.

## Initial pulse (makes the FIRST build map business-aware)

`deriveInitialPulse(answers, playbooks)` in stage.mjs (pure, table-driven): north_star_archetype
+ constraint_archetype + anti_priorities -> the exact `{ weights }` shape priorityWeight consumes,
byDepartment keyed to the NEW 11-dept vocab (Data/Growth/Success/Product). stage.mjs apply writes
pulse.json alongside profile.json/state.json.

## Deeper intake (deep scan DEFERRED)

questions.json -> 4 passes (Define/Locate/Core/Backfill) with scan-aware keys
(satisfied_by_signal, prefilled_by, mode_when_scanned). Core pass (always): north star (archetype
chips from matureNorthStar), do-or-die constraint, horizon, anti-priorities, funding-if-unknown.
project-scanner adds done/gap reconciliation for analytics/payments/legal/deploy only. The heavy
route/env/migration/reflog scan is deferred (its ranking payoff is already delivered by the seed).

## Advisor (rule-4 final ranking)

casa-next + casa-priority frame the briefing around the active north star, name each action's
criticality band, never bury an existential item, and apply advisor-side last-run suppression
for recurring existential loops (north-star-metric, unit-economics) so they do not re-headline
every session. Suppression stays OUT of the deterministic core.

## Ordered tasks
1. Department truth FIRST (codemod + build-index REQUIRED + router L170 + adapter/test). 
2. criticality + model_fit fields + deriveCriticality seed + WARN.
3. scripts/northstar.mjs + test + zero-dep guard.
4. Replace score() with the unified path; thread fit; total-order sort.
5. North-star display wiring (stage.mjs + brain.mjs + NOW.md + CLAUDE.md block).
6. deriveInitialPulse + pulse.json writing.
7. Intake restructure (questions.json 4 passes + casa-start + project-scanner).
8. Author 4-5 physical-goods playbooks.
9. Local-service membership tightening.
10. Recompute goldens + add tests (stageFit, model_fit, criticality, sync, backward-compat).
11. Advisor skills (north-star framing + existential naming + recurring suppression).
12. Preflight + dated CLAUDE.md build-log.

## Definition of done
- npm run check green; backward compat proven (no-fit score == pre-change); invariant tests
  unchanged; build-index lints all new vocab; 0 orphan/cycle/dangling; goldens recomputed.
- Ranking: Memescope L5 no-pulse #1-#5 all stage-appropriate retention/revenue, infra below;
  pulse promote still #1; 4 types differentiated without a pulse; 0 dead ends on 7 profiles.
- 20-company test: average relevance >= 90 AND output_usefulness >= 90, no profile below 85,
  pulse_effect >= 89, 0 dead ends on every profile. Ship only when this clears.
