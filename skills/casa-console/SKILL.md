---
name: casa-console
description: Launch the Casa Console, a local visual dashboard for the company. Opens a node graph of the build map and a health dashboard in the browser, fed live by the company-brain. Read-only, it visualizes the company and does not run Claude Code. Use when the user wants to see the company visually, says casa console, open the dashboard, or show the build map in a browser.
---

# casa-console

A localhost visual layer over the company-brain: the build map as a node graph and a
health dashboard, updating live as the founder works in the terminal. Read-only. It
never writes to the brain; the terminal is still where work happens.

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

4. Tell the founder to open http://localhost:4317. The Build map shows every playbook
   as a node, colored by status, grouped by level, with dependencies as edges and the
   items awaiting a decision flagged. The Attention view is the health dashboard
   (level, progress, spend via Capx Pay, and the queue of what needs the founder).

5. As the founder completes work in the terminal (casa-build, casa-next), the Console
   updates on its own. To stop it, end the bridge process.

## Rules

- Read-only. The Console visualizes the brain and never writes to it. All work and all
  state changes still go through the terminal and the deterministic engine.
- The Console is optional. Everything in Casa works without it.
- No em-dashes, no emojis in any founder-facing output.
