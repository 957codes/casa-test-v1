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
  "has_datastore", "runs_paid_media", "uses_ga4", "has_landing_page",
  "has_live_traffic", "has_live_customers", "has_revenue",
]);
// uses_mixpanel is deliberately NOT a state flag: nothing grants it, so a tool-specific
// reading loop gated on it would be a permanently-dead member of every business. It is a
// static opt-in trait instead (a founder who runs Mixpanel declares it), so the loop is a
// clean non-member until then. GA4 is the grantable default (via analytics-stack-setup).
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
  // Reaching a level grants the milestone flags that level implies, so a company climbing
  // up gains them even if it started below that tier. The level is the universal producer
  // of a milestone: reaching "Launch" (4) means real users and traffic; reaching "First
  // Customers" (5) means paying customers and revenue; "Scale" (6) means PMF. This is what
  // lets a b2c business cross into has_paying_customers without the b2b contract-close
  // playbook (its only graph producer). Codebase flags are NOT granted here: they come
  // from the profile (software businesses only) so a non-software business never gains one.
  if (level >= 1) { f.add("has_website"); f.add("has_landing_page"); }
  if (level >= 4) { f.add("has_user_accounts"); f.add("has_live_traffic"); }
  if (level >= 5) { f.add("has_paying_customers"); f.add("has_revenue"); f.add("has_live_customers"); }
  if (level >= 6) f.add("pmf_achieved");
  // pre_* flags are true only while the company is below the stage they describe. pre_idea_only
  // is seeded from the idea tier's profile traits; like the others it must DROP once the company
  // climbs past idea, or every playbook excluding it stays permanently un-ready for an idea start.
  if (level >= 1) f.delete("pre_idea_only");
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

// Precompute the readiness context once per call: which members are recurring (loops
// never "complete", so they do not block their dependents) and which artifacts already
// exist (produced by a completed or a recurring member).
function readinessCtx(playbooks, members, completedSet, flags, currentLevel) {
  const byId = new Map(members.map((m) => [m.id, m]));
  const recurringSet = new Set(members.filter((m) => m.recurring).map((m) => m.id));
  // Each milestone flag is backed by the artifacts the playbook that grants it produces:
  // a company that "has paying customers" already has the paying_customer artifact.
  const flagArtifacts = {};
  for (const m of playbooks) for (const g of COMPLETION_FLAGS[m.id] || []) (flagArtifacts[g] ||= []).push(...arr(m.produces));
  const producedSet = new Set();
  for (const m of members) {
    // completed work, plus at-stage recurring loops (a loop the company has reached is running)
    if (completedSet.has(m.id) || (m.recurring && levelKey(m.level) <= currentLevel)) {
      for (const a of arr(m.produces)) producedSet.add(a);
    }
  }
  // mint the artifacts implied by the company's milestone state flags
  for (const g of flags) for (const a of flagArtifacts[g] || []) producedSet.add(a);
  // Every artifact some member could ever produce (any level). A consumed input is a
  // real sequencing edge only if a member produces it; an input that nothing in THIS
  // business's plan produces is ambient (the business has it by nature, or the catalog
  // has no producer for this type), so it must not permanently block its consumers.
  const producibleSet = new Set();
  for (const m of members) for (const a of arr(m.produces)) producibleSet.add(a);
  return { completedSet, flags, currentLevel, recurringSet, producedSet, producibleSet, byId };
}

function ready(pb, ctx) {
  if (ctx.completedSet.has(pb.id)) return false;
  // A founder actively running paid can reach the paid-acquisition playbooks one level early.
  const lift = ctx.flags.has("runs_paid_media") && pb.department === "Growth" ? 1 : 0;
  if (levelKey(pb.level) > ctx.currentLevel + lift) return false;
  // A dependency must be completed, unless it is a recurring loop the company has already
  // reached (which is running). A dependency that is not a member of this build does not block.
  const depOk = (d) => {
    if (ctx.completedSet.has(d)) return true;
    const dep = ctx.byId.get(d);
    return !!dep && dep.recurring && levelKey(dep.level) <= ctx.currentLevel;
  };
  if (!arr(pb.depends_on).every((d) => !ctx.byId.has(d) || depOk(d))) return false;
  // Inputs must exist before we recommend a playbook, BUT only gate on an input that
  // some member can actually produce. An input no member produces is ambient (or has no
  // producer for this business type) and must not dead-end its consumers permanently.
  if (!arr(pb.consumes).every((c) => ctx.producedSet.has(c) || !ctx.producibleSet.has(c))) return false;
  if (!pb.applies_to.requires_traits.every((r) => !STATE_FLAGS.has(r) || ctx.flags.has(r))) return false;
  if (!pb.applies_to.excluded_traits.every((x) => !STATE_FLAGS.has(x) || !ctx.flags.has(x))) return false;
  return true;
}

