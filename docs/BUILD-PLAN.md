# Capx Casa — Build Plan

*Synthesised 2026-06-23 from internal research across architecture, the founder-100-things taxonomy, the competitive landscape, build-feasibility, compounding loops, GTM and wedge, and Capx strategic fit.*

> Update 2026-06-23: wherever this plan says "Capx Gateway", read "Capx Pay". The metered action-and-payments layer has been productized as a separate companion product, Capx Pay (non-custodial wallet, card on-ramp, settles on Tempo via MPP, invisible to the founder). Casa does not build payments; it routes paid actions to Capx Pay by capability id and reads the receipts Pay writes to company-brain/finance/receipts.jsonl. See docs/ARCHITECTURE.md "The Capx Pay seam".

---

## 0. What it is

Capx Casa is an **open-source (MIT) Claude Code plugin that is the control plane for building and scaling a company from the terminal.** It ships **skills** (one per founder job), **subagents** (specialist personas), **hooks** (always-on advisor + governance), a **loop engine** (recurring founder cadences), and a **router/orchestrator** (the brain), all reading and writing a durable **company brain** so every action compounds.

The thesis: *AI made one developer as productive as a team; Capx Casa does the same for the founder.* A solo founder is great at one thing but a company is 100 things at once — Casa selects which of those 100 matter for **your** business, sequences them, runs what it can, and tells you what to do next, forever.

**Market read:** every "AI cofounder" (cofounder.co, NanoCorp, Vybe, Taskade) is a **web app**; the comparable terminal-native tools are **dev-only**. The terminal-native, open-source, agents+skills+loops control plane *for company-building* is an **empty namespace** with a fast-moving distribution channel.

---

## 1. The assets we already have (this is not greenfield)

| Asset | Location | What it gives us |
|---|---|---|
| **100 playbooks** | `capx-ai/playbooks/playbooks-output/001-100.md` | The full curriculum. Each ~800-1,100 lines, cited, with triggers/inputs/phases/gates. (Drafts — only 3 are "live"; they are spec-grade.) |
| **Generic execution DAG** | `capx-ai/playbooks/flows/` | A 9-level model (Always-on → L0…L8) with entry/exit gates, `dependencies.md` (machine-readable prereqs + reverse index + `next_actions()` pseudocode), `parallelism.md` (within-level concurrency + topological "wave" batching). **This is the hand-authored v0 of the router.** |
| **Plugin spike** | `capx/capx-casa/` | MIT plugin scaffold (`marketplace.json`, `plugin/skills`, `plugin/agents`), a Phase-0 spike that ran 3 plays + a red-team reviewer gate, a locked `docs/PLAN.md` (2026-06-22), and `docs/port-map.md` (hc/v4 → skill porting). |
| **hc/v4 engine** | `capx/hc/v4/` | Reference source being ported: `node-configs.json` (rubrics → skills), DAG/`nodes.ts` (→ build-map), dept/reviewer personas (→ subagents). Retire the hosted runtime; absorb the value. |

**Implication:** the centerpiece (the router) is ~half-built as a generic startup DAG. The new work is (a) the **personalization layer** that prunes/reweights the DAG per business, (b) retrofitting per-playbook **metadata**, (c) the **live recommender + loop engine**, and (d) porting playbooks into executable skills.

**One framing flip:** the playbooks were written for the OLD autonomous hosted engine ("4-8h autonomous execution", API keys, "AI CEO agent"). The new model is **the founder interactive in Claude Code, the router recommending + running what it can in-session** — which is also the ToS-safe model. The content survives; the execution framing flips from autonomous → interactive.

---

## 2. Architecture — six layers

```
┌─────────────────────────────────────────────────────────────────┐
│  PLUGIN SHELL  (.claude-plugin/plugin.json + marketplace.json)    │
│  install: /plugin marketplace add  →  /plugin install capx-casa   │
├─────────────────────────────────────────────────────────────────┤
│  ROUTER / ORCHESTRATOR   ← the brain                              │
│   select → sequence → recommend → adapt                          │
│   (playbook-planner subagent + casa-router skill + SessionStart) │
├──────────────┬───────────────┬──────────────────┬───────────────┤
│  SKILLS      │  SUBAGENTS     │  LOOP ENGINE     │  HOOKS         │
│  (100 play-  │  (CFO/CMO/CTO/ │  (loops.yaml +   │  SessionStart  │
│   books as   │   reviewer     │   durable runner │  advisor,      │
│   SKILL.md)  │   personas)    │   + cron/MCP)    │  governance)   │
├──────────────┴───────────────┴──────────────────┴───────────────┤
│  COMPANY BRAIN   ← durable, git-tracked markdown state           │
│   profile · build-map · decisions · customers · metrics · ledger │
│   · learnings · per-function folders                             │
└─────────────────────────────────────────────────────────────────┘
```

