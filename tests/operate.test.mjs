// Integration tests for operate mode (scripts/operate.mjs), the headless v2
// runner. These tests are the safety net on the ToS guardrails: operate must
// REFUSE on a Claude subscription and only run on the founder's own console API
// key with explicit opt-in (Anthropic Consumer Terms section 3.7). The env here
// is hermetic (helpers.runScript passes only PATH/HOME), so a real key in the
// runner's environment cannot turn these green by accident.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, tmpBrain, cleanup, runScript } from "./helpers.mjs";

const MEME_L0 = [
  "opportunity-scan",
  "problem-validation-interviews",
  "competitive-teardown",
  "market-sizing-tam-sam-som",
  "jobs-to-be-done-extraction",
  "red-team-thesis",
  "why-now-memo",
  "mvp-scoping",
];

test("operate: refuses without an API key (subscription is ToS-prohibited)", () => {
  const dir = tmpBrain();
  try {
    const r = runScript("operate.mjs", [dir]); // no ANTHROPIC_API_KEY in env
    assert.equal(r.code, 1);
    assert.match(r.stderr, /Consumer Terms|subscription|API key/);
  } finally {
    cleanup(dir);
  }
});

test("operate: rejects a subscription/session token", () => {
  const dir = tmpBrain();
  try {
    const r = runScript("operate.mjs", [dir], {
      ANTHROPIC_API_KEY: "sk-ant-sid01-looks-like-a-session-token",
      CASA_OPERATE: "1",
    });
    assert.equal(r.code, 1);
    assert.match(r.stderr, /session token|console/i);
  } finally {
    cleanup(dir);
  }
});

test("operate: requires explicit CASA_OPERATE opt-in even with a console key", () => {
  const dir = tmpBrain();
  try {
    const r = runScript("operate.mjs", [dir], { ANTHROPIC_API_KEY: "sk-ant-api03-test-key" });
    assert.equal(r.code, 1);
    assert.match(r.stderr, /CASA_OPERATE/);
  } finally {
    cleanup(dir);
  }
});

test("operate: usage error when no brain dir is given", () => {
  const r = runScript("operate.mjs", []);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /usage/);
});

test("operate: dry-run prints the claude plan without executing any loop", () => {
  const dir = tmpBrain();
  try {
    // Stand up an L1 brain so at least one loop (weekly-retro) is due.
    runScript("brain.mjs", ["init", dir]);
    writeFileSync(
      join(dir, "profile.json"),
      readFileSync(join(REPO, "examples", "profile-solana-analytics.json"), "utf8"),
    );
    runScript("brain.mjs", ["complete", dir, ...MEME_L0]);

    const r = runScript("operate.mjs", [dir], {
      ANTHROPIC_API_KEY: "sk-ant-api03-test-key", // passes the guardrails, never used (dry-run)
      CASA_OPERATE: "1",
    });
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /would run|No loops due/);
    assert.ok(!/^\[run\]/m.test(r.stdout), "dry-run must not execute a loop");
  } finally {
    cleanup(dir);
  }
});
