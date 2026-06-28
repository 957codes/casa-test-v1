---
name: casa-start
description: Begin or set up a company with Capx Casa. In an empty folder it runs the stage interview. Inside an existing project it deep-reads the files first, infers what it can, and asks only for the missing context. Either way it then selects, sequences, and seeds the playbooks for this business at the right level. Use when the user wants to start or set up a company, says casa start, or brings a business (an idea, or a project already underway).
---

# casa-start

The front door. Takes a founder to a confirmed, personalized build map that starts at
the right level. It adapts to where it is run: a clean folder gets the full interview;
a folder that already holds a project gets read first, so the founder confirms and fills
gaps instead of answering everything cold.

## Steps

1. Read the directory. Detect whether this is an existing project:

   ```
   node ${CLAUDE_PLUGIN_ROOT}/scripts/scan.mjs .
   ```

   It returns `is_existing_project` and deterministic signals (repo, deployed app,
   payments, auth, analytics dependencies, a type hint). The `company-brain/` directory
   is excluded, so an initialized-but-empty folder still reads as greenfield.

2. Initialize the workspace if needed. If `company-brain/` does not exist, create it:

   ```
   node ${CLAUDE_PLUGIN_ROOT}/scripts/brain.mjs init company-brain
   ```

   Confirm before writing. This does not touch the founder's own files.

3. Build the profile, by branch. The interview bank
   `${CLAUDE_PLUGIN_ROOT}/skills/casa-start/questions.json` has four passes: Define
   (what and who), Locate (stage tier), Core (north star, do-or-die constraint,
   horizon, anti-priorities, funding), and Backfill (skipped foundations). Skip any
   question whose `ask_when` is not met.

   A. Empty folder (`is_existing_project` is false). Run all four passes:
   Define + Locate + Core + Backfill. Ask everything cold (about 8 to 12 questions).

   B. Existing project (`is_existing_project` is true). Do not interview cold. Let the
      scan do the Define and Locate work, and spend the budget on the Core pass plus a
      gap confirmation, targeting about 4 to 6 interactions.
      i. Deep read. Spawn the `project-scanner` agent with this directory and the
         `scan.mjs` output. It reads the README, root CLAUDE.md, docs, manifests, and
         source, and returns an inferred profile (type, audience, monetization, traits,
         stage tier, gaps) with evidence and a confidence on each field, plus a tight
         `ask_founder` list (revenue-truth, funding, north star, do-or-die constraint,
         and done/gap reconciliation for the four high-value unblockers).
      ii. Confirm Define and Locate in one batch. Use the scan-aware keys in
         `questions.json`: a question marked `mode_when_scanned: "skip"` whose
         `satisfied_by_signal` is present is taken silently (the code proved it); a
         question marked `mode_when_scanned: "confirm"` is pre-filled from its
         `prefilled_by` field and shown for the founder to eyeball in a single
         confirmation, never asked cold. Show, in plain language, what you learned about
         their business and its stage and what already looks done. The `tier` question
         carries `revenue_truth`: never set launched, revenue, or scaling from the scan
         alone (code cannot prove paying customers); the founder must confirm it.
      iii. Run the Core pass and reconcile gaps. The Core pass is never scannable, so
         always ask it (north star, constraint, win and horizon, anti-priorities, and
         funding only if not already known). For Backfill, reconcile only the gaps the
         scanner flagged, focused on the four high-value unblockers (analytics,
         payments, legal/ToS, deploy); do not ask the whole battery cold.
      Read the founder's own files for context. Never edit or overwrite them. Casa's
      state lives only in `company-brain/`.

   In the Core pass, the north-star question offers business-type chips (mirroring the
   north-star families in `scripts/northstar.mjs` via `chips_by_type` and
   `chip_overrides`), then you map the founder's free text to exactly one canonical
   `north_star_archetype` id. The constraint question maps free text to one
   `constraint_archetype` id. Map anti-priorities to playbook ids only where you can
   name them confidently; otherwise leave the array empty.

4. Assemble the answers and write `company-brain/answers.json`. Produce every field,
   greenfield or existing:

   ```
   { "type": "...", "secondary_type": "", "company_name": "...", "one_liner": "...",
     "icp": "...", "monetization": "...", "traits": [...], "tier": "...", "gaps": [...],
     "north_star_archetype": "...", "constraint_archetype": "...",
     "win_definition": "...", "horizon": "...", "anti_priorities": [...] }
   ```

   `north_star_archetype` is one of activation, engagement_retention, revenue_mrr,
   acquisition_growth, conversion, gmv_liquidity, efficiency_unit_econ, local_reputation.
   `constraint_archetype` is one of no_users, no_revenue, runway_burn, regulatory_legal,
   tech_scale, hiring_capacity. `horizon` is one of this_week, 30d, 90d, quarter.
   `anti_priorities` is an array of playbook ids and may be empty. Use only canonical
   values; `stage.mjs` validates the type, traits, tier, and gaps and errors on drift.