// Founder-priority multiplier from the pulse (deterministic lookup). No pulse means
// 1, so behavior is unchanged for anyone without one. Explicit per-id overrides win,
// then promote/demote lists, then department, then level, then the default.
function priorityWeight(pb, w) {
  if (!w) return 1;
  const has = (o, k) => o && Object.prototype.hasOwnProperty.call(o, k);
  if (has(w.byId, pb.id)) return w.byId[pb.id];
  if (Array.isArray(w.demote_ids) && w.demote_ids.includes(pb.id)) return 0.25;
  if (Array.isArray(w.promote_ids) && w.promote_ids.includes(pb.id)) return 2.5;
  if (pb.department && has(w.byDepartment, pb.department)) return w.byDepartment[pb.department];
  if (has(w.byLevel, String(pb.level))) return w.byLevel[String(pb.level)];
  return w.default ?? 1;
}

// Stage ladder, duplicated from stage.mjs to avoid a router<-stage import cycle (a test
// asserts the two stay in sync). stageOf maps a company level back to its stage tier, which
// is what existential_at and stageFit are expressed in.
const TIER_START_DESC = [["scaling", 6], ["revenue", 5], ["launched", 4], ["building", 2], ["landing", 1], ["idea", 0]];
function stageOf(level) {
  const k = levelKey(level);
  for (const [tier, start] of TIER_START_DESC) if (k >= start) return tier;
  return "idea";
}

// The business-model membership of a profile, used to tilt the score toward model-central
// work (a recurring business toward retention, a marketplace toward liquidity). Pure derive
// from static traits + type, so no new profile field is needed.
function modelSet(profile) {
  const t = new Set(arr(profile.traits));
  const type = profile.primary_type || "";
  const m = new Set();
  if (t.has("recurring_revenue")) m.add("recurring");
  if (t.has("takes_payments") && !t.has("recurring_revenue")) m.add("transactional");
  if (t.has("self_serve_only")) m.add("self_serve");
  if (t.has("high_acv") || (t.has("b2b") && !t.has("self_serve_only"))) m.add("sales_led");
  if (type === "marketplace") m.add("marketplace");
  if (type === "ecommerce" || type === "hardware") m.add("physical_goods");
  if (t.has("local_service_only")) m.add("local");
  return m;
}

// Slack at or above this gets the full low-urgency discount; below it, urgency ramps up.
const SLACK_SPAN = 10;
// Criticality multiplier (do-or-die consequence of NOT doing it at its stage). Default
// "growth" (1.0) so an untagged play is neutral and the rollout is incremental.
// Spread widened (was 1.5/1.15/1.0/0.85) so a do-or-die play decisively leads: a gentle
// department tilt (<= ~1.4) on a lower-criticality play can no longer leapfrog an existential
// one (existential 1.8 vs growth 0.95 * 1.4 = 1.33). A founder's EXPLICIT promote (2.5+) still
// crosses it, so the pulse keeps its steering power.
const CRIT_W = { existential: 1.8, core: 1.25, growth: 0.95, optional: 0.8 };
const FIT_FLOOR = 0.7, FIT_CAP = 1.9, MODELFIT_HIT = 1.25, MODELFIT_MISS = 0.85;

