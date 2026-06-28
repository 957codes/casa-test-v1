# CLAUDE.md — Capx Casa repo operating contract

This file governs Claude Code when working INSIDE this repository (building and
extending the Capx Casa plugin). It is loaded every session. Follow it exactly.

There is a SECOND CLAUDE.md, the one that ships to a founder's company workspace,
at `templates/company-brain/CLAUDE.md`. Do not confuse the two. This file is for
people building Casa. That one is for Casa building a company.

This file maintains itself. See "Self-update of this file" at the bottom and the
full protocol in `docs/SELF-UPDATING-CLAUDE.md`.

---

## 1. What this repo is

Capx Casa is an open-source (MIT) Claude Code plugin: the control plane for
building and scaling a company from the terminal. It ships skills, subagents,
hooks, recurring loops, and a router, all reading and writing a durable company
brain so every action compounds.

Prime directives, in priority order:

1. Terminal-first. The terminal is where work happens, and the company-brain is
   mutated only by the deterministic engine. (2026-06-27 supersession of the original
   "terminal only, no GUI" rule: a read-only local Console under console/ may VISUALIZE
   the brain on localhost. It never writes to the brain, ships nothing hosted, needs no
   login, and is never required. Its dependencies are exempt from the zero-dependency
   guarantee, which still binds the plugin runtime in scripts/.)
2. The founder runs inside their own Claude Code on their own plan. Casa adds no
   hosted inference. Interactive use only on a subscription (see rule 5).
3. MIT and open. Never paywall a skill, agent, prompt, or playbook. Casa earns no
   money directly. Real-world paid actions are run and billed by the companion
   product Capx Pay; Casa never prices, charges, or holds funds.
4. Deterministic core, LLM at the leaves. Graph math, gating, the (pulse-weighted)
   score, and state mutations are deterministic code, so an ineligible or blocked item
   can never be recommended. (2026-06-27 amendment: the FINAL relevance ranking of the
   eligible candidates and the reasoning move to the LLM advisor, weighed against the
   founder's pulse. The deterministic score is now one input, personalized by
   pulse-derived weights; the advisor makes the final call over the eligible set.) Never
   let the model invent a dependency, skip a gate, or recommend a blocked item.
5. ToS line. Anthropic Consumer Terms section 3.7 prohibits automated or headless
   use except via an Anthropic API key. So everything in v1 is interactive and
   subscription-safe (the founder is present). Autonomous or scheduled "operate
   mode" (headless claude -p, the Agent SDK, cron plus a persistent shell) is a
   later phase and runs only on the founder's own API key, never a subscription.
   Never market or build v1 as a 24/7 autonomous operator.
6. Integrate, do not vendor. We are MIT. Reach external tools (PostHog, Onyx,
   Chatwoot, crawl4ai, billing, etc.) via MCP or REST against the founder's own
   or self-hosted instance. Never bundle AGPL, SSPL, or Sustainable-Use-License
   source into this repo. Check a dependency's license before adding it.
7. Copy discipline (Capx canon). No em-dashes and no emojis in any founder-facing
   copy (README, skill output, command text). Tone is institutional and
   category-creating, not founder-bro.
8. Payments belong to Capx Pay, not Casa. Do not build a wallet, billing system,
   credential vault, or spend governance here. When a step needs a paid action,
   route it to a Capx Pay capability by id (pay/capabilities.yaml), surface Pay's
   quote and confirmation, and never invent limits or prices. Degrade to a
   bring-your-own-key path or hand the step to the founder when Pay is absent.
   Capx Pay writes receipts to company-brain/finance/receipts.jsonl; Casa reads
   them, never writes charges. Route only genuinely needed work, never manufacture
   spend. Label the stablecoin spend balance distinctly from any CAPX holding.

This repo serves both Capx pillars: companies built here become eligible to open
ownership on-chain on Capx (the metrics the company brain records are the
attestation that feeds tokenization). Do not break that bridge.

---

## 2. Architecture (six layers)

Full detail in `docs/ARCHITECTURE.md`. In short:

