---
id: design-partner-recruitment
title: Design Partner Recruitment
level: 2
summary: "Recruit a handful of design partners who use the product weekly and shape it before a public launch."
applies_to:
  types:
    - "*"
  requires_traits:
    - b2b
  excluded_traits:
    - pre_idea_only
relevance: core
department: Sales
criticality: existential
selection_hint: The first-users move for a B2B company with no users. Three to five committed design partners beat a hundred cold signups; they validate, pull the roadmap, and become your first references.
action: "Line up 5 target accounts and book design-partner calls with 3 of them this week, each committing to use it weekly."
depends_on: []
soft_after:
  - beachhead-selection
  - icp-target-account-listing
produces:
  - design_partners
  - early_user_feedback
consumes: []
effort: M
leverage: critical
reversibility: easy
human_gate: false
blocks_revenue: false
recurring: false
typical_milestone: first-users
deliverable:
  artifact: A design-partner roster with named accounts, the commitment each made, and a weekly feedback loop, written to the company brain.
  sections:
    - Target list (5-10 accounts from the ICP)
    - The offer (what the partner gets, what they commit to)
    - Signed or verbal commitments from 3-5 partners
    - The weekly feedback and usage loop
    - What the roadmap changed because of them
  max_words: 700
rubric: Passes only when at least three named design partners have committed to use the product on a real workflow and a weekly feedback loop is running, not when a generic outreach list has been drafted.
---
# Design Partner Recruitment

A B2B product with no users does not need more features or more brand. It needs three
to five real teams using it on a real workflow, weekly, and telling you what is wrong.
Design partners are the fastest path from zero to validated demand and your first
references, and they cost nothing but founder time.

## Procedure

1. Pull 5 to 10 target accounts from the ICP (sharpen it first if you have not). Warm
   intros beat cold; map who you know inside each.
2. Make a specific offer: hands-on access, your direct line, influence over the
   roadmap, and a fair early price (often free during the partnership). In exchange
   they commit to use it on a named workflow weekly and give you feedback.
3. Book the calls. Aim to close 3 to 5 commitments. Do the onboarding yourself.
4. Stand up a weekly loop: a shared channel, a standing 20-minute call, and a running
   list of what breaks and what they wish it did.

## Output

A `design_partners` roster and a live `early_user_feedback` loop, written to the
company brain. This unblocks real activation, retention, and case-study work.

## Rules

- Quality over count. Three teams that use it weekly are worth more than fifty logos
  that signed up and never returned.
- Pick partners from the beachhead, not whoever says yes. A partner outside the ICP
  pulls the roadmap in the wrong direction.
- A design partner who will not commit to a weekly workflow is a prospect, not a
  partner. Do not count them.