// A pure DISCOUNT (max 1.0): demotes work far below the current frontier so a stale low-level
// loop cannot headline a company several stages past it. This is the load-bearing fix for the
// "incident-response outranks unit-economics" band defect.
function stageFit(level, currentLevel) {
  if (level === "always-on") return 1;
  const d = currentLevel - levelKey(level);
  if (d <= 1) return 1;
  if (d === 2) return 0.85;
  if (d === 3) return 0.7;
  return 0.55;
}
// Model fit: empty model_fit is model-agnostic (neutral); otherwise a hit boosts and a miss
// gently demotes. This is what makes the DEFAULT (no-pulse) ranking business-model-aware.
function modelFitW(pb, models) {
  const mf = arr(pb.model_fit);
  if (mf.length === 0) return 1;
  return mf.some((x) => models.has(x)) ? MODELFIT_HIT : MODELFIT_MISS;
}
// criticality, promoted to existential within the stages listed in existential_at.
function effectiveCriticality(pb, stage) {
  const b = pb.criticality || "growth";
  if (b === "existential") return "existential";
  if (arr(pb.existential_at).includes(stage)) return "existential";
  return b;
}
// The ONE bounded model-awareness tilt: criticality x model_fit, clamped to [0.7, 1.8] so it
// can reorder within reason but never runs away. stageFit is a separate one-directional
// discount; there are not three stacked multipliers.
function fitFactor(pb, stage, models) {
  const cw = CRIT_W[effectiveCriticality(pb, stage)] ?? 1;
  return Math.min(FIT_CAP, Math.max(FIT_FLOOR, cw * modelFitW(pb, models)));
}
// The headline TIER decides the order of the ready set before the (pulse-weighted) score breaks
// ties WITHIN a tier. This is what makes a do-or-die play reliably lead -- a multiplicative score
// alone let a low-criticality but high-leverage/low-slack play edge an existential one. Tiers:
//   3  the founder's explicit focus  (a hard promote or the seeded north-star promote, weight >= 2)
//   2  existential (do-or-die at this stage)
//   1  core (foundational)
//   0  growth / optional (optimization)
// A HARD override (a big byId weight) goes to the absolute top -- the founder explicitly demands it.
// A seeded north-star promote (the 2.5 promote weight) only BUMPS the play one tier: it leads other
// plays of its own criticality and the tier below, but a promoted growth play (an nps survey) still
// cannot leapfrog an unpromoted existential one (the cash/margin play). So do-or-die always leads
// unless the founder hard-overrides, and the seeded pulse picks the leader within reason.
const HARD_OVERRIDE_MIN = 50, PROMOTE_BUMP_MIN = 2.0;
function critTier(pb, stage) {
  const c = effectiveCriticality(pb, stage);
  return c === "existential" ? 2 : c === "core" ? 1 : 0;
}
function headlineTier(pb, stage, weights) {
  const pw = priorityWeight(pb, weights);
  if (pw >= HARD_OVERRIDE_MIN) return 3;
  // The founder's BINDING CONSTRAINT leads. A play that directly addresses the constraint the founder
  // named (no_users -> acquisition, regulatory_legal -> compliance, runway_burn -> unit economics) is
  // pinned to the top tier, so the do-or-die survival work outranks generic foundation/optimization.
  // This is the single biggest lever from the 40-company eval: the constraint was derived and displayed
  // but never used to rank. Now it ranks first.
  if (weights && Array.isArray(weights.constraint_ids) && weights.constraint_ids.includes(pb.id)) return 3;
  const tier = critTier(pb, stage);
  return pw >= PROMOTE_BUMP_MIN ? Math.min(tier + 1, 3) : tier;
}