1. Plugin shell: `.claude-plugin/plugin.json` plus `.claude-plugin/marketplace.json`.
2. Router (the brain): select then sequence then recommend then adapt.
   `agents/playbook-planner.md` (select plus sequence), `skills/casa-next`
   (recommend), `hooks/session-start.sh` (surface).
3. Skills: one per founder job, ported from the playbook library. `skills/`.
4. Subagents: specialist personas and reviewers. `agents/`.
5. Loop engine: recurring cadences. (Manifest format and runtime land in Phase 2;
   see the build plan.)
6. Company brain: durable git-tracked markdown state. Template in
   `templates/company-brain/`.

---

## 3. The playbook library and the level model

The curriculum is 100 playbooks. The source drafts live OUTSIDE this repo at
`../capx-ai/playbooks/playbooks-output/` with a hand-authored DAG at
`../capx-ai/playbooks/flows/` (level model, `dependencies.md`, `parallelism.md`).
That DAG is the v0 of the router. We port playbooks into this repo under
`playbooks/level-N/` with the machine-readable frontmatter contract.

The level model (organizing scheme, used as-is for now):

- Always-on: Foundations (HITL gates plus cost governance)
- Level 0: Ideation and Validation (the wedge)
- Level 1: Commit and Incorporate
- Level 2: Product and Infra Foundation
- Level 3: Build and Pre-launch
- Level 4: Launch
- Level 5: First Customers and PMF
- Level 6: Scale Acquisition
- Level 7: Enterprise Sales (conditional)
- Level 8: Growth Finance and Fundraise

Levels are gated by measurable entry and exit criteria. The router personalizes
WHICH playbooks fire inside each level for the business type. Never run a
playbook before its level (the prerequisites do not exist and the output is
garbage).

---

## 4. How to add things (conventions)

- Add a playbook: create `playbooks/level-N/NNN-slug.md` with the full frontmatter
  contract from `docs/PLAYBOOK-SCHEMA.md`. Every `consumes` must have a producer
  somewhere; no dependency cycles; `selection_hint` is required. Then regenerate
  `playbooks/_index.json`.
- Add a skill: create `skills/<name>/SKILL.md` with `name` and `description`
  frontmatter (anthropics/skills format). Keep the body tight. Bundle assets in
  the skill folder.
- Add an agent: create `agents/<name>.md` with `name`, `description`, `tools`,
  optional `model`. Agents return structured output, not prose.
- Add a hook: register it in `hooks/hooks.json`. Hooks are deterministic scripts.
  Keep them dependency-free where possible (POSIX sh, no jq requirement).
- Add a loop: (Phase 2) declare it in the loop manifest. Label its ToS tier
  (interactive v1 vs API-backed operate mode).

---

## 5. Self-update of this file

This file changes only inside the AUTO block below, and only when a structural
fact about the repo changes (a new layer or skill type, a change to the level
model, the command surface, the license posture, or the current build phase).
Everything outside the AUTO block is hand-authored and stable. Follow the safe-edit
rules in `docs/SELF-UPDATING-CLAUDE.md` (edit inside the markers only, keep it
short, date entries, never delete the protocol).

<!-- CASA:AUTO:repo-status -->
- Phase: 2 (router and library), router engine landed. Updated 2026-06-23.
- Library: ALL 100 playbooks in playbooks/level-N/ with the frontmatter contract.
  Catalog tooling scripts/build-index.mjs + scripts/normalize-playbooks.mjs.
  Graph clean: 100 playbooks, 0 cycles, 0 dangling deps, 0 orphan consumes. Trait
  vocabulary canonicalized (32 traits; audience synonyms merged to b2b/b2c).
- Router engine: scripts/router.mjs (deterministic select + Kahn sequence + CPM
  slack + score, with a level gate). CLI: plan and next. Library exports for
  tests. casa-start, casa-next, and playbook-planner now call the engine; the LLM
  only does intake, disambiguation, and phrasing.
