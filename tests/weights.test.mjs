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
  const pb = INDEX.find((p) => p.department === "Marketing") || INDEX[0];
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
