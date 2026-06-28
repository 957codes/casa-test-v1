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
