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

test("nextActions: every ready action's consumed inputs are produced, or not producible at all (#8)", () => {
  // A consumed input gates only when some member can produce it. An input no member
  // produces is ambient (or has no producer for this business type), so it must not
  // block its consumers. Assert that relaxed invariant: produced OR non-producible.
  const profile = loadJson("examples/profile-solana-analytics.json");
  const completed = ["opportunity-scan", "problem-validation-interviews"];
  const completedSet = new Set(completed);
  const { members } = select(INDEX, profile);
  const byId = new Map(members.map((m) => [m.id, m]));
  const produced = new Set(), producible = new Set();
  for (const m of members) {
    for (const c of m.produces || []) producible.add(c);
    if (completedSet.has(m.id) || m.recurring) for (const c of m.produces || []) produced.add(c);
  }
  for (const a of nextActions(INDEX, profile, { completed, level: 0 })) {
    for (const c of byId.get(a.id).consumes || []) {
      assert.ok(produced.has(c) || !producible.has(c), `${a.id} surfaced before its producible input "${c}" exists`);
    }
  }
});

test("membership: software-ops playbooks are not members of a non-software business", () => {
  // observability/backup/security/onboarding/beta require builds_software, so a
  // non-software store never carries them as dead, blocked plan nodes.
  const a = { type: "ecommerce", traits: ["b2c", "takes_payments", "sends_email"], tier: "revenue", gaps: [] };
  const { profile } = deriveStage(a, INDEX);
  const ids = new Set(select(INDEX, profile).members.map((m) => m.id));
  for (const id of ["observability-setup", "data-backup-recovery", "security-baseline", "onboarding-flow-design", "beta-program-management"]) {
    assert.ok(!ids.has(id), `${id} must not be a member of a non-software business`);
  }
});

test("reachability: a non-software revenue b2c business has no permanently-dead members", () => {
  // The state/artifact reconciliation (flag-minting + producible-bypass) must leave no
  // member that can never become ready across the full level climb. This was 18-41%.
  const a = { type: "ecommerce", traits: ["b2c", "takes_payments", "recurring_revenue", "sends_email", "collects_user_data"], tier: "revenue", gaps: [] };
  const { profile } = deriveStage(a, INDEX);
  const { members } = select(INDEX, profile);
  const byId = new Map(members.map((m) => [m.id, m]));
  const everReady = new Set();
  let completed = [];
  for (let lvl = 0; lvl <= 8; lvl++) for (let pass = 0; pass < 6; pass++) {
    const acts = nextActions(INDEX, profile, { completed, level: lvl });
    for (const x of acts) everReady.add(x.id);
    const newly = acts.map((x) => x.id).filter((id) => !completed.includes(id) && !byId.get(id)?.recurring);
    if (!newly.length) break;
    completed = [...completed, ...newly];
  }
  const dead = members.filter((m) => !everReady.has(m.id) && !m.recurring).map((m) => m.id);
  assert.deepEqual(dead, [], `members never reachable: ${dead.join(", ")}`);
});

test("reachability: milestone flags mint their backing artifact (retention track unblocks)", () => {
  // has_paying_customers (a revenue-tier milestone) mints the paying_customer artifact,
  // so the retention playbooks that consume it become reachable for a b2c business that
  // has no b2b contract-close producer.
  const a = { type: "consumer", traits: ["b2c", "builds_software", "takes_payments", "recurring_revenue"], tier: "revenue", gaps: [] };
  const { profile, start_level } = deriveStage(a, INDEX);
  const ids = new Set(nextActions(INDEX, profile, { completed: [], level: start_level }).map((x) => x.id));
  for (const id of ["referral-program", "nps-csat-program"]) {
    assert.ok(ids.has(id), `${id} should be ready for a b2c revenue business (flag-minted paying_customer)`);
  }
});
