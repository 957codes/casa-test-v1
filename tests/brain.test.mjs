// Integration tests for the company-brain state engine (scripts/brain.mjs).
// brain.mjs is a CLI, so each test drives it as a subprocess against a throwaway
// brain directory and asserts on the rendered artifacts: state.json, build-map.json,
// NOW.md, and the self-rewritten CLAUDE.md AUTO blocks.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { REPO, tmpBrain, cleanup, runScript } from "./helpers.mjs";

// The level-0 non-recurring members for the Memescope (b2c) profile. Completing
// all of them is what advances the company from level 0 to level 1.
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

// init a brain and drop a real (Memescope) profile so the router has something
// to select. Returns the brain directory.
function initMeme() {
  const dir = tmpBrain();
  const init = runScript("brain.mjs", ["init", dir]);
  assert.equal(init.code, 0, init.stderr);
  writeFileSync(
    join(dir, "profile.json"),
    readFileSync(join(REPO, "examples", "profile-solana-analytics.json"), "utf8"),
  );
  return dir;
}

test("init: scaffolds the company brain with empty state", () => {
  const dir = tmpBrain();
  try {
    const r = runScript("brain.mjs", ["init", dir]);
    assert.equal(r.code, 0, r.stderr);
    assert.ok(existsSync(join(dir, "profile.json")), "profile.json copied");
    assert.ok(existsSync(join(dir, "CLAUDE.md")), "company CLAUDE.md copied");
    const state = JSON.parse(readFileSync(join(dir, "state.json"), "utf8"));
    assert.deepEqual(state.completed, []);
  } finally {
    cleanup(dir);
  }
});

test("sync: renders build-map + NOW and rewrites the CLAUDE.md profile block", () => {
  const dir = initMeme();
  try {
    const r = runScript("brain.mjs", ["sync", dir]);
    assert.equal(r.code, 0, r.stderr);
    const map = JSON.parse(readFileSync(join(dir, "build-map.json"), "utf8"));
    assert.equal(map.current_level, 0);
    assert.equal(map.member_count, 79, "Memescope selects 79 playbooks");
    const now = readFileSync(join(dir, "NOW.md"), "utf8");
    assert.match(now, /Memescope/);
    const cm = readFileSync(join(dir, "CLAUDE.md"), "utf8");
    assert.match(cm, /Memescope/, "profile block carries the company name");
    assert.match(cm, /Level 0/, "current-level block reflects level 0");
  } finally {
    cleanup(dir);
  }
});

test("complete: finishing all level-0 work advances the company to level 1", () => {
  const dir = initMeme();
  try {
    const r = runScript("brain.mjs", ["complete", dir, ...MEME_L0]);
    assert.equal(r.code, 0, r.stderr);
    const state = JSON.parse(readFileSync(join(dir, "state.json"), "utf8"));
    assert.equal(state.completed.length, MEME_L0.length);
    const map = JSON.parse(readFileSync(join(dir, "build-map.json"), "utf8"));
    assert.equal(map.current_level, 1, "level advances once L0 is fully done");
    const cm = readFileSync(join(dir, "CLAUDE.md"), "utf8");
    assert.match(cm, /Level 1/);
  } finally {
    cleanup(dir);
  }
});

test("sync: preserves hand-authored content outside the AUTO markers", () => {
  const dir = initMeme();
  try {
    const cmPath = join(dir, "CLAUDE.md");
    const sentinel = "\nSENTINEL-DO-NOT-TOUCH-12345\n";
    writeFileSync(cmPath, readFileSync(cmPath, "utf8") + sentinel);
    const r = runScript("brain.mjs", ["sync", dir]);
    assert.equal(r.code, 0, r.stderr);
    const cm = readFileSync(cmPath, "utf8");
    assert.match(cm, /SENTINEL-DO-NOT-TOUCH-12345/, "hand-edited text survives a sync");
    assert.match(cm, /CASA:AUTO:locked-decisions/, "hand-managed block is left intact");
  } finally {
    cleanup(dir);
  }
});

test("sync: surfaces Capx Pay spend from settled receipts (read-only)", () => {
  const dir = initMeme();
  try {
    // 12_180_000 micro-USD == $12.18 (1 USD = 1e6 micros, matches Capx Pay).
    const receipt = JSON.stringify({ status: "settled", amountMicros: 12_180_000 }) + "\n";
    writeFileSync(join(dir, "finance", "receipts.jsonl"), receipt);
    const r = runScript("brain.mjs", ["sync", dir]);
    assert.equal(r.code, 0, r.stderr);
    const now = readFileSync(join(dir, "NOW.md"), "utf8");
    const cm = readFileSync(join(dir, "CLAUDE.md"), "utf8");
    assert.ok(/12\.18/.test(now) || /12\.18/.test(cm), "spend surfaces as $12.18");
  } finally {
    cleanup(dir);
  }
});

test("loop-ran: records the run date in state", () => {
  const dir = initMeme();
  try {
    const r = runScript("brain.mjs", ["loop-ran", dir, "weekly-retro"]);
    assert.equal(r.code, 0, r.stderr);
    const state = JSON.parse(readFileSync(join(dir, "state.json"), "utf8"));
    assert.match(state.loops["weekly-retro"], /^\d{4}-\d{2}-\d{2}$/, "ISO date recorded");
  } finally {
    cleanup(dir);
  }
});

test("priority-ran: records the re-evaluation date in state (the casa-priority seam)", () => {
  const dir = initMeme();
  try {
    const r = runScript("brain.mjs", ["priority-ran", dir]);
    assert.equal(r.code, 0, r.stderr);
    const state = JSON.parse(readFileSync(join(dir, "state.json"), "utf8"));
    assert.match(state.last_priority, /^\d{4}-\d{2}-\d{2}$/, "ISO date recorded");
  } finally {
    cleanup(dir);
  }
});

test("experiment: appends a dated record to the ledger (the casa-experiment seam)", () => {
  const dir = initMeme();
  try {
    const rec = JSON.stringify({ id: "exp-pricing-1", hypothesis: "annual toggle lifts conversion", status: "running" });
    const r = runScript("brain.mjs", ["experiment", dir, rec]);
    assert.equal(r.code, 0, r.stderr);
    const lines = readFileSync(join(dir, "experiments.jsonl"), "utf8").trim().split("\n");
    assert.equal(lines.length, 1);
    const logged = JSON.parse(lines[0]);
    assert.equal(logged.id, "exp-pricing-1");
    assert.match(logged.logged, /^\d{4}-\d{2}-\d{2}$/, "a logged date is stamped");
  } finally {
    cleanup(dir);
  }
});
