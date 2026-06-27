---
name: casa-start
description: Begin or set up a company with Capx Casa. Runs the stage interview to learn what the business is and where it is today, then selects, sequences, and seeds the playbooks for this specific business at the right level. Greenfield ideas get Level 0 validation first; an existing business skips straight to its current level with the work it has already done marked complete. Use when the user wants to start or set up a company, says casa start, or brings a business (an idea or one already running).
---

# casa-start

The front door. Takes a founder from "I have a business" (an idea, or one already
running) to a confirmed, personalized build map that starts at the right level.

## Steps

1. Initialize the workspace if needed. If `company-brain/` does not exist in the
   current directory, create it:

   ```
   node ${CLAUDE_PLUGIN_ROOT}/scripts/brain.mjs init company-brain
   ```

   Confirm with the founder before writing.

2. Run the stage interview. Read
   `${CLAUDE_PLUGIN_ROOT}/skills/casa-start/questions.json` and ask its questions in
   order, skipping any whose `ask_when` is not met (adaptive, roughly 8 to 12
   questions). Three passes:
   - Define: what the business is and who it serves.
   - Locate: where it is today (the stage tier).
   - Backfill (only if the tier is not "idea"): which foundational items are not done.

   Map each free-text answer onto the option set in `questions.json`. Use only the
   canonical values it lists. Keep your own questions plain: no em-dashes, no emojis.

3. Assemble the answers and write them to `company-brain/answers.json` as one JSON
   object:

   ```
   { "type": "...", "secondary_type": "", "company_name": "...", "one_liner": "...",
     "icp": "...", "monetization": "...", "traits": [...], "tier": "...", "gaps": [...] }
   ```

   `traits` are the business-definition traits from the Define pass. `gaps` are the
   playbook ids the founder has not done (from Backfill). Do not invent traits or
   ids; `stage.mjs` validates them against the catalog and errors on drift.

4. Branch on the stage:
   - Idea stage (`tier` is "idea"): run Level 0 validation via the
     `level-0-validate` skill. It produces a validation kit and a GO or KILL verdict.
     On KILL, record why in `decisions/`, suggest the strongest pivot, and stop. On
     GO, continue.
   - Any other stage: skip validation. The business already exists; do not
     re-validate it and do not send it back to Level 0.

5. Derive the profile, level, and seed, then render the brain:

   ```
   node ${CLAUDE_PLUGIN_ROOT}/scripts/stage.mjs apply company-brain/answers.json company-brain
   node ${CLAUDE_PLUGIN_ROOT}/scripts/brain.mjs sync company-brain
   ```

   `stage.mjs` writes `profile.json` and seeds `state.json` (the work already done,
   plus the start-level floor). `brain.mjs sync` deterministically selects and
   sequences the playbooks, writes `build-map.json` and `NOW.md`, and self-updates
   the `company-brain/CLAUDE.md` AUTO blocks. The founder starts at their real level,
   with any backfill gaps showing as ready catch-up items.

6. Show the build map and get approval. Use `casa-map`. Call out the current level,
   the catch-up items (lower-level work flagged as not done), and the critical path.
   On change requests, hand back to the `playbook-planner` agent for an incremental
   re-plan that preserves done work.

7. Hand off to `casa-next` for the first action, or `casa-priority` for a fuller
   briefing.

## Rules

- Deterministic selection, ordering, and seeding happen in `stage.mjs` and the
  router, not by free reasoning here. The interview is the only judgment call, and it
  must stay within the canonical option set in `questions.json`.
- Respect human-in-the-loop gates. Never file, pay, sign, send, or publish.
- An existing business is never re-validated and never regressed to Level 0. The
  stage floor protects it; a skipped foundational item surfaces as a catch-up task at
  the current level instead.
- No em-dashes, no emojis in any output the founder or a customer will see.