// The unified fitness score. fit = { currentLevel, stage, models } is OPTIONAL: when absent
// the result is byte-identical to the pre-fit score (every existing score unit test passes).
function score(pb, slack, flags, weights, fit) {
  const lev = LEVERAGE_W[pb.leverage] || 2;
  const eff = EFFORT_W[pb.effort] || 1.3;
  const rev = pb.blocks_revenue && !flags.has("has_revenue") ? 1.5 : 1;
  // Urgency from critical-path slack, but a GENTLE band so leverage leads. A zero-slack
  // bottleneck gets ~1.3x, a very slack item ~0.7x. (The old 1/(slack+1) was so steep that a
  // low-slack infra loop buried a critical revenue play and the pulse could not overcome it.)
  const urgency = 1.3 - 0.6 * Math.min(Math.max(slack, 0) / SLACK_SPAN, 1);
  const sf = fit ? stageFit(pb.level, fit.currentLevel) : 1;
  const ff = fit ? fitFactor(pb, fit.stage, fit.models) : 1;
  // A recurring, non-existential loop set up in an earlier stage (incident-response, data-backup,
  // email-deliverability) is background maintenance, not the frontier: it keeps running but must not
  // headline a launched company over its activation/retention work. Demote it out of the top cluster.
  const maint = fit && pb.recurring && levelKey(pb.level) < fit.currentLevel && effectiveCriticality(pb, fit.stage) !== "existential" ? 0.6 : 1;
  // Premature infra: reliability/ops plumbing (observability, backups, incident response, email
  // deliverability, a security baseline) only earns its keep once there are users to protect. Before
  // any live traffic it is busywork that buried the first-users work for pre-launch companies in the
  // 40-company eval. Demote it hard until the company has traffic. The constraint tier still overrides
  // (a tech_scale company keeps it on top), and a company with traffic is unaffected.
  const premature = fit && PRE_TRAFFIC_DEFER.has(pb.id) && !flags.has("has_live_traffic") ? 0.3 : 1;
  const pw = priorityWeight(pb, weights);
  return Math.round((lev * urgency * sf * ff * maint * premature * rev / eff * pw) * 1000) / 1000;
}

function buildMap(playbooks, profile, { completed = [], level = 0 } = {}) {
  const { members, skipped } = select(playbooks, profile);
  const { slack } = sequence(members);
  const completedSet = new Set(completed);
  const flags = achievedFlags(profile, completed, level);
  const ctx = readinessCtx(playbooks, members, completedSet, flags, level);
  const stage = stageOf(level);
  const byLevel = new Map();
  for (const pb of members) {
    const k = pb.level;
    if (!byLevel.has(k)) byLevel.set(k, []);
    const status = completedSet.has(pb.id) ? "done" : ready(pb, ctx) ? "ready" : "blocked";
    byLevel.get(k).push({
      id: pb.id, title: pb.title, status, slack: slack.get(pb.id),
      on_critical_path: slack.get(pb.id) === 0, leverage: pb.leverage, effort: pb.effort,
      human_gate: pb.human_gate, blocks_revenue: pb.blocks_revenue, recurring: pb.recurring,
      department: pb.department || null, depends_on: pb.depends_on,
      criticality: effectiveCriticality(pb, stage), model_fit: arr(pb.model_fit),
      stale: stageFit(pb.level, level) < 1,
    });
  }
  const levels = [...byLevel.keys()].sort((a, b) => levelKey(a) - levelKey(b)).map((k) => ({
    level: k, name: LEVEL_NAMES[k] || String(k),
    nodes: byLevel.get(k).sort((a, b) => a.slack - b.slack),
  }));
  return { member_count: members.length, levels, skipped };
}

// Enforce dependency order by PULLING PREREQUISITES UP, not pushing dependents down. If an item's
// in-list prerequisite ranks below it, move the prerequisite to just above the item. This fixes the
// inversion the eval caught (a task ranked above its own prerequisite) while keeping the high-value
// item near the top and surfacing its unblocker right above it, instead of sinking the headline beneath
// a low-scored foundational play. Bounded iterations so a cycle can never loop forever.
function enforceDeps(items, byId) {
  const inList = new Set(items.map((x) => x.id));
  const out = items.slice();
  for (let pass = 0, changed = true; changed && pass < out.length + 2; pass++) {
    changed = false;
    for (let i = 0; i < out.length; i++) {
      const deps = arr(byId.get(out[i].id)?.depends_on).filter((d) => inList.has(d));
      for (const d of deps) {
        const di = out.findIndex((x) => x.id === d);
        if (di > i) { const [p] = out.splice(di, 1); out.splice(i, 0, p); changed = true; }
      }
    }
  }
  return out;
}
const NS_TODO = new Set(["north-star-metric", "ceo-dashboard-build"]);
const EXISTENTIAL_DISPLAY_CAP = 2;
// Reliability/ops infra that is premature before a company has live traffic (see score()).
const PRE_TRAFFIC_DEFER = new Set(["observability-setup", "data-backup-recovery", "incident-response", "email-deliverability-setup", "security-baseline"]);

