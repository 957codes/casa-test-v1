#!/usr/bin/env node
// The Capx Casa router engine. Deterministic: select -> sequence -> score.
// The LLM (in casa-start / casa-next / playbook-planner) calls this for the
// graph math and only handles fuzzy work (intake, disambiguation, phrasing).
//
//   node scripts/router.mjs plan <profile.yaml|json> [--out <brainDir>] [--level N] [--completed a,b]
//   node scripts/router.mjs next <profile.yaml|json> [--completed a,b] [--level N]
//
// Library exports (select, sequence, score, buildMap, nextActions) are importable.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repo = dirname(here);

const LEVEL_NAMES = {
  "always-on": "Foundations",
  0: "Ideation and Validation", 1: "Commit and Incorporate",
  2: "Product and Infra Foundation", 3: "Build and Pre-launch",
  4: "Launch", 5: "First Customers and PMF", 6: "Scale Acquisition",
  7: "Enterprise Sales", 8: "Growth Finance and Fundraise",
};
const LEVERAGE_W = { critical: 4, high: 3, med: 2, low: 1 };
const EFFORT_W = { S: 1, M: 1.3, L: 1.7, XL: 2.2 };

// traits that change as the company progresses (gates readiness, not membership)
const STATE_FLAGS = new Set([
  "pre_idea_only", "pre_launch_only", "pre_product_pre_customer", "pre_pmf", "pmf_achieved",
  "has_user_accounts", "has_paying_customers", "has_website", "has_deployed_app", "has_repo",
  "has_datastore", "runs_paid_media", "uses_ga4", "uses_mixpanel", "has_landing_page",
  "has_live_traffic", "has_live_customers", "has_revenue",
]);
// completing a playbook grants these state flags
const COMPLETION_FLAGS = {
  "hosting-deployment-setup": ["has_deployed_app", "has_repo", "has_datastore"],
  "landing-page-cro": ["has_landing_page", "has_live_traffic"],
  "onboarding-flow-design": ["has_user_accounts"],
  "contract-close-playbook": ["has_paying_customers", "has_revenue"],
  "analytics-stack-setup": ["uses_ga4"],
};

const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const levelKey = (l) => (l === "always-on" ? -1 : Number(l));

