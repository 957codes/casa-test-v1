#!/usr/bin/env node
// Company-brain state engine. Performs the deterministic self-update of the
// company workspace: derives the current level, writes build-map.yaml + NOW.md,
// and rewrites the CLAUDE.md AUTO blocks (T1-T5) safely (inside markers only).
//
//   node scripts/brain.mjs init     <brainDir>
//   node scripts/brain.mjs sync     <brainDir>
//   node scripts/brain.mjs complete <brainDir> <playbook-id> [<id> ...]
//
// progress lives in <brainDir>/state.yaml { completed: [...] }; everything else
// (build-map.yaml, NOW.md, CLAUDE.md blocks) is rendered from it + profile.yaml.

import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildMap, nextActions, select } from "./router.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = dirname(here);
const TEMPLATE = join(repo, "templates", "company-brain");
const LEVEL_NAMES = {
  "always-on": "Foundations", 0: "Ideation and Validation", 1: "Commit and Incorporate",
  2: "Product and Infra Foundation", 3: "Build and Pre-launch", 4: "Launch",
  5: "First Customers and PMF", 6: "Scale Acquisition", 7: "Enterprise Sales",
  8: "Growth Finance and Fundraise",
};
const levelKey = (l) => (l === "always-on" ? -1 : Number(l));
const today = () => new Date().toISOString().slice(0, 10);
const playbooks = () => JSON.parse(readFileSync(join(repo, "playbooks", "_index.json"), "utf8")).playbooks;
const titleOf = (pb) => new Map(pb.map((p) => [p.id, p.title]));

const daysSince = (d) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : Infinity);
function loadLoops(dir) {
  const f = existsSync(join(dir, "loops.json")) ? join(dir, "loops.json") : join(TEMPLATE, "loops.json");
  return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")).loops || []) : [];
}
function dueLoops(dir, profile, level, state) {
  const traits = new Set(profile.traits || []);
  const ran = state.loops || {};
  return loadLoops(dir).filter((l) => {
    if (level < (l.min_level ?? 0)) return false;
    if (l.applies_when && !l.applies_when.every((t) => traits.has(t))) return false;
    if (!l.cadence_days) return false;
    return daysSince(ran[l.id]) >= l.cadence_days;
  }).map((l) => ({ id: l.id, title: l.title, runs: l.runs }));
}

// Capx Pay writes receipts here (PaymentReceipt: amountMicros in micro-dollars,
// status 'settled' | 'dry-run' | 'failed'). Casa only reads them, never writes
// charges. 1 USD = 1_000_000 micros (matches Capx Pay src/money.ts).
function readSpend(dir) {
  const f = join(dir, "finance", "receipts.jsonl");
  if (!existsSync(f)) return 0;
  let micros = 0;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const s = line.trim(); if (!s) continue;
    try { const r = JSON.parse(s); if (r.status === "settled") micros += Number(r.amountMicros || 0); }
    catch { /* skip malformed line */ }
  }
  return Math.round((micros / 1_000_000) * 100) / 100; // micros -> USD
}

function readProfile(dir) {
  const f = join(dir, "profile.json");
  if (!existsSync(f)) throw new Error(`no profile.json in ${dir} (run casa-start)`);
  return JSON.parse(readFileSync(f, "utf8"));
}
function readState(dir) {
  const f = join(dir, "state.json");
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) || { completed: [] } : { completed: [] };
}
function writeState(dir, s) { writeFileSync(join(dir, "state.json"), JSON.stringify(s, null, 2)); }

// current level = first level whose non-recurring members are not all completed
function deriveLevel(pb, profile, completed) {
  const { members } = select(pb, profile);
  const done = new Set(completed);
  const levels = [...new Set(members.map((m) => m.level))].filter((l) => l !== "always-on").sort((a, b) => levelKey(a) - levelKey(b));
  for (const L of levels) {
    const nonRec = members.filter((m) => m.level === L && !m.recurring);
    if (nonRec.length && !nonRec.every((m) => done.has(m.id))) return Number(L);
  }
  return 8;
}

// The displayed level never drops below the floor the founder started at
// (state.start_level, set by the stage seed). A lower-level gap therefore surfaces
// as a ready catch-up item at the current level instead of regressing the company.
function currentLevel(pb, profile, state) {
  const derived = deriveLevel(pb, profile, state.completed || []);
  return Math.max(derived, Number(state.start_level || 0));
}

function setBlock(text, section, inner) {
  const re = new RegExp(`(<!-- CASA:AUTO:${section} -->)[\\s\\S]*?(<!-- /CASA:AUTO:${section} -->)`);
  return re.test(text) ? text.replace(re, (_m, open, close) => `${open}\n${inner}\n${close}`) : text;
}

function nowText(profile, actions, level, due = [], spend = 0) {
  const top = actions[0];
  const out = [`# Now`, ``, `Company: ${profile.company_name || profile.one_liner || "(unnamed)"}`,
    `Level ${level}: ${LEVEL_NAMES[level] || level}`];
  if (spend > 0) out.push(`Spend to date (Capx Pay): $${spend}`);
  out.push(``, `## Next action`);
  if (!top) out.push(`- Nothing ready at this level. Run /casa-map or advance the level.`);
  else {
    out.push(`- ${top.title}  (${top.id})${top.human_gate ? "  [needs your approval]" : ""}`);
    const par = actions.slice(1, 4); // next-highest ready actions, any level (all are startable now)
    if (par.length) { out.push(``, `## You can also start now`); for (const p of par) out.push(`- ${p.title}  (${p.id})`); }
  }
  if (due.length) { out.push(``, `## Loops due now`); for (const l of due) out.push(`- ${l.title}  (loop: ${l.id})`); }
  out.push(``, `This file is kept current by the router. Do not hand-edit.`);
  return out.join("\n") + "\n";
}

