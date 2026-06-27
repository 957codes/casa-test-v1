# Capabilities Plan

The plan for the craft and review layer that sits on top of the playbooks.

## The premise

Casa is rich in "what to do" (the 100 playbooks) but needs the "how to do it well"
layer: craft skills that actually DO a category of work to a standard, plus a fleet of
persona agents that critique the artifacts produced. This adds that layer and maps it
onto building a company.

This fits Casa's architecture law (deterministic core, LLM only at the leaves): craft
skills and reviewer agents ARE leaf work. They sit on top of the existing
`brain.mjs complete` seam, so they extend the engine rather than compete with it.

## The keystone: the do then review loop

Two capabilities, highest leverage:

1. `casa-build` (SKILL). Takes any READY node from `build-map.json`, reads its playbook
   procedure and its `consumes` inputs from the brain, executes to a quality bar,
   writes the `produces` artifact into `company-brain/`, then calls
   `node scripts/brain.mjs complete <dir> <id>` to advance state. This is the one
   primitive that turns Casa from an advisor into a doer. Serves all levels;
   operationalizes every playbook with a `produces` artifact.

2. `casa-review` (SKILL orchestrator) plus a persona-reviewer fleet (AGENTS). Always-on
   plus conditional personas, each returning structured findings, merged and
   confidence-gated. Personas: `customer-skeptic` (Mom-Test lens), `investor-redteam`
   (kill-criteria), `brand-copy-critic` (canon enforcer), `analyst-honesty`
   (vanity-metric catcher), `designers-eye` (UI), plus conditional Pillar-1 critics
   when a decision touches the coin or custody and payments. Pairs with `casa-build` as
   the do then review loop.

## The UX / design capability

A full design lifecycle in the terminal, occupying L2 (establish the design system)
and L3 to L4 (build and verify UI):

1. `casa-design` (SKILL): reads the brand spec, detects the codebase design system,
   writes a brief, builds with quality principles, runs litmus checks, verifies
   visually, and writes a `company-brain/design/design-spec.json` token contract.
2. `designers-eye` (AGENT): a design auditor (AI-slop signals, typographic hierarchy,
   spacing, contrast and accessibility, semantic correctness, spec drift).
3. `design-check.mjs` (SCRIPT, zero-dependency): computes WCAG contrast ratios and
   checks tokens in the code against `design-spec.json`. The reviewer reads its JSON as
   grounded facts. Passes the same zero-dep preflight as the other scripts.

## Supporting craft capabilities

| Capability | Primitive | What it does | Levels | Operationalizes |
|---|---|---|---|---|
| `casa-write` + `copy-lint.mjs` | SKILL + SCRIPT | Drafts founder-facing copy; a deterministic linter enforces no em-dash, no emoji, no placeholder company names. The model drafts, the script enforces. | 1-5 | 009, 015, 017, 043, 057, 078, 092 |
| `casa-strategy` | SKILL | Creates and maintains a durable STRATEGY.md anchor, read as grounding by every other casa skill. | all | the whole chain |
| `casa-synthesize` | SKILL | Turns raw interview, usability, and survey notes into a structured insight memo. | 0,3,5 | 002, 005, 023, 091, 090 |
| `casa-readout` + `analyst-honesty` | SKILL + AGENT | Ingests real numbers and produces a vanity-resistant reading. | 4,5 | 038, 039, 034, 035, 040 |
| `casa-ideate` | SKILL | Generates many grounded moves, critiques all, surfaces survivors. | 0+ | 001, 046, 047, 094 |
| `evidence-researcher` | AGENT | Web research with citation discipline, enforcing the L0 evidence bar. | 0,2,6 | 001, 003, 004, 054 |
| `casa-experiment` + brain ledger | SKILL + SCRIPT | Frames an experiment; persists an append-only experiment ledger. | 4,6 | 093, 094, 095, 072 |
| `casa-compound` + `casa-learnings` + `casa-refresh` | SKILL + AGENT + SKILL | Capture a lesson, read it before new work, sweep for drift. | all | learnings.jsonl, decisions/ |
| `casa-pulse` | SKILL | Time-windowed KPI pulse (company plus on-chain), read-only. | 4,5 | 040, on-chain |
| `casa-promote` | SKILL | Drafts launch and announcement copy with the canon constraints hard-wired. | 4 | 049, 098 |

## Cross-cutting design conventions

- Mode duality: every skill exposes a structured-output mode (`mode:agent`) so the
  deterministic router can call it headless and parse a JSON contract.
- Confidence anchors (0/25/50/75/100), fingerprint dedup, cross-reviewer promotion,
  and suppress-below-threshold for `casa-review`, so it returns calibrated output
  instead of a wall of opinions.
- A two-tier agent output contract (compact return for merge, full artifact to a
  run-scoped temp dir).

## Pillar balance (50/50)

Most craft serves Pillar 2 (companies launching on Capx). Pillar 1 is held by the
conditional tokenomics and compliance review personas, by `casa-pulse` reporting
on-chain volume and fees alongside company metrics, and by `casa-promote` covering
token and feature announcements.

## Rollout

- Wave 1 (the keystone do then review loop): `casa-build`, `casa-review` plus the four
  always-on personas, and `casa-write` plus `copy-lint.mjs`.
- Wave 2 (design plus insight): `casa-design`, `designers-eye`, `design-check.mjs`,
  `casa-synthesize`.
- Wave 3 (strategy, metrics, research): `casa-strategy`, `casa-readout`,
  `evidence-researcher`, `casa-ideate`.
- Wave 4 (compounding and experiments): `casa-compound`, `casa-learnings`,
  `casa-refresh`, `casa-experiment` plus the brain ledger, `casa-pulse`, `casa-promote`.

## Quality bar (every wave)

- Deterministic helpers (`copy-lint.mjs`, `design-check.mjs`, the experiment ledger)
  get unit tests and stay under the zero-dependency preflight guard.
- Skills and persona agents get a frontmatter and a smoke check via `check-plugin.mjs`.
- All founder-facing copy stays free of em-dashes and emojis; tone institutional.

## Build status

- Wave 1: done 2026-06-27. casa-build, casa-review plus four always-on personas,
  casa-write, and scripts/copy-lint.mjs. Suite green.
- Wave 2: done 2026-06-27. casa-design, designers-eye, casa-synthesize, design-check.mjs.
- Wave 3: done 2026-06-27. casa-strategy, casa-readout, evidence-researcher, casa-ideate.
- Wave 4: done 2026-06-27. casa-compound, casa-learnings, casa-refresh, casa-experiment
  plus the brain experiment ledger, casa-pulse, casa-promote.

All four waves complete. The repo ships 20 skills, 9 agents, and 9 scripts (7 under the
zero-dep runtime guard). Suite 50 tests, preflight 45 checks, green. Optional next: the
casa-design-iterate extension.
