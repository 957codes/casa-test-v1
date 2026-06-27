# Onboarding and Re-evaluation UX Plan

Status: planned 2026-06-27. This is the spec for the install -> stage-interview ->
returning-session experience. It builds on the existing router and brain engines;
it does not replace them.

Locked decisions (2026-06-27):
1. Command names keep the `casa-` prefix (`/casa-start`, `/casa-priority`, etc.).
   Avoids collisions with other installed plugins and keeps the brand legible.
2. The stage interview is adaptive, roughly 8 to 12 questions, branching by stage
   so an idea-stage founder answers fewer than a traction-stage founder.

---

## 1. The flow

```
INSTALL (once)          ONBOARD (once per company)          RETURN (every session)
new project folder  ->   /casa-start                     ->  SessionStart hook greets:
/plugin marketplace        adaptive stage interview            level, progress, spend,
  add <repo URL>           -> profile + stage                  loops due, top priority
/plugin install            -> seed completed work          ->  /casa-priority (re-evaluate)
capx-casa                  -> personalized build map       ->  /casa-next     (do it)
                           at the right level                  /casa-map      (see the plan)
```

The "copy the link" step is `/plugin marketplace add <github URL>`, which the
existing `marketplace.json` and `plugin.json` already support. The interview is
what makes the install optimized for running an agent-run business.

## 2. Core insight: the engine already speaks "stage"

Of the 32 canonical traits, 18 are state-flags the router already uses for
readiness gating (`has_repo`, `has_deployed_app`, `has_user_accounts`,
`has_paying_customers`, `has_revenue`, `pmf_achieved`, `runs_paid_media`,
`uses_ga4`, the `pre_*` flags, etc.). `brain.mjs deriveLevel` already computes the
current level from the completed-set. So stage detection is not a new subsystem.
It is an interview whose only job is to set those traits and seed the
completed-set, both of which the existing `router` and `brain complete` already
consume. Deterministic core stays intact: the model conducts the interview and
maps free-text answers onto a fixed option set; `scripts/stage.mjs` does the math.

## 3. Command surface (four verbs, one job each)

| Command | Job | When | Status |
|---|---|---|---|
| `/casa-start` | Onboard. Stage interview -> profile + seed + build map. | Once, in an empty project | exists; add interview + branch |
| `/casa-priority` | Re-evaluate. What changed, where are we, top 3 now, what is blocked, what to defer. | Start of a work session | NEW |
| `/casa-next` | Execute. The single next best action right now. | In the moment | exists |
| `/casa-map` | See. The whole level and track plan, and why each playbook is in or out. | On demand | exists |

`/casa-loops` and `/casa-pay` are unchanged. Mental model: start -> priority ->
next -> map. `/casa-priority` is broader than `/casa-next` (a ranked briefing, not
one action) and more active than `/casa-map` (read-only plan).

## 4. The stage interview

Adaptive, ~8 to 12 questions, three passes, then a branch. The model conducts it;
`scripts/stage.mjs` maps answers to `{ traits, completed_seed, start_level }`.

Pass A, Define the business (static traits, drive membership): type (saas /
marketplace / ecommerce / b2b-service / crypto / consumer / content / hardware),
b2b vs b2c, ACV band, self-serve vs sales-led, builds software, technical
audience, takes payments, recurring revenue, sends email, collects user data,
raising vs bootstrapped.

Pass B, Locate the stage (state-flags, drive readiness; seed completed work):

| Founder says | start_level | seed done (non-recurring) | state-flags set |
|---|---|---|---|
| Just an idea | 0 | nothing | pre_idea_only |
| Landing page or waitlist, no product | 1-2 | L0 | has_landing_page, has_website |
| Building, pre-launch (repo or deployed, no users) | 2-3 | L0-L1 | has_repo, has_deployed_app |
| Launched, users but no revenue | 4 | L0-L3 | has_user_accounts, has_live_traffic |
| Paying customers or revenue | 5 | L0-L4 | has_paying_customers, has_revenue |
| PMF and scaling on paid | 6 | L0-L5 | pmf_achieved, runs_paid_media |

