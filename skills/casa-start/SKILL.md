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

3. Build the profile, by branch.

   A. Empty folder (`is_existing_project` is false). Run the full stage interview from
   `${CLAUDE_PLUGIN_ROOT}/skills/casa-start/questions.json`, in three passes (Define,
   Locate, Backfill), skipping any question whose `ask_when` is not met.

   B. Existing project (`is_existing_project` is true). Do not interview cold.
      i. Deep read. Spawn the `project-scanner` agent with this directory and the
         `scan.mjs` output. It reads the README, root CLAUDE.md, docs, manifests, and
         source, and returns an inferred profile (type, audience, monetization, traits,
         stage tier, gaps) with evidence and a confidence on each field, plus an
         `ask_founder` list of what only the founder can answer.
      ii. Confirm. Show the founder, in plain language, what you learned about their
         business and its stage, and what already looks done. Ask them to confirm or
         correct the key inferences. This is the moment they see that Casa understood
         their project.
      iii. Fill the gaps. Ask only what is left: the scanner's `ask_founder` questions
         plus any low-confidence field, drawn from `questions.json`. Do not re-ask what
         was inferred with high confidence and confirmed.
      Read the founder's own files for context. Never edit or overwrite them. Casa's
      state lives only in `company-brain/`.

4. Assemble the answers and write `company-brain/answers.json`:

   ```
   { "type": "...", "secondary_type": "", "company_name": "...", "one_liner": "...",
     "icp": "...", "monetization": "...", "traits": [...], "tier": "...", "gaps": [...] }
   ```

   Use only canonical values; `stage.mjs` validates them and errors on drift.

5. Branch on the stage. Idea stage (`tier` is "idea") runs Level 0 validation via the
   `level-0-validate` skill (GO or KILL). Any other stage skips validation; the business
   already exists and is not sent back to Level 0. An existing project is almost never
   idea stage.

6. Derive the profile, level, and seed, then render the brain:

   ```
   node ${CLAUDE_PLUGIN_ROOT}/scripts/stage.mjs apply company-brain/answers.json company-brain
   node ${CLAUDE_PLUGIN_ROOT}/scripts/brain.mjs sync company-brain
   ```

7. Show the build map with `casa-map` and get approval. Call out the current level, the
   catch-up items, and the critical path.

8. Hand off to `casa-next` for the first action, or `casa-priority` for a fuller briefing.

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
