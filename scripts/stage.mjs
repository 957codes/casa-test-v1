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
import { matureNorthStar } from "./northstar.mjs";

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

// The do-or-die constraint a founder names maps to the key playbooks that address it. These are
// kept OUT of the seed (surfaced as ready catch-up) so the engine never hides the exact risk the
// founder flagged, and the constraint's pulse weight has a live target. Unknown/absent ids are
// simply ignored (a business that does not select that playbook is unaffected).
const CONSTRAINT_SURFACE = {
  regulatory_legal: ["kyc-aml-program", "tos-and-privacy-policy", "token-and-licensing-strategy", "security-baseline", "hardware-certification-and-compliance"],
  no_revenue: ["pricing-research", "packaging-tier-design", "unit-economics", "pricing-page-copy-layout", "freemium-trial-decision", "ad-revenue-and-yield"],
  runway_burn: ["unit-economics", "financial-model-forecast", "pricing-research", "ad-revenue-and-yield"],
  tech_scale: ["observability-setup", "incident-response", "data-backup-recovery", "security-baseline"],
  no_users: ["problem-validation-interviews", "beachhead-selection", "landing-page-cro", "marketplace-supply-acquisition", "hardware-preorder-demand-validation"],
  hiring_capacity: ["hiring-and-org-scaling"],
};

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
  // Monetization implies payment traits even if the trait list omitted them: a subscription
  // business takes payments and has recurring revenue; a one-time or take-rate business takes
  // payments. Without this, a "subscription" SaaS whose answers lacked takes_payments lost its
  // entire pricing / unit-economics / churn track (all gated on takes_payments).
  const mon = answers.monetization;
  const monTraits = mon === "subscription" ? ["takes_payments", "recurring_revenue"]
    : (mon === "one-time" || mon === "transaction-fee") ? ["takes_payments"]
    : mon === "ads" ? ["ad_supported"] : [];
  const traitSet = new Set([...(answers.traits || []), ...monTraits, ...milestoneFlags(answers.tier)]);
  // Only the flags that imply an actual codebase are software-exclusive. has_user_accounts
  // and has_live_traffic are NOT: a launched store or local business genuinely has customer
  // accounts and live traffic, so stripping them wrongly dead-ended traffic/account-gated
  // loops (ab-testing) for non-software businesses.
  if (!builds) for (const f of ["has_repo", "has_deployed_app", "has_datastore"]) traitSet.delete(f);
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
  // The mature north star this business steers by (display + initial-pulse seeding only).
  profile.north_star = matureNorthStar(profile);

  const gaps = new Set(answers.gaps || []);
  // The founder's do-or-die constraint surfaces its key work: never silently pre-complete the
  // exact risk the founder named (e.g. a crypto company that flagged regulatory_legal must SEE its
  // KYC/licensing work, not have the seed mark it done). These ids are excluded from the seed like
  // a named gap, so they surface as ready catch-up items and the constraint's pulse weight has a
  // live target to lift instead of scaling nothing.
  const surface = new Set(CONSTRAINT_SURFACE[answers.constraint_archetype] || []);
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
        !surface.has(m.id) && // the founder's do-or-die constraint work stays visible
        // only mark done what the business could actually have done: its state-flag
        // requirements must be met (do not seed security work for a company with no
        // repo, or onboarding for one with no user accounts).
        (m.applies_to.requires_traits || []).every((r) => !STATE_FLAGS.has(r) || traitSet.has(r)),
    )
    .map((m) => m.id);

  return { profile, start_level, completed_seed, gaps_not_applicable };
}

// The INITIAL pulse, derived from the Core-pass intake answers, so the very first build map
// is business-aware (a retention-focused founder sees retention work lead) before any manual
// pulse cascade. Pure and table-driven; byDepartment keys use the 11-department vocabulary so
// the weights actually bite. With no archetype/constraint it returns a neutral pulse.
// Department tilts are kept GENTLE (<= ~1.4) on purpose: a broad department boost must not
// leapfrog a do-or-die (existential) play in another department. The criticality fitFactor
// (existential 1.5) plus a gentle tilt keeps the do-or-die work on top while still steering
// toward the founder's north-star department. A founder's EXPLICIT pulse can go stronger.
// Primary (north-star-central) department sits at 1.4 so the onboarding pulse can reorder WITHIN
// the existential tier and bend which do-or-die play headlines (1.8 * 1.4 = 2.52). The cap is 1.4
// by design: a higher tilt would let a core play (1.25) cross the existential floor (1.4 * 1.25 =
// 1.75 < 1.8), which would bury do-or-die work. So existential always leads; the pulse picks which.
const NS_DEPT = {
  activation: { Product: 1.4, Data: 1.25, Growth: 1.15 },
  engagement_retention: { Success: 1.4, Data: 1.4, Product: 1.2 },
  revenue_mrr: { Finance: 1.4, Growth: 1.25, Success: 1.25 },
  acquisition_growth: { Growth: 1.4, Data: 1.2 },
  conversion: { Growth: 1.4, Product: 1.35, Data: 1.25 },
  gmv_liquidity: { Operations: 1.4, Growth: 1.4, Data: 1.25 },
  efficiency_unit_econ: { Finance: 1.4, Data: 1.3 },
  local_reputation: { Growth: 1.4, Success: 1.35 },
};
const CONSTRAINT_DELTA = {
  no_users: { Growth: 0.2, Strategy: 0.2 },
  no_revenue: { Finance: 0.2, Sales: 0.15, Growth: 0.15 },
  runway_burn: { Finance: 0.25 },
  regulatory_legal: { Legal: 0.4 },
  tech_scale: { Engineering: 0.3 },
  hiring_capacity: { Operations: 0.3 },
};
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export function deriveInitialPulse(answers, playbooks) {
  const byDepartment = {};
  const nsa = answers.north_star_archetype;
  if (nsa && NS_DEPT[nsa]) for (const [d, w] of Object.entries(NS_DEPT[nsa])) byDepartment[d] = w;
  const con = answers.constraint_archetype;
  if (con && CONSTRAINT_DELTA[con]) for (const [d, delta] of Object.entries(CONSTRAINT_DELTA[con])) byDepartment[d] = (byDepartment[d] ?? 1) + delta;
  // Clamp the AUTO pulse to 1.4 so a constraint delta can never push a department high enough for a
  // core play to leapfrog an existential one. A founder's EXPLICIT pulse (pulse.json) is not bound here.
  for (const d of Object.keys(byDepartment)) byDepartment[d] = clamp(byDepartment[d], 0.25, 1.4);
  const ids = new Set(playbooks.map((p) => p.id));
  const demote_ids = (answers.anti_priorities || []).filter((ap) => ids.has(ap));
  const weights = { default: 1 };
  if (Object.keys(byDepartment).length) weights.byDepartment = byDepartment;
  if (demote_ids.length) weights.demote_ids = demote_ids;
  return { weights, north_star_archetype: nsa || null, constraint: con || null, win: answers.win_definition || "" };
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
    // Seed the initial business-aware pulse, but never clobber a richer hand-authored one.
    const pulsePath = join(brainDir, "pulse.json");
    if (!existsSync(pulsePath)) writeFileSync(pulsePath, JSON.stringify(deriveInitialPulse(answers, playbooks), null, 2));
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