Pass C, Backfill gaps (the honesty pass, advanced stages only): a short yes/no
battery on high-leverage lower-level items (incorporated, ToS and privacy live,
analytics wired, domain and brand secured). Anything answered "no" is excluded
from the seed, so the router surfaces it as a ready catch-up item at the current
level. This stops an advanced founder from getting a map that pretends they did
work they skipped.

Branch: the "idea" stage runs the existing `level-0-validate` (GO or KILL). Every
other stage skips validation, seeds, and jumps to the build map at the real
current level.

Seed mechanism reuses what exists: compute the seed ids, then
`brain.mjs complete <dir> <ids...>` advances `deriveLevel` to the right level.
Traits are written to `profile.json`. No core engine rewrite.

## 5. Returning-session experience

- `hooks/session-start.sh` (stays POSIX sh, no jq): keep printing `NOW.md`, add
  nudge logic. If loops are due or it has been a while, lead with "Run
  /casa-priority to re-evaluate," else "Run /casa-next." The level and spend lines
  already live in `NOW.md`.
- `/casa-priority`: reads the brain (NOW, profile, build-map, recent `decisions/`,
  `learnings.jsonl`, `finance/receipts.jsonl`), diffs against
  `state.last_priority` (new completions, spend delta, days elapsed), re-runs
  `router next`, and returns a priority briefing: one-line state of the company,
  top 3 ranked actions with a why each, current blockers, loops due, and an
  explicit defer list. Asks once whether the stage changed, and offers a
  lightweight re-stage that updates traits and seed.

## 6. Implementation phases

- A. Stage engine. `scripts/stage.mjs` (answers -> traits, seed, start_level;
  deterministic), `skills/casa-start/questions.json` (question bank with
  answer-to-signal mapping, validated against the canonical 32-trait vocab), and a
  thin `brain.mjs seed` convenience over the existing `complete`.
- B. Rework `/casa-start`. Add the interview, the greenfield vs existing branch,
  and the backfill pass; wire to `stage.mjs` and the seed.
- C. `/casa-priority` skill, plus `state.last_priority` tracking in `brain.mjs`.
- D. Hook and onboarding docs. Enhance `session-start.sh`; write `docs/ONBOARDING.md`
  and a README "Getting started" that nails new project -> paste repo link ->
  /casa-start.
- E. Tests (extend the existing suite): `tests/stage.test.mjs` golden mappings
  (each tier -> correct start_level and seed), a seed-to-deriveLevel round-trip,
  and the backfill exclusion.

## 7. File manifest

New:
- `scripts/stage.mjs`
- `skills/casa-start/questions.json`
- `skills/casa-priority/SKILL.md`
- `docs/ONBOARDING.md`
- `tests/stage.test.mjs`

Changed:
- `skills/casa-start/SKILL.md` (interview + branch + backfill)
- `scripts/brain.mjs` (`seed` convenience, `state.last_priority`)
- `hooks/session-start.sh` (nudge logic)
- `README.md` (Getting started)
- `.claude-plugin/plugin.json` if needed for the new skill discovery (skills are
  auto-discovered from `./skills`, so likely no change)

## 8. Build status (2026-06-27)

- Phase A: done. scripts/stage.mjs, skills/casa-start/questions.json, brain.mjs
  level floor, tests/stage.test.mjs (9 tests). stage.mjs under the zero-dep guard.
- Phase B: done. skills/casa-start/SKILL.md reworked (interview + greenfield/existing
  branch + stage apply + sync); brain.mjs `priority-ran` seam added and tested.
- Phase C: done. skills/casa-priority/SKILL.md, the session opener. Ranks via
  router next and records the check-in via brain.mjs `priority-ran`.
- Phase D: done. hooks/session-start.sh nudges toward /casa-priority when loops are
  due, docs/ONBOARDING.md is the full walkthrough, README has Getting started + the
  /casa-priority command row.
- Suite at 36 tests, preflight 23 checks, all green. All four phases complete.