Design law (from 12-factor agents + every memory/router finding): **deterministic code owns the graph math, scoring, gating, and state; the LLM is used only at the fuzzy leaves** (idea validation, final selection from a shortlist, drafting, phrasing the recommendation). This is what makes it trustworthy at 100 playbooks.

---

## 3. The Router (centerpiece)

Four stages. Each maps to proven prior art and to Claude Code primitives.

### 3.1 SELECT — which playbooks apply to *this* business
1. **Deterministic trait pre-filter (rules):** drop any playbook whose `applies_to.types` excludes the business type or whose `excluded_traits` are present. Removes ~60-70% of 100 instantly. (HTN precondition gating.)
2. **RAG shortlist:** embed the confirmed business profile + each survivor's `selection_hint`, retrieve top ~20. **Never reason over all 100 in-prompt** — RAG-MCP shows shortlisting triples tool-selection accuracy and halves tokens.
3. **LLM disambiguation:** planner LLM sees only the shortlist's frontmatter + hints, returns the final set with one-line *why* each.

Runs inside the **`playbook-planner` subagent** so the 100-playbook catalog scan never pollutes the founder's main context.

### 3.2 SEQUENCE — order into parallel tracks
Build the DAG from `depends_on` + `consumes`↔`produces`, run **Kahn's topological sort** (free cycle detection — name the offending pair if found), compute **CPM slack** to milestones. Each topo level = a parallel track. Emit `brain/build-map.yaml` (ordered nodes, tracks, slack, status). A `plan-auditor` subagent reviews once before commit (the LLMCompiler "joiner"). **The founder approves the build-map before execution** (human gate on the plan itself).

### 3.3 RECOMMEND — the always-on "what's next"
On every session the **`casa-router` skill** (fired by the **SessionStart hook**) reads `build-map.yaml` + `ledger/`, scores every *ready* node, and surfaces **one** primary action + parallelizable-now items + alternates:

```
score = eligibility_gate                 # 0 if deps unmet / human-gate pending / trait missing; else 1
      × leverage_weight                  # critical=4 high=3 med=2 low=1
      × (1 / (slack + 1))                # CPM: less slack = more urgent (critical path → slack 0)
      × revenue_boost                    # ×1.5 if blocks_revenue and money not yet flowing
      ÷ effort_weight                    # S=1 M=1.3 L=1.7 XL=2.2  (cheap leverage ranks up)
```
(Salesforce-NBA eligibility-then-value pattern + CPM slack as leverage term.) Rules compute the score; the LLM only phrases the *why now*.

### 3.4 ADAPT — incremental, at gates only
- Playbook completes → mark `done`, write `produces` to brain → dependents flip `blocked→ready` → **re-score only** (no replan).
- Gate fails / human-gate refused → mark `blocked`, propagate; if a *core* node is permanently blocked, planner finds an alternate path.
- Pivot / new info → update `profile.yaml`, re-run selection **on the delta**, **diff** against current map (content-hash preserves `done` work; never re-run completed playbooks). Auditor reviews the diff before commit.
- No playbook fits (novel business) → ChatHTN fallback: LLM proposes an ad-hoc step flagged un-templated, runs it, files a candidate new playbook for review (library grows, Voyager-style).

### 3.5 Playbook metadata schema (the machine-readable contract — frontmatter on every playbook)
```yaml
id: incorporate-us-entity
title: Incorporate a US entity
stage: foundation                 # validation|foundation|build|gtm|monetize|operate|scale
# SELECTION
applies_to: { types: ["*"], requires_traits: [], excluded_traits: ["pre_idea_only"] }
relevance: core                   # core|recommended|optional|conditional
selection_hint: "Needed by any business that will take revenue or raise. Skip if just validating."
# ORDERING (DAG edges)
depends_on: ["validate-idea"]
soft_after: ["name-and-brand"]
produces: ["legal_entity","ein"]
consumes: ["confirmed_business_idea"]
# RECOMMENDER
effort: M                         # S|M|L|XL
leverage: high                    # low|med|high|critical
reversibility: hard               # easy|medium|hard
human_gate: true
blocks_revenue: true
recurring: false                  # true = a loop, not a checkbox
typical_milestone: "company-exists"
```
The router reads only frontmatter to plan (cheap, like reading `Cargo.toml` not the source). `playbooks/_index.json` is generated + CI-validated (every `consumes` has a producer; no cycles; `selection_hint` required).

