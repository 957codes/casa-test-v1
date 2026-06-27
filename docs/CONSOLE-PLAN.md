# Casa Console Plan

A localhost visual layer over the company-brain: a live node graph plus an
observability and health dashboard. Read-only in v1. Status: planned 2026-06-27, for
review before any code.

## Decisions (2026-06-27)

1. Lives INSIDE capx-casa, in `console/`. This overrides prime directive 1 (terminal
   only, no GUI). See the contract change below.
2. v1 is a READ-ONLY live mirror. It visualizes the brain and updates as the founder
   works in the terminal. It never drives Claude Code and never writes to the brain.
3. Reuse the Foundry frontend from `hcv1` as-is (Vite + React + Tailwind, hand-built
   node graph). Lift the components, swap the mock data for a live brain feed.
4. Single company first. One company-brain in the current folder, one Console.

## The contract change

Prime directive 1 in CLAUDE.md becomes a dated supersession, in spirit:
"Terminal-first. The terminal is where work happens and the brain is mutated only by
the deterministic engine. A read-only local Console (`console/`) may visualize the
brain on localhost; it never mutates it and is never required." The MIT plugin runtime
stays zero-dependency; the Console is a separate local app with its own dependencies,
not a plugin component.

## Architecture (three pieces)

1. The brain. Already exists as plain JSON and text (`build-map.json`, `state.json`,
   `profile.json`, `NOW.md`, `finance/receipts.jsonl`, `experiments.jsonl`,
   `learnings.jsonl`). The data source. No new format.
2. The bridge: `console/bridge.mjs`. A zero-dependency Node server (node:http,
   node:fs). It reads `company-brain/`, transforms it into the Foundry shape (the
   adapter, below), serves it at `GET /api/brain`, and pushes a Server-Sent Event on
   any change (`fs.watch`) at `GET /api/events`. It also serves the built static UI.
3. The UI: `console/` (Vite + React + Tailwind, lifted from `hcv1`). The components
   already expect the Foundry shape, so the only UI change is replacing `mockData.ts`
   with a fetch to `/api/brain` plus an SSE subscription for live refresh.

The key new code is the ADAPTER (in the bridge, server-side, so the UI barely
changes): build-map.json plus the rest of the brain becomes Foundry's
`{ company, stages, tasks }`.

## Data mapping (the adapter)

| Foundry shape | Casa brain source |
|---|---|
| `company` (name, oneLiner, founder, metrics) | `profile.json` + receipts + metrics |
| `stages[]` (id, label, done, total) | `build-map.json` levels |
| `tasks[]` (id, title, dependsOn, ask, description) | level `nodes[]` (id, title, depends_on, selection_hint) |
| `task.state` | `done` -> completed; ready + `human_gate` -> approval or input; ready -> agent-ready; blocked -> locked |
| `needsAttention` | count of ready nodes plus human gates |
| `task.owner` (Department) | v1: derive from level or category. Phase 1: add a `department` tag to playbooks for the OrgView and per-area health. |

## Bridge API (v1)

- `GET /api/brain` -> the full Foundry-shaped snapshot.
- `GET /api/events` -> SSE; emits on any `company-brain/` change so the UI live-updates.
- (Static) serves the built UI from `console/dist`.

No write endpoints in v1. The Console only reads.

## The two surfaces

- Build map (node graph): levels as columns, playbooks as nodes, dependencies as
  edges, status as color, critical path highlighted, human-gate nodes flagged, hover
  to the detail panel (the `selection_hint`, the why, the deps, the command it maps to).
- Observability and health dashboard: level progress, spend via Capx Pay, loops due,
  experiments running and won and lost, learnings captured, rolled into a health
  reading and a list of areas not yet touched, surfaced as quests.

## Build order

1. `console/bridge.mjs` plus the adapter: read the brain, expose `/api/brain` in the
   Foundry shape, add the SSE change stream. Zero-dependency. A small unit test for the
   adapter (build-map fixture -> expected Foundry shape).
2. Lift `hcv1/src` into `console/`: replace `mockData.ts` with a fetch to `/api/brain`
   and an SSE subscription. Clean the lifted copy to canon (no em-dashes, no emojis).
3. `skills/casa-console/SKILL.md`: the launch command. Ensures the UI is built, starts
   the bridge, prints the localhost URL.
4. Health and gamification polish on the Dashboard (health reading, untouched areas).
5. (Optional) department tags on playbooks plus the OrgView.

## Guardrails (so in-repo does not degrade the plugin)

- `console/` is NOT a plugin component. Skill, agent, and hook auto-discovery never
  touch it. It is source the founder runs with `npm` from `console/`.
- The zero-dependency runtime guard still covers `scripts/` only. `bridge.mjs` stays
  zero-dep; the UI keeps its own `console/package.json` and `node_modules`.
- The Console is optional. The plugin works fully without ever running it.
- Lifted Foundry copy is cleaned to canon (no em-dashes, no emojis in founder-facing
  text). hcv1 is our own code, so there is no third-party licensing question.

## Deferred (not v1)

- Click-to-act (launch a command into the interactive session): Phase 2, subscription-safe.
- Headless triggers (`claude -p` on the founder's own API key): Phase 3, ToS 3.7 path.
- Department OrgView and per-area health: needs the `department` tag.
- Portfolio and HoldCo view across many brains.