- Dry-run passing: two sample profiles in examples/ produce personalized build
  maps (b2c self-serve selects 79/107 and drops sales/enterprise with reasons;
  b2b high-acv selects 96/107 and keeps them). Recommender advances correctly
  L0 -> L1, writes build-map.json + NOW.md.
- Brain state engine: scripts/brain.mjs (init, sync, complete, loop-ran).
  Progress lives in company-brain/state.json; everything else is rendered. sync
  performs the deterministic self-update of company-brain/CLAUDE.md AUTO blocks
  (T1-T5: profile, selected-levels, current-level, next, done, state) inside the
  markers only, plus NOW.md. Verified end to end: a sample company advanced
  L0 -> L1 with the contract rewriting itself.
- Loop engine v1 (interactive, ToS-safe): templates/company-brain/loops.json
  defines the recurring cadences; brain.mjs surfaces due loops in NOW.md;
  loop-ran resets a cadence; skills/casa-loops runs them. v2 operate mode (API)
  deferred.
- Payments: the Casa-owned "Gateway" was retired in favor of the companion
  product Capx Pay (which owns wallet, billing, credentials, spend governance).
  Casa carries only the Pay seam: pay/capabilities.yaml (capability registry, no
  prices), skills/casa-pay (the adapter: route by capability id via the capx_*
  MCP tools, surface Pay's quote and confirmation, degrade to BYO-key if absent),
  and company-brain/finance/receipts.jsonl (Pay writes, Casa reads). brain.mjs
  surfaces spend, labeled Capx Pay, distinct from CAPX.
- Pay integration VERIFIED 2026-06-23 against Capx Pay's real code (at
  Documents/capx/pay): capability ids match; Casa reads Pay's PaymentReceipt
  schema (amountMicros micro-USD, status settled, 1 USD = 1e6). Ran Pay's mock
  (connect/fund/policy/do) pointed at a company brain; it mirrored receipts to
  finance/receipts.jsonl and Casa surfaced $12.18 spend. Pay gained a
  CAPX_COMPANY_BRAIN env var and a `capx link <brainDir>` command for the seam.
- Operate mode v2: scripts/operate.mjs runs due loops headless, refuses on a
  subscription (Consumer Terms 3.7), needs the founder's own API key + opt-in,
  dry-run by default. Verified: refuses without a key; prints the claude -p plan
  with one.
- Launch-readiness (2026-06-23): runtime is now ZERO-DEPENDENCY. Company-brain
  state moved from YAML to native JSON (profile/build-map/state/loops.json);
  js-yaml is dev-only (build-index, normalize). router.mjs, brain.mjs, operate.mjs
  import only node:/relative. scripts/check-plugin.mjs is the preflight (manifests,
  skill/agent frontmatter, hook executable, _index count, zero-dep imports, JSON
  template). Verified with node_modules removed: validator PASS 21/0, plus the full
  brain lifecycle + router + hook running on a simulated fresh clone (no npm install).
- Test suite (2026-06-26): tests/ on Node's built-in runner (node --test, zero new
  deps, in keeping with the zero-dep runtime). 26 tests, all green. router unit
  tests assert the golden build maps (b2b 96/107, b2c 79/107), topo+slack
  invariants, whole-graph acyclicity, score monotonicity, and level/dep gating.
  brain + operate integration tests (subprocess over a temp brain) cover the
  init->sync->complete lifecycle, the L0->L1 advance, read-only Capx Pay spend
  surfacing, AUTO-block edit safety, and the operate ToS guardrails (refuses
  without a console API key, rejects a session token, requires CASA_OPERATE).
  `npm test` runs them; `npm run check` runs preflight + tests.