### 3.6 Worked example
*"I want to build a Solana memecoin analytics SaaS."* → intake disambiguates **a SaaS that reads on-chain data** (`no_token`), not a token project → trait pre-filter drops all tokenomics/contract/marketplace/ecommerce playbooks → selection keeps validate-idea → define-icp → incorporate → landing-page → analytics → **solana-data-pipeline** (kept: `reads_onchain_data`) → mvp-dashboard → stripe-billing → cold-outbound (prosumer+funds) → content/SEO → waitlist. Tracks: Foundation (critical path, carries `blocks_revenue`), Product (data-pipeline scheduled first = highest tech risk), Demand (parallel). First 3 recommended: **validate-idea** (now), then define-icp, then landing-page in parallel; incorporate flagged `human_gate`+`reversibility:hard`, surfaced but blocked until validation.

---

## 4. The Company Brain (the memory substrate everything compounds on)

Git-tracked markdown on disk (human-readable, diffable, the history *is* the institutional memory). Structure:

```
company-brain/
  profile.yaml            # business type, traits, ICP, confirmed idea  (router input)
  build-map.yaml          # the sequenced DAG + status  (plan of record)
  ledger/                 # append-only: what ran, what it produced, gate decisions
  decisions/              # one file per significant decision (context, options, choice, review-date)
  customers/ICP.md        # living ICP, updated by the customer-insight loop
  metrics/                # weekly pulse docs + baselines (seasonality)
  growth/                 # experiments + experiment-log + promoted playbooks
  sales/ · fundraising/ · hiring/ · content/ · market/positioning.md
  learnings.jsonl         # append-only; recalled at the start of every loop/skill
  system/retros/          # the meta-loop that improves the other loops
```