function loadIndex() {
  return JSON.parse(readFileSync(join(repo, "playbooks", "_index.json"), "utf8")).playbooks;
}
function loadProfile(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

// state flags the company has at a given level (pre_* are true early, drop later)
function achievedFlags(profile, completed, level) {
  const f = new Set(arr(profile.traits).filter((t) => STATE_FLAGS.has(t)));
  for (const id of completed) for (const g of COMPLETION_FLAGS[id] || []) f.add(g);
  if (level >= 6 || completed.length > 30) f.add("pmf_achieved");
  if (level < 4) f.add("pre_launch_only");
  if (level < 6) f.add("pre_pmf");
  if (level < 5) f.add("pre_product_pre_customer");
  return f;
}

function profileTypes(profile) {
  return [profile.primary_type, profile.secondary_type].filter(Boolean);
}
const typeMatch = (pb, types) =>
  pb.applies_to.types.includes("*") || pb.applies_to.types.some((t) => types.includes(t));

// MEMBERSHIP: in the build map for this business (static business traits only)
function isMember(pb, profile) {
  const types = profileTypes(profile);
  if (!typeMatch(pb, types)) return false;
  const traits = new Set(arr(profile.traits));
  for (const r of pb.applies_to.requires_traits)
    if (!STATE_FLAGS.has(r) && !traits.has(r)) return false;
  for (const x of pb.applies_to.excluded_traits)
    if (!STATE_FLAGS.has(x) && traits.has(x)) return false;
  return true;
}

// SELECT: all members, with the reason any non-member was dropped
function select(playbooks, profile) {
  const members = [], skipped = [];
  const types = profileTypes(profile), traits = new Set(arr(profile.traits));
  for (const pb of playbooks) {
    if (isMember(pb, profile)) { members.push(pb); continue; }
    let reason = "type mismatch";
    if (typeMatch(pb, types)) {
      const missing = pb.applies_to.requires_traits.filter((r) => !STATE_FLAGS.has(r) && !traits.has(r));
      const hit = pb.applies_to.excluded_traits.filter((x) => !STATE_FLAGS.has(x) && traits.has(x));
      reason = missing.length ? `needs trait ${missing.join(",")}` : `excluded by ${hit.join(",")}`;
    }
    skipped.push({ id: pb.id, reason });
  }
  return { members, skipped };
}

// SEQUENCE: Kahn topo-sort + CPM slack over the selected sub-DAG
function sequence(members) {
  const byId = new Map(members.map((p) => [p.id, p]));
  const ids = new Set(byId.keys());
  const preds = new Map([...ids].map((i) => [i, arr(byId.get(i).depends_on).filter((d) => ids.has(d))]));
  const succs = new Map([...ids].map((i) => [i, []]));
  const indeg = new Map([...ids].map((i) => [i, 0]));
  for (const i of ids) for (const d of preds.get(i)) { succs.get(d).push(i); indeg.set(i, indeg.get(i) + 1); }
  const q = [...ids].filter((i) => indeg.get(i) === 0);
  const order = [];
  while (q.length) { const n = q.shift(); order.push(n); for (const m of succs.get(n)) { indeg.set(m, indeg.get(m) - 1); if (!indeg.get(m)) q.push(m); } }
  if (order.length !== ids.size) throw new Error("cycle in selected playbooks");

  const dur = (i) => EFFORT_W[byId.get(i).effort] || 1.3;
  const es = new Map(), ef = new Map();
  for (const i of order) { const s = Math.max(0, ...preds.get(i).map((p) => ef.get(p))); es.set(i, s); ef.set(i, s + dur(i)); }
  const makespan = Math.max(0, ...[...ids].map((i) => ef.get(i)));
  const lf = new Map(), ls = new Map();
  for (const i of [...order].reverse()) {
    const f = succs.get(i).length ? Math.min(...succs.get(i).map((s) => ls.get(s))) : makespan;
    lf.set(i, f); ls.set(i, f - dur(i));
  }
  const slack = new Map([...ids].map((i) => [i, Math.round((ls.get(i) - es.get(i)) * 100) / 100]));
  return { order, slack, preds };
}

const ready = (pb, completedSet, flags, currentLevel) =>
  !completedSet.has(pb.id) &&
  levelKey(pb.level) <= currentLevel &&
  arr(pb.depends_on).every((d) => completedSet.has(d)) &&
  pb.applies_to.requires_traits.every((r) => !STATE_FLAGS.has(r) || flags.has(r)) &&
  pb.applies_to.excluded_traits.every((x) => !STATE_FLAGS.has(x) || !flags.has(x));

// Founder-priority multiplier from the pulse (deterministic lookup). No pulse means
// 1, so behavior is unchanged for anyone without one. Explicit per-id overrides win,
// then promote/demote lists, then department, then level, then the default.
function priorityWeight(pb, w) {
  if (!w) return 1;
  const has = (o, k) => o && Object.prototype.hasOwnProperty.call(o, k);
  if (has(w.byId, pb.id)) return w.byId[pb.id];
  if (Array.isArray(w.demote_ids) && w.demote_ids.includes(pb.id)) return 0.25;
  if (Array.isArray(w.promote_ids) && w.promote_ids.includes(pb.id)) return 2;
  if (pb.department && has(w.byDepartment, pb.department)) return w.byDepartment[pb.department];
  if (has(w.byLevel, String(pb.level))) return w.byLevel[String(pb.level)];
  return w.default ?? 1;
}

function score(pb, slack, flags, weights) {
  const lev = LEVERAGE_W[pb.leverage] || 2;
  const eff = EFFORT_W[pb.effort] || 1.3;
  const rev = pb.blocks_revenue && !flags.has("has_revenue") ? 1.5 : 1;
  const pw = priorityWeight(pb, weights);
  return Math.round((lev * (1 / (slack + 1)) * rev / eff * pw) * 1000) / 1000;
}

function buildMap(playbooks, profile, { completed = [], level = 0 } = {}) {
  const { members, skipped } = select(playbooks, profile);
  const { slack } = sequence(members);
  const completedSet = new Set(completed);
  const flags = achievedFlags(profile, completed, level);
  const byLevel = new Map();
  for (const pb of members) {
    const k = pb.level;
    if (!byLevel.has(k)) byLevel.set(k, []);
    const status = completedSet.has(pb.id) ? "done" : ready(pb, completedSet, flags, level) ? "ready" : "blocked";
    byLevel.get(k).push({
      id: pb.id, title: pb.title, status, slack: slack.get(pb.id),
      on_critical_path: slack.get(pb.id) === 0, leverage: pb.leverage, effort: pb.effort,
      human_gate: pb.human_gate, blocks_revenue: pb.blocks_revenue, recurring: pb.recurring,
      department: pb.department || null, depends_on: pb.depends_on,
    });
  }
  const levels = [...byLevel.keys()].sort((a, b) => levelKey(a) - levelKey(b)).map((k) => ({
    level: k, name: LEVEL_NAMES[k] || String(k),
    nodes: byLevel.get(k).sort((a, b) => a.slack - b.slack),
  }));
  return { member_count: members.length, levels, skipped };
}

function nextActions(playbooks, profile, { completed = [], level = 0, weights = null } = {}) {
  const { members } = select(playbooks, profile);
  const { slack } = sequence(members);
  const completedSet = new Set(completed);
  const flags = achievedFlags(profile, completed, level);
  const scored = members
    .filter((pb) => ready(pb, completedSet, flags, level))
    .map((pb) => ({ id: pb.id, title: pb.title, level: pb.level, department: pb.department || null,
      score: score(pb, slack.get(pb.id), flags, weights),
      human_gate: pb.human_gate, blocks_revenue: pb.blocks_revenue, leverage: pb.leverage, effort: pb.effort }))
    .sort((a, b) => b.score - a.score || levelKey(a.level) - levelKey(b.level));
  return scored;
}

// ---- CLI ----
function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") a.out = argv[++i];
    else if (argv[i] === "--completed") a.completed = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (argv[i] === "--level") a.level = Number(argv[++i]);
    else if (argv[i] === "--weights") a.weights = argv[++i];
    else a._.push(argv[i]);
  }
  return a;
}

