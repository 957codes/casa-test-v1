---
name: casa-pulse
description: Produce a time-windowed pulse on the company over a chosen window (24h, 7d, 30d): the key metrics, what changed, what needs attention, and the on-chain signals where relevant. Read-only over the brain and connected sources, saved as a dated timeline entry. Use for a weekly recap, a launch-day check, or when the user asks how are we doing.
---

# casa-pulse

The recap craft. A recurring, read-only snapshot of the company over a window, saved so
the entries form a timeline. It never changes state; it reports.

## Steps

1. Set the window. Default 7d unless the user names one (24h, 30d). Read
   `company-brain/NOW.md`, `build-map.json`, `state.json`, `finance/receipts.jsonl`,
   `experiments.jsonl`, and the latest `decisions/`. Pull live numbers from any
   connected analytics or billing source (read-only; integrate, do not vendor).

2. Read the company side. Over the window: progress (playbooks completed, level
   change), spend to date via Capx Pay, the key product and customer metrics, and any
   experiment that closed. Use the actionable metric, not the cumulative total.

3. Read the on-chain side where relevant. If the company has opened ownership on Capx,
   include the on-chain signals (trading volume, fees, holders) alongside the company
   metrics, so both pillars are visible in one read.

4. Flag what needs attention. Anomalies, stalls (a node ready but untouched for the
   window), loops overdue, and any guardrail metric moving the wrong way.

5. Save the entry. Write a dated pulse to `company-brain/pulse/<date>.md` so the
   entries build a timeline. Do not edit any other state. End with the one thing to do
   next (and hand to `casa-priority` if the founder wants the full re-evaluation).

## Rules

- Read-only. The pulse reports; it never completes a node, marks a loop, or changes a
  decision.
- Actionable metrics over vanity. Every rate names its window.
- Both pillars when on-chain is live: company metrics and on-chain signals together.
- No em-dashes, no emojis.