**Patterns to steal (license-aware):**
- **SKILL.md frontmatter spec** — `anthropics/skills` (Apache 2.0, 154k★). The canonical interface; every Casa skill uses it.
- **Two-tier memory** — `letta` core (always-in-context: current goals/OKRs) + archival (historical). Apache 2.0.
- **Temporal knowledge graph for decisions** — `getzep/graphiti` (Apache 2.0): facts with validity windows, superseded not deleted → "what did we decide about pricing on 2026-04-01?"
- **L0/L1/L2 context tiering** — `OpenViking` pattern (one-line + overview + full): ~91% retrieval-token reduction. (Implement the pattern; main lib is AGPL — don't vendor.)
- **Default local memory backend** — `engram` (MIT, single Go binary, SQLite+FTS5, 20 MCP tools, git-sync) — ship as Casa's zero-dep `--memory-backend`; `mem0` (Apache 2.0) as the scale option.
- **Compounding discipline:** every skill *reads* the relevant brain folder + `learnings.jsonl` before acting and *appends* what it learned after. The learnings must be **force-read at the start of the next loop**, not just written at the end (else it's a museum, not a flywheel). A periodic knowledge-audit prevents stale-ICP poisoning.

---

## 5. The Loop Engine (loops & cron, ToS-honest)

### 5.1 The ToS line (this shapes the whole design)
Anthropic Consumer Terms **§3.7**: automated/non-human access is prohibited **except via an Anthropic API key or first-party features.** Therefore:

| Tier | Mechanism | Allowed on Max sub? | Use in Casa |
|---|---|---|---|
| **v1 interactive** | SessionStart hook, `/loop` (in-session), in-session scheduling, on-demand skills (`/casa-pulse`) | **Yes** | Everything a founder runs *while present* |
| **v2 autonomous** | headless `claude -p` on OS cron / persistent tmux, Agent SDK | **No — requires API key** | "Operate mode" overnight loops → metered Capx Gateway path |

So "shells open running cron jobs" is legitimate **on the founder's own machine with their own API key** — never on a Max subscription. Design v1 to be 100% subscription-safe and interactive; defer autonomous operation to the metered path.
*(Caveat: specific feature names some research surfaced — a "Routines" cloud-cron, "Desktop Tasks", a June-15 metered-credit pool — must be verified against live docs before we cite them in code or copy. The §3.7 principle is solid.)*

### 5.2 The always-on advisor = a SessionStart hook
Every time the founder opens Claude Code, the hook reads the company brain + build-map and prints **status + top-3 next actions before the first turn.** This is the "keep recommending what's next" behavior, and it's the single most important v1 primitive. Free, subscription-safe. (Pattern: `disler/claude-code-hooks-mastery` for the hook scaffolding.)

### 5.3 Loop manifest + runtime
- **Manifest (founder-facing): `loops.yaml`**, Kestra-inspired — declares `trigger: cron|event|webhook`, steps, retry policy, hooks to fire, and the `brain/` key where output lands. Founders read/edit YAML, not TypeScript.
- **Runtime (v2/operate): Trigger.dev model** (Apache 2.0, TS-native, checkpoint-resume, no timeouts, cron to 1yr, **versioned tasks** so a redeploy lets in-flight loops finish — critical for financial-close/compliance loops). `restate` (Apache 2.0, single binary) is the lightweight embeddable alternative. `opencode-scheduler` (MIT, launchd/systemd, no-overlap) is the simplest v2 bootstrap.
- **Integration rule: integrate, don't vendor.** Wire external tools via MCP/REST against the founder's own/self-hosted instance; never bundle AGPL/SUL source. (`activepieces` MCP-first, MIT, is the safe glue; `n8n` is Sustainable-Use-License — self-host/webhook only.)

### 5.4 The loop catalog (deduped across all agents) — each {cadence, trigger, tier}
**Compounding / governance (ship first):**
- SessionStart advisor (per session, v1) — status + next action
- Weekly Pulse / WBR (Mon, v1) — metrics scorecard + anomalies → `metrics/`
- Customer-insight digestion (weekly/event, v1) → updates `customers/ICP.md`
- Decision-log capture (on decision, v1) → `decisions/`
- Weekly retro / system-improvement (Fri, v1) — the meta-loop that improves the loops
- Weekly-brain-harvest (Mon, v2) — extract last week's decisions into the temporal graph
- Skill-eval (PostToolUse hook, v1) — LLM-as-judge on skill output; flag regressions
- Memory-decay-prune (30d, v2) — recency-weighted archive of stale learnings
- Decision-escalation-gate (PreToolUse when confidence/risk threshold, v1) — suspend → founder approve/reject (LangGraph interrupt pattern)
- Ratchet-improve (nightly, v2) — bounded experiment loop, commit only validated wins (karpathy/autoresearch `program.md` pattern)

**GTM:**
- Competitor-pricing / change watch (daily-6h, v2) — `changedetection.io`/Firecrawl diff → alert
- Content-repurpose (on new content, v1/v2) — long-form → thread/post/short scripts/newsletter
- Keyword-rank tracking (Mon, v2) — `SerpBear` API delta → refresh underperformers
- GEO/AEO brand-visibility (Sun, v2) — citations across ChatGPT/Perplexity/Gemini
- Lead-enrichment-on-signup (event, v2) — enrich → ICP-score → route hot/cold
- Outbound prospecting (Tue/Thu, v2) — ICP → scored leads → personalized cadence
- Growth-experiment scorecard (Fri, v2) — PostHog experiments → significance → archive losers
- Social-listening triage (daily, v2) — crawl4ai → classify → route to support/backlog/intel

**Ops / finance:**
- Weekly burn / runway (Mon, v1/v2) — bank + MRR → runway, alert on threshold
- Monthly financial close (1st, v2) — reconcile → categorize → P&L → founder approve
- MRR/ARR pulse (daily, v2) — new/expansion/churn → brain + trend store
- Compliance-deadline heartbeat (Sun + on doc upload, v1/v2) — extract deadlines → 30/14/7/1-day alerts
- Support-ticket triage (15m/event, v2) — classify → tier-1 draft → escalate tier-2
- Pipeline-health watchdog (hourly, v2) — watch the other loops; retry/pages on failure

---

## 6. The 100 playbooks → skills migration

1. **Retrofit frontmatter** onto all 100 by lifting `dependencies.md` (`preconditions_*`, `unblocks`) + `parallelism.md` (clusters) + the `domain` notes into each file's header (the §3.5 schema). Mechanical, high-value.
2. **Generate `playbooks/_index.json`** (the router's catalog) + CI lint (no cycles, every `consumes` has a producer, `selection_hint` present).
3. **Port body → executable SKILL.md** per playbook: keep the gates/HITL/confidence model; flip "autonomous 4-8h" framing to interactive; replace hardcoded API assumptions with MCP/skill calls; tag `recurring: true` playbooks as loops, not checkboxes.
4. **Accelerant:** lift patterns/skills from MIT prior art rather than authoring from zero — `ericosiu/ai-marketing-skills` (16 categories, statistical rigor), `indranilbanerjee/digital-marketing-pro` (158 skills + 25 agents), `YALC` (24 lemlist skills + intelligence-store), `product-on-purpose/pm-skills` (67 PM skills with CI-enforced output contracts — steal the "When NOT to use" + enumerated-output contract as the quality bar for ALL Casa skills).

---

## 7. Capabilities to lift — the steal list (license-aware)

**Near-complete fork candidates (read before writing equivalent code):**
| Repo | License | Why |
|---|---|---|
| `hilash/cabinet` | MIT | Closest public artifact to Casa: "AI-first startup OS", git-backed markdown-on-disk, node-cron, 20 C-suite agent templates, git-auto-commit. Read its state layer in full first. |
| `garrytan/gbrain` | MIT | Git-backed markdown brain + Postgres sync + hybrid search + 43 skills + 30 MCP tools; `think`/`capture`/synthesis-with-citations + gap-analysis = the CEO subagent's core. |
| `engram` | MIT | Drop-in default memory backend (single binary, 20 MCP tools, git-sync). |
| `anthropics/skills` | Apache 2.0 | Canonical SKILL.md format — adopt verbatim. |

**Patterns to steal (reimplement, don't vendor):**
- Router/graph: Kahn topo-sort + CPM slack; LLMCompiler joiner; RAG-MCP shortlist; Voyager/ChatHTN library-growth fallback.
- Ratchet loop: `karpathy/autoresearch` (keep-or-discard on git).
- GTM learning: YALC `intelligence-store` (campaign outcomes statistically update ICP/A-B weights — the GTM compounding mechanism).
- Hooks: `disler/claude-code-hooks-mastery` (all 13 lifecycle events, UV single-file).
- Self-review: `Praison` (`min_reflect/max_reflect` as a PostToolUse critique).
- Agent identity-as-repo: `open-gitagent` (each subagent = SOUL.md/RULES.md/memory in git → `git log` audit).

**Wire via MCP/REST (integrate, don't vendor):**
- Web intelligence: `crawl4ai` (Apache 2.0, local-first) as the universal research primitive; `firecrawl` MCP (use SDK/MCP, core is AGPL).
- Product: `PostHog` (MIT core) experiments/flags/analytics API.
- Knowledge/RAG over company tools: `Onyx` (MIT, 50+ connectors).
- Support: `Chatwoot` (MIT, Captain AI + webhooks).
- SEO/GEO: `SerpBear` (MIT REST), GEO-optimizer (MIT, ships as MCP), ICP-Intelligence MCP.
- Social: `Mixpost` (MIT) preferred over `Postiz` (AGPL).
- Billing/finance: `Lago`/`Midday` (AGPL — API only, never bundle).
- Eval/observability: `langfuse` (MIT core), `future-agi` (Apache 2.0, 18 guardrail scanners as PreToolUse).

**Distribution:** publish to the Claude Code plugin marketplace + 3rd-party directories (`jeremylongshore/claude-code-plugins-plus-skills` + `ccpi`, claudemarketplaces.com, tonsofskills.com).

**Avoid bundling (copyleft/restrictive):** n8n (SUL), Postiz/OpenMontage/listmonk/Lago/Midday/Plane/Metabase (AGPL), Phoenix (ELv2), OpenViking main lib (AGPL).

---

## 8. Wedge + GTM

**Wedge (ship first): `casa validate`** — one command: one-line idea → live landing page on a real URL + scored pain-evidence from communities + 3 positioning angles + wired waitlist. Most *frequent* founder job, most *procrastinated*, most *demoable*, and it sits *before* the transaction so it earns the right to sell every step after (validate → build → `casa company` setup → operate). It is also exactly **L0** of the existing flow + the GO-decision where the router personalizes the rest.
Runners-up: `casa company` (day-zero setup — best Gateway anchor but fires once), content engine ("The Flywheel" — strong marketing arm, weak front door).

**Beachhead:** technical solo founders / indie hackers already living in Claude Code and building in public — zero install friction, and they *are* the distribution channel.

**Killer demo (<90s):** `casa validate "AI tool that drafts insurance-appeal letters for dermatology practices"` → agent streams real steps (pull pain evidence, score, draft angles, deploy) → a real landing page renders live → real email signups tick in on screen. Hook: *"I turned a tweet into a live business in one command."*

**90-day sequence:** Days 1-30 build audience + artifact in public, ship repo + demo week 4; Days 31-60 one-skill-a-week launches, niche validation templates as lead magnets, first soft Gateway touch; Days 61-90 "ship a real company" challenge, public metered Gateway pricing, first numbers thread.

---

## 9. Value capture + two pillars

**Free/paid line = "thinking vs. doing-that-costs-real-money."**
- The repo (skills, agents, router, loops, brain) — **free, MIT forever.** Never paywall prompts (kills distribution; a well-established precedent).
- Inference — **free on the founder's own Claude Max plan**, interactive (Casa COGS ≈ $0).
- **Capx Gateway** — metered MCP brokering real-world *actions* (domains, incorporation, email, creative gen, hosting) at 1.5-3x; also the legitimate home for v2 autonomous/operate loops (API-backed). The revenue engine. Keep it **independent of the Max arbitrage** so an Anthropic ToS change degrades the stack but not the business.

**Two-pillar tie (the connective tissue must ship, not defer):** companies built in Casa clear a verified-traction gate → tokenize on Solana → CAPX is the mandatory base pair → trading fees + 35/35/30 split + 3-5% protocol token retention + real-revenue accrual. The bridge is the **engine-attested metrics endpoint** — the company-brain's MRR/traction becomes the on-chain eligibility proof. Treat that endpoint as part of the launch wedge, or Pillar 2 races ahead while Pillar 1 stalls.

---

## 10. Phased roadmap

**Phase 0 — done.** Plugin scaffold + spike proved the model runs on native Claude Code.

**Phase 1 — the wedge (≈3-4 wks).** `casa validate` + company-brain scaffold + SessionStart advisor hook + 3-4 supporting skills + the v1 interactive loop set (pulse, decision-log, retro). Retrofit frontmatter on the L0/L1 playbooks only. Public repo, marketplace listing, killer demo, build-in-public launch. *This is the whole game for now.*

**Phase 2 — the router + full library + loops (≈6-8 wks).** Build the `playbook-planner` subagent (select+sequence) + `casa-router` recommender; retrofit frontmatter on all 100 + `_index.json` + CI lint; port the highest-leverage playbooks to skills (lift from MIT packs); ship the loop manifest + the v1 loop catalog; add `casa company` (first Gateway touch).

**Phase 3 — operate + on-chain (metered).** Trigger.dev-model durable runner for autonomous v2 loops via the Gateway/API path; the metrics-attestation → tokenization hook; CAPX settlement. (This is where `capx-runtime` / the Paperclip fork likely lives.)

---

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Wrong playbook selection | Deterministic trait pre-filter is a hard floor the LLM can't override; RAG shortlist + `selection_hint`; `plan-auditor`; founder approves the build-map. |
| Brittle ordering / cycles | Kahn names the offending pair; prefer `soft_after` over `depends_on`; CI lint the catalog. |
| Over-recommending / nagging | One primary action + collapsible alternates; cooldown on deferred/refused; respect `human_gate`. |
| ToS / autonomy over-reach | v1 strictly interactive + subscription-safe; never market "24/7 autonomous"; operate-mode only on API key. |
| License contamination of MIT repo | "Integrate, don't vendor"; AGPL/SUL via MCP/REST only; CI license-check on dependencies. |
| Stale brain poisons loops | Knowledge-audit step in the retro loop; temporal facts (graphiti) supersede, not overwrite. |
| Pillar-1 lag (50/50 imbalance) | Metrics-attestation bridge is a Phase-1/2 deliverable, not Phase-3. |
| Platform dependency on Anthropic | Gateway monetizes actions not inference; SKILL.md is cross-harness (Codex/Cursor/Gemini read it). |
| hc/v1 (GUI) duplication | Resolve the relationship (decision below) before parallel teams build the same funnel twice. |
| Name collision ("Casa" ×3) | Keep product name; pick a clean public repo handle (957codes/capx-casa & capx-casa-engine are taken). |

---

## 12. Open decisions to lock

1. **First wedge** — recommend `casa validate`. (Alts: `casa company`, content engine.)
2. **hc/v1 (React GUI build-map) relationship** — recommend it becomes the *GUI front-end for the same engine* later (one engine, two surfaces: terminal now, GUI for non-technical founders next), with terminal-first focus until the wedge proves out.
3. **Build home / repo** — recommend: keep building in `capx/capx-casa/`; prep a clean public GitHub repo (new handle) for distribution, push only on approval.
4. **(Confirm) name** — you said "Capx Casa"; canon agrees (Casa = the build product). Keep it; just disambiguate the repo handle.