function sync(dir) {
  const pb = playbooks();
  const profile = readProfile(dir);
  const state = readState(dir);
  const completed = state.completed || [];
  const level = currentLevel(pb, profile, state);
  const pulse = existsSync(join(dir, "pulse.json")) ? JSON.parse(readFileSync(join(dir, "pulse.json"), "utf8")) : null;
  const weights = pulse?.weights || null;
  const map = buildMap(pb, profile, { completed, level });
  const actions = nextActions(pb, profile, { completed, level, weights });
  const due = dueLoops(dir, profile, level, state);
  const spend = readSpend(dir);
  const titles = titleOf(pb);

  writeFileSync(join(dir, "build-map.json"), JSON.stringify({ business_profile: profile, current_level: level, ...map }, null, 2));
  writeFileSync(join(dir, "NOW.md"), nowText(profile, actions, level, due, spend));

  // self-update the CLAUDE.md AUTO blocks (T1-T5)
  const cmPath = join(dir, "CLAUDE.md");
  if (existsSync(cmPath)) {
    let cm = readFileSync(cmPath, "utf8").replaceAll("{{COMPANY_NAME}}", profile.company_name || "your company");
    const types = [profile.primary_type, profile.secondary_type].filter(Boolean).join(" + ");
    cm = setBlock(cm, "profile", [
      `- Name: ${profile.company_name || "(unnamed)"}`,
      `- One-liner: ${profile.one_liner || ""}`,
      `- Type: ${types}`,
      `- Traits: ${(profile.traits || []).join(", ")}`,
      `- ICP: ${profile.icp || ""}`,
      `- Monetization: ${profile.monetization || ""}`,
    ].join("\n"));
    cm = setBlock(cm, "selected-levels", `Selected ${map.member_count} playbooks across ` +
      map.levels.map((l) => `L${l.level} (${l.nodes.length})`).join(", ") + ".");
    cm = setBlock(cm, "current-level", `Level ${level}: ${LEVEL_NAMES[level] || level}.`);
    const top = actions[0];
    const nextInner = top
      ? [`Next: ${top.title} (${top.id})${top.human_gate ? " [needs approval]" : ""}`,
         ...actions.slice(1, 3).map((p) => `Parallel: ${p.title} (${p.id})`)].join("\n")
      : `Next: nothing ready at level ${level}.`;
    cm = setBlock(cm, "next", nextInner);
    const doneTitles = completed.slice(-10).map((id) => `- ${titles.get(id) || id}`);
    cm = setBlock(cm, "done", doneTitles.length ? doneTitles.join("\n") : "Nothing completed yet.");
    cm = setBlock(cm, "state", `${completed.length} playbooks done. Level ${level}.${spend > 0 ? ` Spend to date via Capx Pay: $${spend}.` : ""} Updated ${today()}.`);
    writeFileSync(cmPath, cm);
  }
  return { level, completed: completed.length, member_count: map.member_count, top: actions[0] };
}

function init(dir) {
  mkdirSync(dir, { recursive: true });
  cpSync(TEMPLATE, dir, { recursive: true });
  if (!existsSync(join(dir, "state.yaml"))) writeState(dir, { completed: [] });
  console.log(`initialized company brain at ${dir}`);
}

function complete(dir, ids) {
  const state = readState(dir);
  state.completed = [...new Set([...(state.completed || []), ...ids])];
  writeState(dir, state);
  const r = sync(dir);
  console.log(`marked done: ${ids.join(", ")}`);
  console.log(`now level ${r.level}, ${r.completed} done. Next: ${r.top ? r.top.title : "(none)"}`);
}

const [cmd, dir, ...rest] = process.argv.slice(2);
if (!cmd || !dir) { console.error("usage: brain.mjs init|sync|complete <brainDir> [ids...]"); process.exit(2); }
if (cmd === "init") init(dir);
else if (cmd === "sync") { const r = sync(dir); console.log(`synced: level ${r.level}, ${r.completed} done, ${r.member_count} playbooks. Next: ${r.top ? r.top.title : "(none)"}`); }
else if (cmd === "complete") { if (!rest.length) { console.error("complete needs at least one playbook id"); process.exit(2); } complete(dir, rest); }
else if (cmd === "loop-ran") { if (!rest.length) { console.error("loop-ran needs a loop id"); process.exit(2); } const s = readState(dir); s.loops = s.loops || {}; s.loops[rest[0]] = today(); writeState(dir, s); sync(dir); console.log(`loop ${rest[0]} marked run ${today()}`); }
else if (cmd === "priority-ran") { const s = readState(dir); s.last_priority = today(); writeState(dir, s); sync(dir); console.log(`priority re-evaluated ${today()}`); }
else if (cmd === "experiment") { if (!rest.length) { console.error("experiment needs a JSON record"); process.exit(2); } const rec = JSON.parse(rest.join(" ")); rec.logged = today(); appendFileSync(join(dir, "experiments.jsonl"), JSON.stringify(rec) + "\n"); console.log(`logged experiment ${rec.id || "(unnamed)"} ${today()}`); }
else if (cmd === "due") { const pb = playbooks(); const profile = readProfile(dir); const state = readState(dir); const level = currentLevel(pb, profile, state); console.log(JSON.stringify(dueLoops(dir, profile, level, state))); }
else { console.error(`unknown command: ${cmd}`); process.exit(2); }