function nextActions(playbooks, profile, { completed = [], level = 0, weights = null } = {}) {
  const { members } = select(playbooks, profile);
  const { slack } = sequence(members);
  const completedSet = new Set(completed);
  const flags = achievedFlags(profile, completed, level);
  const ctx = readinessCtx(playbooks, members, completedSet, flags, level);
  const fit = { currentLevel: level, stage: stageOf(level), models: modelSet(profile) };
  const scored = members
    .filter((pb) => ready(pb, ctx))
    .map((pb) => ({ id: pb.id, title: pb.title, level: pb.level, department: pb.department || null,
      score: score(pb, slack.get(pb.id), flags, weights, fit),
      tier: headlineTier(pb, fit.stage, weights),
      effective_criticality: effectiveCriticality(pb, fit.stage),
      human_gate: pb.human_gate, blocks_revenue: pb.blocks_revenue, leverage: pb.leverage, effort: pb.effort }))
    // tier first (do-or-die and the founder's focus lead), then the pulse-weighted score within tier
    .sort((a, b) => b.tier - a.tier || b.score - a.score || levelKey(a.level) - levelKey(b.level) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  // The LADDER: what each action unblocks downstream (members that depend on it or consume what it
  // produces), ranked by criticality then level so the most goal-relevant unlocks come first. The
  // advisor uses this to connect today's action to the founder's future do-or-die work.
  const byId = new Map(members.map((m) => [m.id, m]));
  const consumersOf = new Map(), dependentsOf = new Map();
  for (const m of members) {
    for (const c of arr(m.consumes)) (consumersOf.get(c) || consumersOf.set(c, []).get(c)).push(m.id);
    for (const d of arr(m.depends_on)) (dependentsOf.get(d) || dependentsOf.set(d, []).get(d)).push(m.id);
  }
  const critRank = { existential: 3, core: 2, growth: 1, optional: 0 };
  for (const a of scored) {
    const pb = byId.get(a.id);
    const set = new Set(dependentsOf.get(a.id) || []);
    for (const art of arr(pb.produces)) for (const cid of consumersOf.get(art) || []) set.add(cid);
    a.unblocks = [...set]
      .filter((id) => id !== a.id && !completedSet.has(id))
      .map((id) => byId.get(id))
      .sort((x, y) => (critRank[effectiveCriticality(y, fit.stage)] - critRank[effectiveCriticality(x, fit.stage)]) || (levelKey(y.level) - levelKey(x.level)))
      .slice(0, 4)
      .map((m) => m.id);
  }
  // The engine already derived and asserted the north star, so a "define your north star" play as a top
  // todo is a self-contradiction. Sink those out of the headline FIRST so they neither lead nor get
  // pulled up as a dependency, then enforce dependency order on the visible set.
  // A north-star-todo is sunk UNLESS the founder hard-overrides it (an explicit byId weight wins over
  // every heuristic, including this one).
  const isSunk = (a) => NS_TODO.has(a.id) && priorityWeight(byId.get(a.id), weights) < HARD_OVERRIDE_MIN;
  const visible = scored.filter((a) => !isSunk(a));
  const sunk = scored.filter((a) => isSunk(a));
  const ordered = enforceDeps(visible, byId);
  // Cap how many items wear "existential" so triage survives. Only the top EXISTENTIAL_DISPLAY_CAP
  // keep it in DISPLAY; the rest step down one rung. The underlying criticality is unchanged (gating
  // and scoring still use effective_criticality); this only stops "everything is a fire". The #1 item
  // is flagged primary so the advisor can lead with a single reasoned action.
  let exShown = 0;
  for (const a of ordered) {
    if (a.effective_criticality === "existential" && exShown < EXISTENTIAL_DISPLAY_CAP) { a.display_criticality = "existential"; exShown++; }
    else if (a.effective_criticality === "existential") a.display_criticality = "core";
    else a.display_criticality = a.effective_criticality;
  }
  if (ordered[0]) ordered[0].primary = true;
  for (const a of sunk) a.display_criticality = a.effective_criticality;
  return [...ordered, ...sunk];
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
export { select, sequence, score, buildMap, nextActions, STATE_FLAGS, stageOf, modelSet, effectiveCriticality };