- Stage engine / onboarding (2026-06-27, Phase A of docs/ONBOARDING-PLAN.md):
  scripts/stage.mjs turns the casa-start interview answers into {profile, start_level,
  completed_seed} deterministically. A founder picks a stage tier (idea -> scaling);
  the tier fixes the start level and the milestone state-flags, and the engine seeds
  every non-recurring playbook below that level as already-done so an existing
  business skips work it has finished. Named gaps (Pass C of the interview) are left
  OUT of the seed and surface as ready catch-up items. brain.mjs gained a level FLOOR
  (currentLevel = max(deriveLevel, state.start_level)) so a lower-level gap does not
  regress the company. skills/casa-start/questions.json is the adaptive (~8-12 Q)
  interview bank with the answer->signal mapping. Command surface stays casa- prefixed.
  Covered by tests/stage.test.mjs (9 tests: tier->seed mappings, milestone
  accumulation, gap exclusion, answer validation, and a seed->level round-trip +
  floor). stage.mjs added to the preflight zero-dep guard. Suite now 35 tests, green.
  All four phases done 2026-06-27. Phase B: skills/casa-start/SKILL.md runs the
  interview and branches greenfield (Level 0 validation) vs existing (skip to current
  level), driving stage.mjs apply + brain.mjs sync. brain.mjs gained `priority-ran`
  (sets state.last_priority). Phase C: skills/casa-priority/SKILL.md, the session
  opener (a ranked briefing, broader than casa-next), ranks via router next and
  records the check-in via priority-ran. Phase D: hooks/session-start.sh nudges toward
  /casa-priority when loops are due, docs/ONBOARDING.md is the full walkthrough, and
  the README has a Getting started section. Command surface (casa- prefixed):
  casa-start, casa-priority, casa-next, casa-map, casa-loops, casa-pay. Suite 36
  tests, preflight 23 checks, all green.
- Capabilities expansion (2026-06-27, plan in docs/CAPABILITIES-PLAN.md): added a
  craft and persona-review layer on top of the playbooks, mapped onto company-building.
  Wave 1 landed: casa-build (the
  do-the-work executor over brain.mjs complete), casa-review (parallel-persona critic,
  confidence-gated merge, mode:agent for the router) + four always-on personas
  (customer-skeptic, investor-redteam, brand-copy-critic, analyst-honesty), casa-write,
  and scripts/copy-lint.mjs (deterministic no-em-dash / no-emoji / no-placeholder-name
  canon linter, under the zero-dep guard, tested). Suite 43 tests, preflight 31 checks.
  All four waves done 2026-06-27. Wave 2: casa-design + designers-eye auditor +
  scripts/design-check.mjs (zero-dep WCAG/token linter) + casa-synthesize. Wave 3:
  casa-strategy, casa-readout, evidence-researcher, casa-ideate. Wave 4: casa-compound
  + casa-learnings + casa-refresh, casa-experiment + brain.mjs experiment ledger,
  casa-pulse, casa-promote. The repo now ships 20 skills, 9 agents, 9 scripts (7 under
  the zero-dep runtime guard).
  Suite 50 tests, preflight 45 checks, all green. Two deterministic linters
  (copy-lint, design-check) under the zero-dep guard. Pending: a verification pass on
  the external-repo leads in CAPABILITIES-PLAN before any external lift.
- Existing-project onboarding (2026-06-27): casa-start now detects whether it runs
  inside an existing project. scripts/scan.mjs (zero-dep, tested) is a deterministic
  signal sweep (repo, deployed app, payments/auth/analytics deps, type hint) that
  excludes company-brain/ so an initialized-but-empty folder still reads as greenfield.
  If the folder has project files, casa-start spawns the project-scanner agent to
  deep-read README/CLAUDE.md/manifests/source and infer the profile (type, traits,
  stage tier, gaps) with evidence and confidence, then confirms and asks only the gaps
  instead of a cold interview. Empty folders keep the full questions.json interview.
  Casa never overwrites the project's own files; its state stays in company-brain/.
- Casa Console (2026-06-27, plan in docs/CONSOLE-PLAN.md): a read-only local visual
  layer under console/. console/bridge.mjs (zero-dep Node) reads company-brain, serves
  it in the Foundry shape via console/adapter.mjs (tested, tests/adapter.test.mjs) at
  /api/brain, and pushes SSE on change. The UI is the Foundry frontend lifted from hcv1
  (Vite + React + Tailwind) with mockData swapped for the live feed; it renders the
  build map as a node graph and a health dashboard. Launch via the casa-console skill
  (node console/bridge.mjs company-brain). Verified end to end against a real Memescope
  brain (80 tasks, 9 levels) rendering in the browser. console/ deps are exempt from
  the zero-dep guard (see rule 1 supersession); the plugin still works fully without it.
