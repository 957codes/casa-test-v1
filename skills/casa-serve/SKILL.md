---
name: casa-serve
description: Drain the Console work queue. The interactive founder runs this to execute the intents the dashboard queued (run a node, refine with chat, score, advise, resolve a gate), one at a time, dispatching each to the matching skill and closing it through the deterministic brain. Use when the user types casa-serve, when a hook nudges them that work is queued, or when they ask to process the dashboard queue.
argument-hint: "[a queue intent id, or blank to drain the oldest pending]"
---

# casa-serve

The work queue drain. The Console bridge (console/bridge.mjs) is a mailbox: a click
in the dashboard appends a WORK intent to `company-brain/console/queue.jsonl` and
returns. The bridge never executes it. This skill is the executor, and the executor
is the PRESENT founder. They typed `/casa-serve` (or a SessionStart or notification
hook nudged them), so every run is interactive and subscription-safe. casa-serve
never spawns `claude -p`, never runs a background agent, and never auto-loops without
the founder. It picks up one queued intent, does the real work by dispatching to the
existing skills, and ends each completed node in `brain.mjs complete` so the
deterministic engine re-renders and the dashboard updates.

## The queue contract

`company-brain/console/queue.jsonl` is append-only, one intent per line:

```json
{ "id": "...", "ts": "...", "kind": "build|chat|review|next|resolve-gate",
  "nodeId": "<id>", "payload": { "message": "...", "decision": "approve|changes" },
  "status": "pending|running|done|error", "result": "..." }
```

The latest record per `id` wins. The bridge wrote the original `pending` row. You
advance an intent ONLY by APPENDING a new status row with the same `id`; never
rewrite or delete an earlier line. The reader (the bridge `/api/queue`) collapses to
the latest record per id, so a one-field append like `{ "id", "ts", "status" }`
merges over the original.

## Steps

1. Pick the intent. If the founder named an id, take it. Otherwise read the queue and
   take the OLDEST `pending` intent (collapse to the latest row per id first, exactly
   like the bridge):

   ```
   node -e 'const fs=require("fs"),p="company-brain/console/queue.jsonl";if(!fs.existsSync(p)){console.log("");process.exit(0)}const m=new Map();for(const l of fs.readFileSync(p,"utf8").split("\n")){const s=l.trim();if(!s)continue;try{const r=JSON.parse(s);m.set(r.id,{...(m.get(r.id)||{}),...r})}catch{}}const q=[...m.values()].filter(r=>r.status==="pending").sort((a,b)=>String(a.ts).localeCompare(String(b.ts)));console.log(q.length?JSON.stringify(q[0]):"")'
   ```

   If it prints nothing, tell the founder the queue is empty and stop.

2. Mark it running. Append a status row (do not rewrite earlier lines):

   ```
   node -e 'const fs=require("fs"),p="company-brain/console/queue.jsonl";fs.appendFileSync(p,JSON.stringify({id:process.argv[1],ts:new Date().toISOString(),status:"running"})+"\n")' <intentId>
   ```

   Log a first activity line (step 4 shape) so the dashboard shows the node is moving.

3. Dispatch by kind. Do the actual work in THIS session; these are real LLM jobs, not
   deterministic shells.

   - `build` -- run the `casa-build` skill on `payload.nodeId`. Do the real work to its
     quality bar and write the deliverable under `company-brain/outputs/<nodeId>/`
     (this is where the grade mode reads it). Then run `casa-review grade <nodeId>`
     (the grade mode below) to score it. Then close the node:

     ```
     node ${CLAUDE_PLUGIN_ROOT}/scripts/brain.mjs complete company-brain <nodeId>
     ```

   - `chat` -- a per-node refinement. Read the node's current deliverable under
     `company-brain/outputs/<nodeId>/` and the founder's `payload.message` (also
     recorded in `company-brain/console/messages.jsonl` as the user row). Produce the
     REFINED deliverable and rewrite that output file in place. Run `casa-review grade
     <nodeId>` to re-score. Append an assistant row to messages.jsonl summarizing what
     changed (shape in step 5). A chat refinement does not flip node status; it
     improves an existing deliverable.

   - `review` -- run the `casa-review` grade mode (below) on `payload.nodeId`. It
     writes the score to `company-brain/console/scores.jsonl`; surface the score,
     pass or fail, and the gaps.

   - `next` -- run the `casa-next` skill and deliver its reasoned briefing. Advisory
     only; it changes no node state.

   - `resolve-gate` -- read `payload.decision`. `approve` means the founder eyeballed
     the node and approves it: close it with
     `node ${CLAUDE_PLUGIN_ROOT}/scripts/brain.mjs complete company-brain <nodeId>`.
     `changes` means re-run `casa-build` on the node with the founder's change note
     (`payload.message`) as the instruction, write the revised deliverable under
     `company-brain/outputs/<nodeId>/`, re-grade, then complete.

