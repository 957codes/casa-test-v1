// Tests for the pulse priority-weight factor in the router (scripts/router.mjs).
// The pulse maps to weights; the engine applies them deterministically so the
// recommendation shifts toward what the founder cares about. No pulse means the
// behavior is unchanged.

import { test } from "node:test";
import assert from "node:assert/strict";
import { score, nextActions } from "../scripts/router.mjs";
import { deriveStage } from "../scripts/stage.mjs";
import { INDEX, loadJson } from "./helpers.mjs";

const flags = new Set();
const MEME = loadJson("examples/profile-solana-analytics.json");
// A heavily-seeded revenue business has many parallel-ready actions, so re-ranking is observable.
const REV = deriveStage({ type: "saas", company_name: "X", traits: ["b2c", "self_serve_only", "takes_payments", "builds_software"], tier: "revenue", gaps: [] }, INDEX);
const REV_STATE = { completed: REV.completed_seed, level: REV.start_level };

test("score: no weights is identical to the default (backward compatible)", () => {
  const pb = INDEX[0];
  assert.equal(score(pb, 0, flags), score(pb, 0, flags, null));
});

test("score: department weight raises or lowers the score", () => {
  const pb = INDEX.find((p) => p.department === "Growth") || INDEX[0];
  const base = score(pb, 0, flags);
  assert.ok(score(pb, 0, flags, { byDepartment: { [pb.department]: 0.5 } }) < base, "demote lowers");
  assert.ok(score(pb, 0, flags, { byDepartment: { [pb.department]: 2 } }) > base, "promote raises");
});

test("score: id-level promote and demote win over department/default", () => {
  const pb = INDEX[0];
  const base = score(pb, 0, flags);
  assert.ok(score(pb, 0, flags, { demote_ids: [pb.id] }) < base);
  assert.ok(score(pb, 0, flags, { promote_ids: [pb.id] }) > base);
  assert.ok(score(pb, 0, flags, { byId: { [pb.id]: 3 } }) > base);
});

test("score: a non-matching weight falls through to the default", () => {
  const pb = INDEX[0];
  const base = score(pb, 0, flags);
  assert.equal(score(pb, 0, flags, { byDepartment: { Nonexistent: 0.1 }, default: 1 }), base);
});

test("nextActions: hard-demoting the top action removes it from the top", () => {
  const acts = nextActions(INDEX, REV.profile, REV_STATE);
  assert.ok(acts.length >= 2, "need several ready actions to observe re-ranking");
  const top = acts[0];
  const after = nextActions(INDEX, REV.profile, { ...REV_STATE, weights: { byId: { [top.id]: 0.01 } } })[0];
  assert.notEqual(after.id, top.id, "the founder's de-prioritization changes the recommendation");
});

test("nextActions: hard-promoting a low action makes it the recommendation", () => {
  const acts = nextActions(INDEX, REV.profile, REV_STATE);
  const low = acts[acts.length - 1];
  const promoted = nextActions(INDEX, REV.profile, { ...REV_STATE, weights: { byId: { [low.id]: 100 } } })[0];
  assert.equal(promoted.id, low.id, "the founder's focus surfaces what matters to them");
});

test("nextActions: every action carries its department for the briefing", () => {
  const acts = nextActions(INDEX, MEME, { completed: [], level: 0 });
  for (const a of acts) assert.ok(typeof a.department === "string" && a.department.length > 0, `${a.id} has a department`);
});

// A revenue-stage consumer software business, used to assert the ranking behaviour.
const CALMLY = deriveStage({ type: "consumer", traits: ["b2c", "builds_software", "takes_payments", "recurring_revenue", "sends_email", "collects_user_data"], tier: "revenue", gaps: [] }, INDEX);
const CALMLY_STATE = { completed: CALMLY.completed_seed, level: CALMLY.start_level };

test("score: leverage leads slack - a critical play outranks a high-leverage low-slack infra loop", () => {
  // unit-economics (existential at revenue) must rank above incident-response (a low-slack infra loop)
  // by default for a revenue business, even though incident-response sits on a lower-slack path. The old
  // 1/(slack+1) inverted this and made the infra loop the headline. (north-star-metric, the prior
  // example, is now intentionally sunk as an NS-todo contradiction, so it is no longer a valid probe.)
  const acts = nextActions(INDEX, CALMLY.profile, CALMLY_STATE);
  const rank = (id) => acts.findIndex((a) => a.id === id);
  const ue = rank("unit-economics"), ir = rank("incident-response");
  assert.ok(ue >= 0 && ir >= 0, "both unit-economics and incident-response are ready");
  assert.ok(ue < ir, `existential unit-economics (#${ue}) should outrank low-slack incident-response (#${ir})`);
});

test("nextActions: a realistic pulse (promote_ids + department demote) steers the headline", () => {
  // A promote_ids entry plus a department demote moves the founder's focus to the top of the list.
  // It leads, except that dependency-order enforcement may legitimately surface its own prerequisite
  // one slot above it (you cannot run cohort-retention before its event taxonomy exists) -- that is the
  // correct, more honest behaviour the 40-company eval asked for, not a regression.
  const def = nextActions(INDEX, CALMLY.profile, CALMLY_STATE);
  const defRank = def.findIndex((a) => a.id === "cohort-retention-analysis");
  const weights = { promote_ids: ["cohort-retention-analysis"], byDepartment: { Engineering: 0.4, Operations: 0.6 } };
  const prom = nextActions(INDEX, CALMLY.profile, { ...CALMLY_STATE, weights });
  const promRank = prom.findIndex((a) => a.id === "cohort-retention-analysis");
  assert.ok(promRank <= 1, `promoted focus leads (behind at most its own prerequisite), got #${promRank}`);
  assert.ok(promRank < defRank, `the pulse moved the focus up (from #${defRank} to #${promRank})`);
  if (promRank === 1) {
    const deps = INDEX.find((p) => p.id === "cohort-retention-analysis").depends_on || [];
    assert.ok(deps.includes(prom[0].id), `the only item above the promoted focus is its prerequisite, got ${prom[0].id}`);
  }
});
