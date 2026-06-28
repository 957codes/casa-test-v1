# Getting started with Capx Casa

Capx Casa is an open-source Claude Code plugin: a control plane for building and
running a company from your terminal. It runs inside your own Claude Code, on your
own plan. This is the full setup walkthrough.

## 1. Make a project for your company

Create a new, empty folder for the company and open it in Claude Code. Everything
Casa records (your profile, build map, decisions, metrics) lives here as plain text,
versioned in git, so every session compounds on the last.

## 2. Install the plugin

```
/plugin marketplace add https://github.com/957codes/casa-test-v1
/plugin install capx-casa
```

This adds the commands, the playbook library, the router, the recurring loops, and
the SessionStart advisor. It adds no hosted service and no separate login.

## 3. Set up your company

```
/casa-start
```

casa-start runs a short stage interview, roughly 8 to 12 questions in three passes:

- Define: what the business is and who it serves.
- Locate: where it is today, from "just an idea" to "scaling on paid channels."
- Backfill: for an existing business, which foundational items are not done yet.

From your answers Casa builds a personalized map. It selects the playbooks that fit
this business, sequences them, and starts you at the right level. A raw idea is
validated first, a GO or KILL on the opportunity before you build. An existing
business skips ahead to its current level, and anything you have not done yet shows
up as a ready catch-up item instead of sending you back to the start.

Review the map with `/casa-map` and approve it.

## 4. Work the build

- `/casa-next` gives you the single next best action.
- `/casa-priority` gives a fuller briefing: where you are, your top priorities for
  this session, what is blocked, and what to defer.
- `/casa-loops` shows the recurring work that is due (metrics, retro, content).
- `/casa-pay` runs real-world paid actions (domains, hosting, media, research)
  through the companion product Capx Pay.

## Optional: see and drive it visually

If you prefer a visual view, run `/casa-console` to open a local dashboard in your
browser (localhost only, no account). It shows the build map as a node graph, a
detail panel for each node (summary, the deliverable spec, a quality score, and a
chat to refine it), a health view, and your loops and spend. It is interactive:
deterministic actions run the engine inline, and anything that needs an LLM is queued
for you to run with `/casa-serve` in this same session. The terminal stays the source
of truth, and the Console is never required.

## 5. Come back

Every time you reopen the project, the SessionStart advisor greets you with your
level, progress, spend to date, and your top priority. Start with `/casa-priority`
to re-evaluate, then `/casa-next` to act.

## What stays free

The skills, agents, router, loops, and company brain are MIT and free forever. Casa
never charges or holds funds. Only real-world actions that cost money run through
Capx Pay, and you can always bring your own keys and pay nothing.