- Pulse and relevance (2026-06-27, plan in docs/PULSE-PLAN.md): recommendations now sync
  to the founder, not just the graph. Playbooks carry a department (build-index heuristic).
  router.mjs score multiplies by a deterministic pulse weight (by id/department/level from
  company-brain/pulse.json); brain.mjs sync reads it. casa-start runs an adaptive,
  until-confident pulse cascade writing pulse.md + pulse.json (focus, win, anti-priorities,
  weights). casa-next and casa-priority pass --weights to the router and deliver a reasoned
  briefing (Next / Also ready / Holding back), not a table; casa-priority refreshes the
  pulse each session. Rule 4 amended (above): engine owns eligibility + weighted score +
  gating; the advisor owns the final relevance ranking + reasoning. Tested in
  tests/weights.test.mjs (weights move rankings). NOTE: pulse.json (founder priorities,
  drives recommendations) is a different thing from the casa-pulse skill (weekly KPI recap).
- State/artifact reachability (2026-06-27, measured by the multi-agent quality test
  57 -> 70 -> 79 -> 83): closed the dead-member problem where 18-41% of a business's
  selected playbooks could never become ready. Two engine reconciliations in router.mjs:
  (1) a milestone state flag mints its backing artifact (has_paying_customers ->
  paying_customer), so a b2c business reaches its retention track though the only graph
  producer is the b2b contract-close playbook; (2) a consumed input gates readiness only
  when a member can produce it - a true orphan is ambient, not a permanent block; plus
  by-level milestone grants in achievedFlags (reaching L4 grants user/traffic flags, L5
  paying/revenue, L6 pmf), the universal producer a b2c climb needs. Catalog: software-ops
  playbooks (observability, data-backup, security-baseline, incident-response, onboarding,
  beta) now require builds_software so a non-software business never carries them as dead
  nodes; welcome/transactional email drop the redundant has_user_accounts requirement;
  onboarding-flow-design drops its circular has_user_accounts self-requirement; uses_mixpanel
  is now a static opt-in trait (nothing grants it) so mixpanel-reading is a clean non-member,
  not a dead one (GA4 is the grantable default). stage.mjs strips only the codebase flags
  (has_repo/has_deployed_app/has_datastore) for non-software, keeping user/traffic flags.
  Result: 0 permanently-unreachable members (recurring loops included) across 7 diverse
  profiles, was 18-41%. selection_fit 63 -> 80, output_usefulness 67 -> 78. Golden member
  counts shifted (b2b 97->96, b2c 80->79) as mixpanel-reading left universal membership.
  Suite 76 tests, preflight 48, all green.
