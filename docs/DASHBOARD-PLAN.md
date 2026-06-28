# Casa Dashboard Plan: the interactive Foundry (2026-06-28)

Turn the read-only Console into an interactive cockpit: see where you are, score and improve
completed work, chat per-node to make it better, and initiate real tasks from the graph. The
UI is lifted from hc/v4 (the same Foundry our console was cut from); the headless agent engine
hc/v4 uses is replaced by Casa's two execution paths -- the deterministic brain and the
founder's own interactive Claude Code session.

## What hc/v4 already proves (lift the UI, drop the engine)

- Build-map board (stage columns + node cards + dependency edges + hover-to-light-the-chain).
- Node-detail panel (right slide-over), state-driven: locked / ready / needs-input / needs-approval /
  working / completed. Shows the deliverable summary, output files, intake answers, activity, chat.
- `NodeChat` "Refine with chat": a message starts a short refinement run that redoes/expands the
  deliverable; the reply streams back.
- Quality grading: a `grade` LLM pass over the deliverable returns `{ pass, score 0-100, gaps }`
  against a per-node rubric; if it fails, ONE bounded revision run fixes the gaps.
- Live activity feed, run telemetry (cost/turns/tokens), loops view, attention/health home.

What does NOT port (rules 2/3/5): hc/v4 executes every node as a headless background agent on
metered OpenRouter/DeepSeek keys, persists to Supabase, stores deliverables in a per-company
GitHub repo, and bills via Stripe credits. Casa keeps the brain deterministic, runs interactive
only, and routes money through Capx Pay. So only the UI components + the client API SHAPE survive.

## The architecture: the bridge becomes a two-way mailbox

`console/bridge.mjs` today is a one-way reader (GET /api/brain + SSE on fs.watch; no write surface,
which is how rule 1 was enforced). Make it a mailbox between the browser (clicks) and the founder's
running Claude Code session, with TWO paths and NO headless execution:

1. DETERMINISTIC PATH (the bridge runs `brain.mjs` directly, no LLM). Intents that map 1:1 to a
   `brain.mjs` subcommand: `complete` (mark an already-eyeballed node done), `loop-ran`,
   `priority-ran`, `experiment` (log a record). The bridge shells `node scripts/brain.mjs <cmd>
   <brainDir>`. Running deterministic code is not automated agent use (rule 5 untouched) and
   `brain.mjs` stays the SOLE writer of brain state (rule 4 untouched). The existing fs.watch fires
   SSE and the UI re-renders for free.