function nowText(profile, actions, level) {
  const top = actions[0];
  const lines = [`# Now`, ``, `Company: ${profile.company_name || profile.one_liner || "(unnamed)"}`,
    `Level ${level}: ${LEVEL_NAMES[level] || level}`, ``, `## Next action`];
  if (top) {
    lines.push(`- ${top.title}  (${top.id})${top.human_gate ? "  [needs your approval]" : ""}`);
    const par = actions.slice(1, 4).filter((a) => levelKey(a.level) === levelKey(top.level));
    if (par.length) { lines.push(``, `## You can also start now (parallel)`); for (const p of par) lines.push(`- ${p.title}  (${p.id})`); }
  } else lines.push(`- Nothing ready. Advance the current level or run /casa-map.`);
  lines.push(``, `This file is kept current by the router. Do not hand-edit.`);
  return lines.join("\n") + "\n";
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  const playbooks = loadIndex();
  const profileFile = args._[0];
  if (!cmd || !profileFile) { console.error("usage: router.mjs plan|next <profile.yaml> [--out dir] [--completed a,b] [--level N]"); process.exit(2); }
  const profile = loadProfile(profileFile);
  const level = args.level ?? 0;
  const completed = args.completed ?? [];
  const weights = args.weights ? (loadProfile(args.weights).weights ?? loadProfile(args.weights)) : null;

  if (cmd === "plan") {
    const map = buildMap(playbooks, profile, { completed, level });
    const actions = nextActions(playbooks, profile, { completed, level, weights });
    console.log(`Business: ${profile.one_liner || profile.company_name || profileFile}`);
    console.log(`Type: ${[profile.primary_type, profile.secondary_type].filter(Boolean).join(" + ")}  traits: ${arr(profile.traits).join(", ")}`);
    console.log(`Selected ${map.member_count}/${playbooks.length} playbooks. Skipped ${map.skipped.length}.`);
    for (const lvl of map.levels) {
      console.log(`\n== Level ${lvl.level}: ${lvl.name}  (${lvl.nodes.length}) ==`);
      for (const n of lvl.nodes) {
        const tags = [n.status, n.on_critical_path ? "critical-path" : `slack ${n.slack}`, n.leverage, n.recurring ? "loop" : null, n.human_gate ? "gate" : null].filter(Boolean).join(", ");
        console.log(`  ${n.id}  [${tags}]`);
      }
    }
    console.log(`\n== Recommended next (top 5) ==`);
    for (const a of actions.slice(0, 5)) console.log(`  ${a.score}  ${a.id}  (L${a.level}, ${a.leverage}, ${a.effort})${a.human_gate ? " [gate]" : ""}`);
    if (args.out) {
      mkdirSync(args.out, { recursive: true });
      writeFileSync(join(args.out, "build-map.json"), JSON.stringify({ business_profile: profile, ...map }, null, 2));
      writeFileSync(join(args.out, "NOW.md"), nowText(profile, actions, level));
      console.log(`\nwrote ${join(args.out, "build-map.json")} and NOW.md`);
    }
  } else if (cmd === "next") {
    const actions = nextActions(playbooks, profile, { completed, level, weights });
    console.log(`Next actions (level ${level}, ${completed.length} completed):`);
    for (const a of actions.slice(0, 8)) console.log(`  ${a.score}  ${a.id}  (L${a.level}, ${a.leverage})${a.human_gate ? " [gate]" : ""}${a.blocks_revenue ? " [revenue]" : ""}`);
  } else { console.error(`unknown command: ${cmd}`); process.exit(2); }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
export { select, sequence, score, buildMap, nextActions };
