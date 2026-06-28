---
name: casa-console
description: Launch the Casa Console, a local interactive dashboard for the company. Opens a node graph of the build map, a node detail panel (TLDR, deliverable spec, quality score, chat), a health view, and a loops view in the browser, fed live by the company-brain. Interactive: clicks run deterministic engine actions inline and queue LLM work for casa-serve to drain; it never spawns an agent or writes brain state directly. Use when the user wants to see or drive the company visually, says casa console, open the dashboard, or show the build map in a browser.
---

# casa-console

A localhost control surface over the company-brain: the build map as a node graph, a
per-node detail panel, a health view, and a loops view, updating live as the founder
works. It is interactive but stays inside the rules: deterministic actions (mark
complete, mark a loop ran) run the engine inline, and anything needing an LLM is
queued for the founder to drain with casa-serve. The bridge never spawns an agent,
never runs headless, and never writes brain state directly.

## Steps

1. Confirm there is a company to show. If `company-brain/build-map.json` does not exist
   in this directory, tell the founder to run `casa-start` first and stop.

2. Build the Console once (first run only). If `${CLAUDE_PLUGIN_ROOT}/console/dist`
   does not exist:

   ```
   (cd ${CLAUDE_PLUGIN_ROOT}/console && npm install && npm run build)
   ```

   This is a one-time setup of the local app and takes about a minute. The plugin
   runtime stays zero-dependency; only the Console has its own dependencies.

3. Start the bridge, pointed at this company's brain and serving the built UI:

   ```
   node ${CLAUDE_PLUGIN_ROOT}/console/bridge.mjs company-brain --port 4317
   ```

   Leave it running. It reads company-brain on every request and pushes a live update
   whenever the brain changes.

4. Tell the founder to open http://localhost:4317. The views:

   - Build map: every playbook as a node, colored by status, grouped by level, with
     dependencies as edges and the items awaiting a decision flagged. Click a node for
     its detail panel (TLDR and advisor notes, the deliverable spec, a quality score
     with gaps, the rendered output, activity, and a refine chat) and its action
     buttons (run, mark complete, approve, request changes, improve, score).
   - Health: a company-health score with the dimensions that move it, per-department
     roll-ups, a "make done work better" list, and spend to date via Capx Pay.
   - Loops: every recurring cadence with its due or locked status.

5. Explain the two-way model so the founder knows what a click does. Deterministic
   actions (mark complete, mark a loop ran) run the engine inline and update at once.
   Anything needing an LLM (run a play, refine by chat, score) is queued, and the
   founder drains it with `casa-serve` in this same session. When the Console shows
   "Queued. Run /casa-serve", run `casa-serve` to execute it.

6. As the founder completes work, the Console updates on its own. To stop it, end the
   bridge process.

## Rules

- The Console never writes brain state directly and never spawns an agent. A click
  either runs the deterministic engine (the only writer of state, so gates and
  dependencies always hold) or queues an intent for the founder's interactive
  casa-serve session. The bridge never runs headless or `claude -p`.
- The Console binds to localhost only and is optional. Everything in Casa works
  without it, and the plugin runtime stays zero-dependency; only the Console folder
  has its own dependencies.
- No em-dashes, no emojis in any founder-facing output.