- Ranking rebalance (2026-06-27): the score let critical-path slack dominate leverage, so a
  low-slack infra loop (incident-response) was the headline over a critical revenue play
  (north-star-metric, unit-economics), and a pulse promote (2x) could not overcome the gap.
  Replaced 1/(slack+1) with a gentle urgency band (1.3 -> 0.7 across SLACK_SPAN=10) so leverage
  and the founder's pulse lead; slack only breaks ties and nudges true bottlenecks. promote_ids
  bumped 2 -> 2.5. Now the default headline for a revenue business is north-star-metric (was #5),
  and a realistic pulse (promote_ids + department demote) moves retention to #1 and pushes infra
  off the top. All score/weights invariants preserved (strictly decreasing in slack, multiplicative
  pulse, revenue boost). Two ranking tests added (weights.test.mjs). Suite 78 tests, preflight 48.
- Deep engine: north star + criticality + fitness score (2026-06-27, plan in docs/DEEP-ENGINE-PLAN.md,
  designed by a multi-agent pass). The default (no-pulse) ranking is now business-model-aware, fixing
  the round-5 relevance regression (default ranking was model-blind). Four parts: (1) scripts/northstar.mjs
  derives a business-type north star (B2B SaaS -> ARR, B2C sub -> MRR/retention, marketplace -> GMV,
  physical goods -> repeat purchase, local -> rebooking), shown in NOW.md/build-map and used to seed the
  initial pulse; it does NOT feed a score boost. (2) Playbooks carry criticality (existential|core|growth|
  optional) + existential_at (stage promotions) + model_fit (recurring|transactional|self_serve|...); the
  authored 11-department retag replaced the heuristic (department + criticality now REQUIRED, lint-validated;
  codemod scripts/retag-catalog.mjs from scripts/catalog-tags.json). (3) The unified score in router.mjs
  gains an optional fit arg: lev * urgency * stageFit * fitFactor * rev / eff * pulse, where stageFit is a
  pure discount for stale low-level work and fitFactor = clamp(CRIT_W * modelFit, [0.7,1.8]); fit-absent is
  byte-identical to before (backward compatible). Result: a revenue subscription business now leads with
  unit-economics/cohort-retention/churn (existential at revenue) by DEFAULT, infra demoted to ~#8; the pulse
  still steers (cohort promote -> #1 at 8.952); marketplace/ecommerce/local are model-differentiated; 0 dead
  members held. (4) stage.mjs deriveInitialPulse seeds a model-aware pulse.json at onboarding; casa-start
  intake gained a Core pass (north-star + do-or-die constraint archetypes); casa-next/casa-priority frame the
  briefing around the north star, lead with existential work, and suppress recently-run recurring loops
  (advisor-side, rule 4). 5 physical-goods playbooks added (cogs/inventory/shipping/repeat-purchase/
  merchandising); 10 national content loops excluded for local_service_only. Catalog 107 -> 112; goldens
  b2b 96/112, b2c 79/112. Suite 96 tests, preflight 49, all green.
- Deep-engine validation (2026-06-27..28): a 20-company / 8-type adversarial harness drove the engine
  through iterative fix-and-retest rounds (78 -> 87 -> 89 -> 88 -> 87 -> 88 -> tier-fix). Each round the
  panel named precise defects; each was fixed and re-measured. Landed fixes: idea-tier pre_idea_only never
  dropped (37 dead -> 0; achievedFlags deletes it at level>=1); monetization -> trait derivation (subscription
  implies takes_payments/recurring_revenue); landing-page-cro circular requirement; constraint-aware seed
  (CONSTRAINT_SURFACE keeps the founder's do-or-die work visible, never seeded-done); a maintenance-loop
  discount (recurring infra set up earlier does not headline); motion model_fit (inbound->self_serve,
  outbound->sales_led so a sales-led B2B down-weights content); 17 new playbooks (physical-goods supply
  chain, activation, crypto/compliance, hardware build+demand, dunning, hiring, expansion, services
  utilization, ad-revenue); local + high_acv membership tightening. THE decisive change: a headline TIER in
  nextActions (3 founder-focus/promote, 2 existential, 1 core, 0 growth) sorted before the pulse-weighted
  score, so a do-or-die play reliably leads (the user's directive made structural) while the seeded
  north-star promote and a byId override still reach #1. deriveInitialPulse promotes the archetype's
  specific north-star plays (not whole departments). Verified stable: stage_accuracy ~95, selection_fit ~90,
  pulse_effect ~92, 0 real dead-ends on every company; relevance/output_usefulness ~88. Catalog 112 -> 127;
  goldens b2b 97/127, b2c 87/127. Suite 97 tests, preflight 49, all green.
- Next: a real interactive /casa-start in a live session (the one test only the user can run); per-stage
  catalog depth for the few sub-90 companies (crypto compliance detail, ad-monetization, launched-stage
  activation); Pay v0 BYO-key mode; publish prep (public repo + README + disclaimer).
<!-- /CASA:AUTO:repo-status -->