5. Branch on the stage. Idea stage (`tier` is "idea") runs Level 0 validation via the
   `level-0-validate` skill (GO or KILL). Any other stage skips validation; the business
   already exists and is not sent back to Level 0. An existing project is almost never
   idea stage.

6. Derive the profile, level, seed, and the initial pulse, then render the brain:

   ```
   node ${CLAUDE_PLUGIN_ROOT}/scripts/stage.mjs apply company-brain/answers.json company-brain
   node ${CLAUDE_PLUGIN_ROOT}/scripts/brain.mjs sync company-brain
   ```

   `stage.mjs apply` writes `profile.json` and `state.json` (the seed and the level
   floor) AND seeds the initial pulse into `company-brain/pulse.json` from the Core
   answers: `north_star_archetype` sets the department weights, `constraint_archetype`
   adds a department delta, `anti_priorities` become demote ids, and `win_definition`
   is carried for display. This makes the very FIRST build map business-aware (a
   retention-focused founder sees retention work lead) before any manual pulse cascade.
   It will not clobber a richer hand-authored `pulse.json` if one already exists.

7. Deepen the founder's pulse (optional). The Core pass already captured the north star,
   the do-or-die constraint, the win and horizon, and the anti-priorities, and
   `stage.mjs apply` already seeded a business-aware `pulse.json` from them. This step
   only DEEPENS that seed into the full hand-authored pulse; it does not re-ask what
   Core covered. Build on the Core answers and the project read, drilling into the
   still-empty checklist slots in short adaptive rounds, never asking beyond what you
   need:
   - Reflect the Core answers back ("your north star is retention, the constraint is
     runway") so the founder sees they were heard, then fill what is missing: the ranked
     focus areas, the priority order, risk appetite, resourcing, and the one thing.
   - Each later round is generated from the prior answers and the project read, asking
     only about the still-empty checklist slots.
   Guardrails: this whole step is skippable ("good enough, build my plan" leaves the
   seeded pulse in place); cap at five rounds; reflect their last answers back so the
   questions feel earned, not like a form.

   The pulse checklist to fill: focus (ranked areas), win (definition and horizon),
   constraint, anti_priorities, priority_order, risk_appetite, resourcing, one_thing.

   Write two files:
   - `company-brain/pulse.md`: the human-readable pulse.
   - `company-brain/pulse.json`: the structured pulse PLUS the priority weights it
     implies, which the engine consumes:

     ```
     { "focus": [...], "win": { "definition": "...", "horizon": "..." }, "constraint": "...",
       "anti_priorities": [...], "risk_appetite": "...", "resourcing": "...", "one_thing": "...",
       "weights": { "byDepartment": { "Marketing": 0.4, "Finance": 1.6 }, "byLevel": { "4": 0.4 },
                    "promote_ids": [...], "demote_ids": [...], "default": 1.0 } }
     ```

     Departments are Brand, Engineering, Legal, Design, Operations, Marketing, Finance,
     Sales, Support. Down-weight what they are not doing yet, up-weight their focus. Be
     decisive but conservative: the weights nudge the order, your judgment in casa-next
     makes the final call.

   Then re-render so the weights take effect:

   ```
   node ${CLAUDE_PLUGIN_ROOT}/scripts/brain.mjs sync company-brain
   ```

8. Show the build map with `casa-map` and get approval. Call out the current level, the
   catch-up items, and the critical path.

9. Hand off to `casa-next` for the first action, or `casa-priority` for a fuller briefing.

## Rules

- Deterministic selection, ordering, and seeding happen in `stage.mjs` and the router.
  The interview and the project read are the only judgment calls, and they must resolve
  to the canonical option set.
- Inside an existing project, read everything before deciding playbooks. Never overwrite
  the project's own files (its CLAUDE.md, README, or code). Casa writes only under
  `company-brain/`.
- Respect human-in-the-loop gates. Never file, pay, sign, send, or publish.
- An existing business is never re-validated and never regressed to Level 0. The stage
  floor protects it; a skipped foundational item surfaces as a catch-up task instead.
- No em-dashes, no emojis in any output the founder or a customer will see.
