// Tests for the quality-test fixes: the software-flag gate (#2), the gap-not-applicable
// warning (#7), and the consumes-as-readiness gate (#8 / #4b). The recurring-dependency
// rule (#4b) is also covered by the updated gating test in router.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { select, nextActions } from "../scripts/router.mjs";
import { deriveStage } from "../scripts/stage.mjs";
import { INDEX, loadJson } from "./helpers.mjs";

test("deriveStage: a non-software business does not inherit a codebase (#2)", () => {
  const a = { type: "b2b-service", traits: ["b2c", "local_service_only", "takes_payments"], tier: "launched", gaps: [] };
  const { profile } = deriveStage(a, INDEX);
  for (const f of ["has_repo", "has_deployed_app", "has_datastore"]) {
    assert.ok(!profile.traits.includes(f), `non-software business must not get ${f}`);
  }
});

test("deriveStage: a software business still gets the codebase flags", () => {
  const a = { type: "saas", traits: ["b2b", "builds_software"], tier: "building", gaps: [] };
  const { profile } = deriveStage(a, INDEX);
  assert.ok(profile.traits.includes("has_repo"), "software business keeps has_repo");
});

test("deriveStage: a gap that does not apply is flagged, not silently dropped (#7)", () => {
  // hosting-deployment-setup requires builds_software, so it is not a member of a non-software service
  const a = { type: "b2b-service", traits: ["b2c", "local_service_only"], tier: "launched", gaps: ["hosting-deployment-setup"] };
  const { gaps_not_applicable } = deriveStage(a, INDEX);
  assert.ok(gaps_not_applicable.includes("hosting-deployment-setup"));
});

test("nextActions: every ready action has its consumed inputs available (#8)", () => {
  const profile = loadJson("examples/profile-solana-analytics.json");
  const completed = ["opportunity-scan", "problem-validation-interviews"];
  const completedSet = new Set(completed);
  const { members } = select(INDEX, profile);
  const byId = new Map(members.map((m) => [m.id, m]));
  const produced = new Set();
  for (const m of members) if (completedSet.has(m.id) || m.recurring) for (const c of m.produces || []) produced.add(c);
  for (const a of nextActions(INDEX, profile, { completed, level: 0 })) {
    for (const c of byId.get(a.id).consumes || []) {
      assert.ok(produced.has(c), `${a.id} surfaced before its input "${c}" exists`);
    }
  }
});
