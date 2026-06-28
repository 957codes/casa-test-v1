# Casa Console

A local, interactive visual control surface for a Casa company brain. It renders the
build map, a per-node detail panel, the company's health, its recurring loops, and
its Capx Pay spend, served on localhost from the same plain-text brain the terminal
reads. It is optional. Everything in Casa works without it.

The fastest way to use it is the `/casa-console` skill, which builds it once and
starts it for you. The steps below are what that skill runs.

## Quick start

```
# one-time build of the local app (the plugin runtime stays zero-dependency;
# only this folder has its own dependencies)
cd console && npm install && npm run build

# serve it, pointed at a company brain
node console/bridge.mjs path/to/company-brain --port 4317
```

Open http://localhost:4317. The bridge reads the brain on every request and pushes a
live update (Server-Sent Events) whenever the brain changes.

For UI development with hot reload, run `npm run dev` in this folder and start the
bridge separately; Vite proxies `/api` to the bridge.

## What you can do

- See the whole company. The build map is a node graph grouped by level, colored by
  one of five states (done, agent can do it, needs your input, needs your approval,
  blocked by earlier work), with the items awaiting you flagged.
- Open any node. The detail panel shows a plain-language TLDR and advisor notes, the
  gradeable deliverable spec (what a good output contains), a quality score with its
  gaps for finished work, the rendered output, recent activity, and a refine chat.
- Start work. Action buttons run a ready play, mark it complete, approve or request
  changes on a gate, or re-score and improve finished work. A per-node chat asks for
  a change in words.
- Watch health. A single health score breaks into the dimensions that move it
  (do-or-die coverage, momentum, quality of finished work, open gates, loop hygiene),
  with per-department roll-ups and a "make done work better" list.
- Track loops and spend. The Loops view shows every recurring cadence with its due or
  locked status; the Health view shows spend to date through Capx Pay, labeled
  distinctly and never charged here.

## The two-way model (why a click is safe)

A click never mutates brain state directly and never starts an agent. It does one of
two things:

- Deterministic intent (`complete`, `loop-ran`, `priority-ran`, `experiment`): the
  bridge runs `scripts/brain.mjs` inline. The engine is the only writer of company
  state, so a click can never skip a gate, complete a blocked node, or invent a
  dependency. The result shows at once.
- Work intent (`build`, `chat`, `review`, `next`, `resolve-gate`): the bridge appends
  it to `company-brain/console/queue.jsonl` and shows "Queued. Run /casa-serve". The
  founder drains the queue with the `casa-serve` skill in their own interactive Claude
  Code session. The bridge never runs an LLM, never spawns an agent, and never runs
  headless (Anthropic Consumer Terms 3.7).

The bridge binds to `127.0.0.1` only. Request state (the queue and messages) lives
under `company-brain/console/`, outside the brain's own state files.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/brain` | The whole brain in the UI shape (company, stages, tasks, health, loops, spend) |
| GET | `/api/queue` | The intent queue |
| GET | `/api/messages?node=` | The per-node chat history |
| GET | `/api/activity?node=` | Recent activity, optionally per node |
| GET | `/api/output?node=` | The deliverable files a node produced |
| POST | `/api/intent` | Submit an intent (`{ kind, nodeId, payload }`); deterministic runs inline, work queues |
| GET | `/api/events` | Server-Sent Events; emits on every brain change |

## Layout

- `bridge.mjs` -- the localhost server. Zero-dependency (node builtins only). Reads
  the brain, computes loop status and spend, routes intents, serves the built UI.
- `adapter.mjs` -- a pure transform from the company brain into the UI shape,
  including the health model (`computeHealth`). Unit-tested from the main suite
  (`tests/adapter.test.mjs`).
- `src/` -- the React + Vite + Tailwind UI. `feed.ts` talks only to the bridge over
  relative `/api/*` paths; there is no other backend.

The Console adds no hosted inference, no login, and no dependency to the plugin
runtime. It is a window onto the brain plus a mailbox for the founder's own session.