2. WORK PATH (the founder's interactive session executes; the bridge only queues). Intents needing
   real LLM work -- "run this node" (-> casa-build), "refine with chat" (-> refine + casa-review),
   "score this" (-> casa-review), "what's next" (-> casa-next) -- are appended to an append-only
   queue file; the bridge returns `{ queued, id }`. A new `casa-serve` skill, run by the PRESENT
   founder (`/casa-serve`, or nudged by a SessionStart/notification hook), drains the oldest pending
   intent, dispatches to the matching skill, and ends in `brain.mjs complete` -- closing the loop so
   SSE re-renders the node as done. Because the founder typed the command, it is interactive and
   subscription-safe. The bridge MUST NOT spawn `claude -p` to auto-drain (that headless path is
   reserved for operate mode on the founder's own API key; `operate.mjs` already guards it).

New bridge routes (zero-dep, node: only): `POST /api/intent` (append to queue; deterministic kinds
may execute `brain.mjs` inline and return the result), `GET /api/queue` (pending/running, to drive a
"queued / working" indicator and finally a REAL "agent" node state), `GET /api/messages?node=<id>`
(per-node chat history). SSE also emits on queue change so a queued click shows progress immediately.

New files, append-only JSONL, OUTSIDE the brain state files:
- `company-brain/console/queue.jsonl` -- one intent per line `{ id, ts, kind, nodeId, payload, status,
  result }`. Mirrors hc/v4's runs table.
- `company-brain/console/messages.jsonl` -- per-node chat `{ id, nodeId, role, content, intentId, ts }`.
- a per-node activity log the `casa-serve` executor appends as it works.

## The four capabilities you asked for, mapped to concrete builds

1. SEE WHERE YOU ARE / WHAT'S DONE -- already shipped (the build map). Enhance: a REAL "working" node
   state fed by `/api/queue`, and the dependency-chain hover from hc/v4.

2. NODE TLDR + ADVISOR NOTES (on click) -- the node-detail panel. This is where the REASONING LAYER
   we just built surfaces per-node: a one-line TLDR, "why this matters for your goal" (the casa-next
   reasoning: the ladder + the bridge to your do-or-die), the playbook's `selection_hint`, and for a
   completed node the deliverable summary + output files (port `NodeOutput.tsx`). The dashboard
   becomes the visual surface for the advisor's reasoning.

3. QUALITY SCORE + MAKE-IT-BETTER on completed nodes -- lift hc/v4's `grade.ts` pattern as a
   `casa-review` mode: score the deliverable 0-100 against a rubric, list the gaps, and surface the
   score on the node card + detail. "Make it better" is a one-click intent (-> casa-build revision ->
   re-score) or the refine chat. Add DETERMINISTIC checks alongside the LLM score (required sections
   present, word count, no placeholder names via copy-lint) so the grade is not purely model opinion.

4. INITIATE TASKS / INTERACT -- wire the already-built but dead TaskPanel buttons (Mark complete,
   Approve, Request changes, Provide input, Launch agent) to `POST /api/intent`. Deterministic ones
   go straight to `brain.mjs`; work ones queue for `casa-serve`. Port `NodeChat.tsx` (repointed at
   `/api/intent` + `/api/messages`). Loops view toggles via a `loop-ran` / loop-toggle intent.

## What the catalog needs (the one real gap)

hc/v4 nodes carry a structured `deliverable { file, maxWords, sections[] }` + `rubric`; Casa
playbooks carry `selection_hint` + a prose body (the procedure) but no machine-gradeable deliverable
spec. To score and improve completed work, add two optional frontmatter fields to playbooks:
`deliverable` (what good output is: the artifact + required sections) and `rubric` (how to grade it).
Author them for the high-value playbooks first; default to a generic rubric otherwise. This is the
substrate for the quality score and the refine loop.

## Phasing

- Phase 0 -- Mailbox + deterministic path. Rule-1 amendment (the bridge may append founder intents to
  a queue OUTSIDE brain state; still never mutates brain state). Add `POST /api/intent`, `GET
  /api/queue`, queue.jsonl, SSE-on-queue. Wire Mark-complete / resolve-gate / log-experiment / loop-ran
  to `brain.mjs`. Real "working" node state. (Engine + bridge; small, high-trust.)
- Phase 1 -- Node-detail panel. Port `NodeOutput.tsx`; build the TLDR + advisor-notes view sourced from
  the reasoning layer (selection_hint + casa-next reasoning + deliverable summary). Read-only first.
- Phase 2 -- Quality scoring. `deliverable` + `rubric` fields on the top playbooks; a `casa-review`
  grade mode (LLM score + deterministic checks); show the score on card + detail.
- Phase 3 -- The work path. `casa-serve` skill (drain queue -> dispatch casa-build/casa-review ->
  brain.mjs complete). Port `NodeChat.tsx`; wire the run-node / refine / make-better intents. Per-node
  activity + the live feed.
- Phase 4 -- Loops, the attention/health "game to fix things", and Capx Pay spend display (route any
  money intent through casa-pay, surface the quote, founder confirms; no console button ever charges).

## Reconciliations (must be dated into CLAUDE.md)

- Rule 1: the bridge may accept founder intents and append them to a request queue outside the brain
  state files; it still never mutates `build-map.json` / `state.json` / `profile.json`.
- Rule 4: a click can never flip a node's status directly; it calls `brain.mjs` or requests a skill
  that ends in `brain.mjs complete`. The graph math, gating, and score stay the engine's.
- Rule 5: the executor is the present founder's interactive session, never a headless process. No
  `claude -p` auto-drain (operate mode only, on the founder's own key).
- Rule 8: any money-spending intent routes to `casa-pay`, surfaces Pay's quote, founder confirms.

## Lift vs build

- LIFT (UI, repoint Supabase -> bridge): `NodeChat`, `NodeOutput`, `LiveStatusPanel`, `LoopsView`,
  `EventDetails`; the client api.ts operation shape; the store's run->Task / event->activity derivation.
- LIFT (pattern): `grade.ts` rubric-grader (-> casa-review mode), `caps.ts` loop-detection (for any
  future operate-mode runs), the event-outbox -> live-feed pattern.
- BUILD (net-new): the bridge mailbox routes + queue/messages JSONL; the `casa-serve` skill; the
  `deliverable`/`rubric` playbook fields + their authoring; the node TLDR/advisor-notes panel wired to
  the reasoning layer; the deterministic quality checks.
