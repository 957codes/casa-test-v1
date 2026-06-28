// Tests for the Casa Console adapter (console/adapter.mjs): the company-brain ->
// Foundry-shape transform that feeds the visual node graph and dashboard.

import { test } from "node:test";
import assert from "node:assert/strict";
import { toFoundry } from "../console/adapter.mjs";

const BUILD_MAP = {
  current_level: 1,
  levels: [
    { level: "always-on", name: "Foundations", nodes: [
      { id: "cost-governance", title: "Cost governance", status: "ready", recurring: true, depends_on: [] },
    ] },
    { level: 0, name: "Ideation and Validation", nodes: [
      { id: "opportunity-scan", title: "Opportunity scan", status: "done", depends_on: [], human_gate: false, on_critical_path: true, leverage: "high" },
      { id: "entity-formation", title: "Entity formation", status: "ready", depends_on: ["opportunity-scan"], human_gate: true },
      { id: "mvp-scoping", title: "MVP scoping", status: "blocked", depends_on: ["entity-formation"] },
    ] },
  ],
};
const PROFILE = { company_name: "Probe", one_liner: "Incident replay for platform teams", primary_type: "saas", traits: ["b2b", "high_acv"] };

test("toFoundry: company rollups reflect the brain", () => {
  const r = toFoundry({ buildMap: BUILD_MAP, profile: PROFILE, spend: 12.18 });
  assert.equal(r.company.name, "Probe");
  assert.equal(r.company.tasksTotal, 4);
  assert.equal(r.company.tasksComplete, 1);          // opportunity-scan
  assert.equal(r.company.needsAttention, 2);         // entity-formation (approval) + cost-governance (input)
  assert.equal(r.company.metrics.spend, 12.18);
  assert.equal(r.company.currentLevel, 1);
});

test("toFoundry: stages are ordered with always-on first and carry their counts", () => {
  const { stages } = toFoundry({ buildMap: BUILD_MAP, profile: PROFILE });
  assert.equal(stages[0].label, "Foundations");
  assert.equal(stages[1].label, "Ideation and Validation");
  assert.equal(stages[1].total, 3);
  assert.equal(stages[1].done, 1);
});

test("toFoundry: status and human_gate map to Foundry task states", () => {
  const byId = new Map(toFoundry({ buildMap: BUILD_MAP, profile: PROFILE }).tasks.map((t) => [t.id, t]));
  assert.equal(byId.get("opportunity-scan").state, "completed");
  assert.equal(byId.get("entity-formation").state, "approval"); // ready + human_gate
  assert.equal(byId.get("mvp-scoping").state, "locked");        // blocked
  assert.equal(byId.get("cost-governance").state, "input");     // ready, no gate
  assert.equal(byId.get("opportunity-scan").onCriticalPath, true);
});

test("toFoundry: departments are derived from the playbook", () => {
  const byId = new Map(toFoundry({ buildMap: BUILD_MAP, profile: PROFILE }).tasks.map((t) => [t.id, t]));
  assert.equal(byId.get("entity-formation").owner, "Legal");
  assert.equal(byId.get("opportunity-scan").owner, "Strategy");
});

test("toFoundry: an empty brain does not throw", () => {
  const r = toFoundry({});
  assert.deepEqual(r.stages, []);
  assert.equal(r.company.tasksTotal, 0);
});

// ---- Phase 4: health "game", loops, spend ----

const HEALTH_MAP = {
  current_level: 1,
  levels: [
    { level: 0, name: "Validation", nodes: [
      { id: "problem-validation-interviews", title: "Problem validation", status: "done", criticality: "existential", department: "Strategy", depends_on: [] },
      { id: "red-team-thesis", title: "Red team", status: "done", criticality: "existential", department: "Strategy", depends_on: [] },
      { id: "entity-formation", title: "Entity formation", status: "ready", criticality: "existential", department: "Legal", human_gate: true, depends_on: [] },
      { id: "market-sizing-tam-sam-som", title: "Market sizing", status: "done", criticality: "core", department: "Strategy", depends_on: [] },
    ] },
  ],
};
const ENRICH = {
  catalog: {},
  scores: { "market-sizing-tam-sam-som": { score: 55, pass: false, gaps: ["thin sourcing"] } },
  loops: [
    { id: "weekly-retro", title: "Weekly retro", why: "meta", runs: "weekly-business-review", cadence_days: 7, min_level: 1, eligible: true, last_ran: null, days_since: null, due: true, never_run: true, overdue_days: 0, next_due_in_days: null },
    { id: "metrics-pulse", title: "Metrics pulse", why: "numbers", runs: "wbr", cadence_days: 7, min_level: 5, eligible: false, last_ran: null, days_since: null, due: false, never_run: false, overdue_days: 0, next_due_in_days: null },
  ],
  receipts: [
    { ts: "2026-06-20T00:00:00Z", descriptor: "Domain registration", amount_usd: 12.0, status: "settled", ref: "r1" },
    { ts: "2026-06-26T00:00:00Z", descriptor: "KYC check", amount_usd: 3.5, status: "settled", ref: "r2" },
  ],
};