4. Log activity as you work. Append per-node activity lines so the dashboard live feed
   shows progress (one at the start, one or two mid-run, one at the end):

   ```
   node -e 'const fs=require("fs"),pa=require("path"),p="company-brain/console/activity.jsonl";fs.mkdirSync(pa.dirname(p),{recursive:true});fs.appendFileSync(p,JSON.stringify({nodeId:process.argv[1],ts:new Date().toISOString(),text:process.argv[2]})+"\n")' <nodeId> "<short progress line>"
   ```

5. For a chat intent, append the assistant reply to messages.jsonl:

   ```
   node -e 'const fs=require("fs"),pa=require("path"),p="company-brain/console/messages.jsonl";fs.mkdirSync(pa.dirname(p),{recursive:true});fs.appendFileSync(p,JSON.stringify({id:Date.now().toString(36),nodeId:process.argv[1],role:"assistant",content:process.argv[2],intentId:process.argv[3],ts:new Date().toISOString()})+"\n")' <nodeId> "<what changed in the deliverable>" <intentId>
   ```

6. Close the intent. Append a final status row (`done` with a short result, or `error`
   with the reason). Same append-only rule, same `id`:

   ```
   node -e 'const fs=require("fs"),p="company-brain/console/queue.jsonl";fs.appendFileSync(p,JSON.stringify({id:process.argv[1],ts:new Date().toISOString(),status:process.argv[2],result:process.argv[3]})+"\n")' <intentId> done "<one-line result>"
   ```

   If anything failed (a missing input, a blocked node, a non-ready node), set
   `error` with the reason instead of forcing the work. Do not invent a deliverable.

7. Remind and loop. After a build, chat, or approved resolve-gate that ran
   `brain.mjs complete`, the deterministic engine already re-rendered build-map.json,
   NOW.md, and the company CLAUDE.md AUTO blocks, and the bridge fired an SSE; tell the
   founder the dashboard will update on its own. Then OFFER to drain the next pending
   intent. Wait for the founder to say go. Never auto-spawn the next run; the founder
   stays in the loop.

## The JSONL you write (so the bridge and UI can read them)

- `company-brain/console/queue.jsonl` -- status rows, append-only, keyed by the
  existing intent `id`: `{ "id", "ts", "status": "running|done|error", "result"? }`.
  Latest row per id wins. Never rewrite earlier lines.
- `company-brain/console/messages.jsonl` -- the assistant reply to a chat intent:
  `{ "id", "nodeId", "role": "assistant", "content", "intentId", "ts" }`.
- `company-brain/console/activity.jsonl` -- the per-node progress feed:
  `{ "nodeId", "ts", "text" }`.
- `company-brain/console/scores.jsonl` -- written by the grade mode (casa-review),
  not here directly: `{ "nodeId", "score", "pass", "gaps": [...], "ts" }`.

## Rules

- Only the deterministic engine writes brain state (rule 4). A click or an intent
  never flips a node's status directly. Node status changes go through
  `brain.mjs complete`; the queue, messages, activity, scores, and outputs files are
  request and artifact state OUTSIDE build-map.json, state.json, and profile.json.
- The executor is the present founder's interactive session (rule 5). Never spawn
  `claude -p`, never run a headless or background agent, never auto-drain the queue.
  One intent, then ask before the next.
- Any money step routes through `casa-pay` (rule 8). Surface Capx Pay's quote, get the
  founder's explicit confirmation, and never invent a price or a limit. Without Pay,
  degrade to the bring-your-own-key or manual path and record the outcome.
- Never auto-execute a human-gate, irreversible, legal, or money step inside a build.
  Stop and surface it, exactly as casa-build does.
- Append, never rewrite, the JSONL files. The latest record per id wins by design.
- No em-dashes, no emojis in any founder-facing output.
