#!/usr/bin/env node
// The Capx Casa stage engine. Deterministic: turns the answers from the casa-start
// interview into a business profile, a starting level, and the set of playbooks the
// founder has effectively already done (the seed). The LLM conducts the interview
// and maps free text onto the fixed option set; THIS file does the math.
//
//   node scripts/stage.mjs derive <answers.json>            -> prints {profile, start_level, completed_seed}
//   node scripts/stage.mjs apply  <answers.json> <brainDir> -> writes profile.json + state.json (seed) in the brain
//
// Library export deriveStage(answers, playbooks) is importable for tests.
//
// The seed lets an existing business skip work it has already done. Anything the
// founder names as a gap (Pass C of the interview) is left OUT of the seed, so the
// router surfaces it as a ready catch-up item at the current level. The level never
// drops below start_level (the floor is enforced by brain.mjs currentLevel), so a
// lower-level gap does not regress the company.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { select, STATE_FLAGS } from "./router.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = dirname(here);
const levelKey = (l) => (l === "always-on" ? -1 : Number(l));

// Stage ladder. start_level is the level the founder is currently working in; the
// seed is every non-recurring member at a level BELOW it. Milestone flags are the
// state-flag traits a company at this tier has by definition, accumulated upward.
const TIERS = ["idea", "landing", "building", "launched", "revenue", "scaling"];
const TIER_START = { idea: 0, landing: 1, building: 2, launched: 4, revenue: 5, scaling: 6 };
const TIER_FLAGS = {
  idea: ["pre_idea_only"],
  landing: ["has_website", "has_landing_page"],
  building: ["has_repo", "has_deployed_app", "has_datastore"],
  launched: ["has_user_accounts", "has_live_traffic"],
  revenue: ["has_paying_customers", "has_revenue", "has_live_customers"],
  scaling: ["pmf_achieved", "runs_paid_media"],
};

function loadIndex() {
  return JSON.parse(readFileSync(join(repo, "playbooks", "_index.json"), "utf8")).playbooks;
}

// Cumulative milestone flags for a tier. "idea" is exclusive (nothing shipped yet);
// every other tier inherits the flags of the tiers beneath it.
function milestoneFlags(tier) {
  if (tier === "idea") return [...TIER_FLAGS.idea];
  const upto = TIERS.indexOf(tier);
  const flags = new Set();
  for (let i = 1; i <= upto; i++) for (const f of TIER_FLAGS[TIERS[i]]) flags.add(f);
  return [...flags];
}

// The canonical vocabulary the catalog actually understands. Used to reject answers
// that drift from the real trait/type set (an interview or mapping bug).
function canonical(playbooks) {
  const traits = new Set(), types = new Set();
  for (const p of playbooks) {
    for (const t of p.applies_to?.requires_traits || []) traits.add(t);
    for (const t of p.applies_to?.excluded_traits || []) traits.add(t);
    for (const t of p.applies_to?.types || []) if (t !== "*") types.add(t);
  }
  return { traits, types };
}

export function validateAnswers(answers, playbooks) {
  if (!answers || typeof answers !== "object") throw new Error("answers must be an object");
  if (!TIERS.includes(answers.tier)) {
    throw new Error(`unknown stage tier "${answers.tier}" (expected one of ${TIERS.join(", ")})`);
  }
  const { traits, types } = canonical(playbooks);
  if (answers.type && !types.has(answers.type)) {
    throw new Error(`unknown business type "${answers.type}" (expected one of ${[...types].sort().join(", ")})`);
  }
  for (const t of answers.traits || []) {
    if (!traits.has(t)) throw new Error(`unknown trait "${t}" (not in the catalog vocabulary)`);
  }
  for (const g of answers.gaps || []) {
    if (!playbooks.some((p) => p.id === g)) throw new Error(`gap "${g}" is not a known playbook id`);
  }
}

// answers: {
//   type, secondary_type?, company_name?, one_liner?, icp?, monetization?,
//   traits: [business-definition traits], tier, gaps?: [playbook ids NOT done]
// }
export function deriveStage(answers, playbooks) {
  validateAnswers(answers, playbooks);
  const start_level = TIER_START[answers.tier];
  // Software milestone flags imply a codebase, so only a software business inherits
  // has_repo / has_deployed_app / has_datastore. A non-software business does not.
  const builds = (answers.traits || []).includes("builds_software");
  const traitSet = new Set([...(answers.traits || []), ...milestoneFlags(answers.tier)]);
  // Flags that imply a codebase or a running app only apply to a software business.
  if (!builds) for (const f of ["has_repo", "has_deployed_app", "has_datastore", "has_user_accounts", "has_live_traffic"]) traitSet.delete(f);
  const traits = [...traitSet];

  const profile = {
    company_name: answers.company_name || "",
    confirmed: true,
    primary_type: answers.type || "",
    secondary_type: answers.secondary_type || "",
    traits,
    icp: answers.icp || "",
    monetization: answers.monetization || "",
    one_liner: answers.one_liner || "",
  };

  const gaps = new Set(answers.gaps || []);
  const { members } = select(playbooks, profile);
  const memberIds = new Set(members.map((m) => m.id));
  // Gaps the founder named that do not apply to this business (wrong type or trait): they
  // would be neither seeded nor surfaced, so flag them rather than dropping them silently.
  const gaps_not_applicable = [...gaps].filter((g) => !memberIds.has(g));
  const completed_seed = members
    .filter(
      (m) =>
        m.level !== "always-on" && // Foundations gates are never auto-completed
        !m.recurring && // loops are never "done", they come due
        levelKey(m.level) < start_level &&
        !gaps.has(m.id) && // a named gap stays open as a catch-up item
        // only mark done what the business could actually have done: its state-flag
        // requirements must be met (do not seed security work for a company with no
        // repo, or onboarding for one with no user accounts).
        (m.applies_to.requires_traits || []).every((r) => !STATE_FLAGS.has(r) || traitSet.has(r)),
    )
    .map((m) => m.id);

  return { profile, start_level, completed_seed, gaps_not_applicable };
}

// ---- CLI ----
function main() {
  const [cmd, answersFile, brainDir] = process.argv.slice(2);
  if (!cmd || !answersFile) {
    console.error("usage: stage.mjs derive <answers.json> | apply <answers.json> <brainDir>");
    process.exit(2);
  }
  const playbooks = loadIndex();
  const answers = JSON.parse(readFileSync(answersFile, "utf8"));
  const result = deriveStage(answers, playbooks);

  if (cmd === "derive") {
    console.log(JSON.stringify(result, null, 2));
  } else if (cmd === "apply") {
    if (!brainDir) {
      console.error("apply needs a brain directory");
      process.exit(2);
    }
    writeFileSync(join(brainDir, "profile.json"), JSON.stringify(result.profile, null, 2));
    // Preserve any loop history already recorded; set the seed and the level floor.
    const statePath = join(brainDir, "state.json");
    const prev = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) || {} : {};
    const state = { ...prev, completed: result.completed_seed, start_level: result.start_level };
    writeFileSync(statePath, JSON.stringify(state, null, 2));
    console.log(
      `seeded ${brainDir}: tier ${answers.tier}, start level ${result.start_level}, ` +
        `${result.completed_seed.length} playbooks pre-completed. Run brain.mjs sync next.`,
    );
    if (result.gaps_not_applicable.length) {
      console.warn(
        `note: these named gaps do not apply to this business (wrong type or trait) and were ignored: ` +
          result.gaps_not_applicable.join(", "),
      );
    }
  } else {
    console.error(`unknown command: ${cmd}`);
    process.exit(2);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