test("toFoundry: health composite and existential coverage", () => {
  const { company } = toFoundry({ buildMap: HEALTH_MAP, profile: PROFILE, spend: 15.5 }, ENRICH);
  const h = company.health;
  // 3 existential are actionable (none locked); 2 done -> 3 total, 2 done.
  assert.equal(h.existentialTotal, 3);
  assert.equal(h.existentialDone, 2);
  assert.ok(h.overall >= 0 && h.overall <= 100);
  // quality is measured (one scored node at 55) -> the quality component is non-null.
  const q = h.components.find((c) => c.key === "quality");
  assert.equal(q.value, 55);
});

test("toFoundry: improve list surfaces ungraded existential and below-bar work", () => {
  const { company } = toFoundry({ buildMap: HEALTH_MAP, profile: PROFILE }, ENRICH);
  const ids = company.health.improve.map((i) => i.id);
  // red-team-thesis is existential + completed + ungraded -> improve.
  assert.ok(ids.includes("red-team-thesis"));
  // market-sizing scored 55 (< 70) -> improve.
  assert.ok(ids.includes("market-sizing-tam-sam-som"));
  // entity-formation is not completed -> not an improve candidate.
  assert.ok(!ids.includes("entity-formation"));
});

test("toFoundry: loops sort due-first and spend is labeled Capx Pay", () => {
  const { company } = toFoundry({ buildMap: HEALTH_MAP, profile: PROFILE, spend: 15.5 }, ENRICH);
  assert.equal(company.loops[0].id, "weekly-retro"); // due, sorts first
  assert.equal(company.loops[0].due, true);
  assert.equal(company.metrics.loopsDue, 1);
  assert.equal(company.spend.label, "Capx Pay");
  assert.equal(company.spend.total, 15.5);
  assert.equal(company.spend.receipts.length, 2);
  assert.equal(company.spend.receipts[0].ref, "r2"); // newest first
});

test("toFoundry: department health rolls up done/ready/blocked", () => {
  const { company } = toFoundry({ buildMap: HEALTH_MAP, profile: PROFILE }, ENRICH);
  const strategy = company.health.departments.find((d) => d.name === "Strategy");
  assert.equal(strategy.total, 3);  // problem-validation, red-team, market-sizing
  assert.equal(strategy.done, 3);
  const legal = company.health.departments.find((d) => d.name === "Legal");
  assert.equal(legal.ready, 1);     // entity-formation (approval counts as ready/needs-you)
});

// ---- Rebuild: verified-vs-assumed completion, next-actions, focus ----

test("toFoundry: a completed node is verified only with an output or a grade, else assumed", () => {
  const enrich = {
    ...ENRICH,
    outputs: new Set(["problem-validation-interviews"]), // produced an artifact
    // market-sizing has a score in ENRICH; red-team has neither output nor score
  };
  const byId = new Map(toFoundry({ buildMap: HEALTH_MAP, profile: PROFILE }, enrich).tasks.map((t) => [t.id, t]));
  assert.equal(byId.get("problem-validation-interviews").verified, true);  // has output
  assert.equal(byId.get("problem-validation-interviews").assumed, false);
  assert.equal(byId.get("market-sizing-tam-sam-som").verified, true);      // has a score
  assert.equal(byId.get("red-team-thesis").assumed, true);                 // seeded, no proof
  assert.equal(byId.get("red-team-thesis").verified, false);
});

test("toFoundry: nextActions carries the engine ranking and resolves unblocks to titles", () => {
  const next = [
    { id: "entity-formation", title: "Entity formation", department: "Legal", effective_criticality: "existential",
      tier: 2, human_gate: true, blocks_revenue: true, unblocks: ["market-sizing-tam-sam-som"] },
  ];
  const { company } = toFoundry({ buildMap: HEALTH_MAP, profile: PROFILE }, { ...ENRICH, next });
  const a = company.nextActions[0];
  assert.equal(a.id, "entity-formation");
  assert.equal(a.criticality, "existential");
  assert.equal(a.criticalityLabel, "Do-or-die right now");
  assert.equal(a.humanGate, true);
  assert.equal(a.blocksRevenue, true);
  assert.deepEqual(a.unblocks, ["Market sizing"]); // id resolved to the downstream node's title
});

test("toFoundry: focus reads the founder's win and constraint and humanizes the constraint", () => {
  const brain = { buildMap: { ...HEALTH_MAP, active_north_star: { label: "match rate", band: "retention", mature_growth_label: "GMV" } }, profile: PROFILE };
  const enrich = { ...ENRICH, pulse: { win: "Tokenise agent-run companies", constraint: "no_users" } };
  const { company } = toFoundry(brain, enrich);
  assert.equal(company.focus.win, "Tokenise agent-run companies");
  assert.equal(company.focus.constraint, "No users yet (cold start)"); // humanized
  assert.equal(company.focus.northStar, "match rate");
  assert.equal(company.focus.northStarMature, "GMV");
});
