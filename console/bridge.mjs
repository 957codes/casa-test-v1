#!/usr/bin/env node
// Casa Console bridge. Zero-dependency (node: builtins only). Reads the company-brain, serves
// it in the Foundry shape over localhost, and pushes a Server-Sent Event whenever the brain or
// the intent queue changes so the UI live-updates.
//
// It is a two-way MAILBOX, not an agent:
//   - DETERMINISTIC intents (complete, loop-ran, priority-ran, experiment) shell out to the
//     deterministic engine `scripts/brain.mjs` inline. brain.mjs stays the SOLE writer of brain
//     state (rule 4); running deterministic code is not automated agent use (rule 5).
//   - WORK intents (build, chat, review, next) are appended to an append-only queue OUTSIDE the
//     brain state files; the founder's interactive Claude Code session drains them via casa-serve.
//     The bridge NEVER spawns an agent or `claude -p` (rule 5: interactive only). It only ever
//     writes company-brain/console/* (the request queue), never build-map.json/state.json/profile.json.
//
//   node console/bridge.mjs [brainDir] [--port 4317]

import { createServer } from "node:http";
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, readdirSync, watch, statSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { toFoundry } from "./adapter.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = dirname(here);
const BRAIN_SCRIPT = join(repo, "scripts", "brain.mjs");
const args = process.argv.slice(2);
const brainDir = args.find((a) => !a.startsWith("--")) || "company-brain";
const portFlag = args.indexOf("--port");
const PORT = portFlag !== -1 ? Number(args[portFlag + 1]) : 4317;
const DIST = join(here, "dist");
const CONSOLE_DIR = join(brainDir, "console");
const QUEUE = join(CONSOLE_DIR, "queue.jsonl");
const MESSAGES = join(CONSOLE_DIR, "messages.jsonl");

function readJson(p, fallback) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return fallback; } }
function readSpend(dir) {
  const f = join(dir, "finance", "receipts.jsonl");
  if (!existsSync(f)) return 0;
  let micros = 0;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const s = line.trim(); if (!s) continue;
    try { const r = JSON.parse(s); if (r.status === "settled") micros += Number(r.amountMicros || 0); } catch { /* skip */ }
  }
  return Math.round((micros / 1e6) * 100) / 100;
}
function readBrain(dir) {
  return {
    buildMap: readJson(join(dir, "build-map.json"), { levels: [] }),
    profile: readJson(join(dir, "profile.json"), {}),
    state: readJson(join(dir, "state.json"), {}),
    spend: readSpend(dir),
  };
}

// ---- Loops (recurring cadences) and Capx Pay receipts, for the health/loops/spend surfaces ----
// The loop manifest lives in the brain (or the template fallback), exactly like scripts/brain.mjs.
function readLoopManifest(dir) {
  const f = existsSync(join(dir, "loops.json")) ? join(dir, "loops.json") : join(repo, "templates", "company-brain", "loops.json");
  return readJson(f, { loops: [] }).loops || [];
}
const daysSince = (d) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : Infinity);
// Loop status mirrors scripts/brain.mjs dueLoops (the engine owns the cadence rule, rule 4): a loop is
// eligible when the company has reached its min_level and carries its required traits; due when the time
// since its last run meets the cadence. The clock lives here (runtime), so the adapter stays pure/testable.
function loopStatus(brain) {
  const level = brain.buildMap.current_level ?? 0;
  const traits = new Set(brain.profile.traits || []);
  const ran = brain.state.loops || {};
  return readLoopManifest(brainDir).map((l) => {
    const eligible = level >= (l.min_level ?? 0) && (!l.applies_when || l.applies_when.every((t) => traits.has(t)));
    const last = ran[l.id] || null;
    const since = daysSince(last);
    const cadence = l.cadence_days || 0;
    const due = eligible && cadence > 0 && since >= cadence;
    return {
      id: l.id, title: l.title, why: l.why || "", runs: l.runs || null,
      cadence_days: cadence, min_level: l.min_level ?? 0, brain_key: l.brain_key || null,
      eligible, last_ran: last,
      days_since: since === Infinity ? null : since,
      due, never_run: eligible && last == null,
      overdue_days: eligible && last != null && cadence > 0 ? Math.max(0, since - cadence) : 0,
      next_due_in_days: eligible && last != null && cadence > 0 ? Math.max(0, cadence - since) : null,
    };
  });
}
// Capx Pay receipts (Pay writes finance/receipts.jsonl; Casa only reads, rule 8). Surface them labeled
// distinctly from any CAPX holding. amountMicros is micro-USD (1 USD = 1e6).
function readReceipts(dir) {
  const f = join(dir, "finance", "receipts.jsonl");
  return readJsonl(f).map((r) => ({
    ts: r.ts || null,
    descriptor: r.descriptor || r.capability || r.ref || "spend",
    amount_usd: Math.round((Number(r.amountMicros || 0) / 1e6) * 100) / 100,
    status: r.status || "settled",
    ref: r.ref || null,
  }));
}

// The catalog (the plugin's playbooks index) carries each node's TLDR (selection_hint), criticality,
// and the gradeable deliverable/rubric. It is static, so load it once.
const CATALOG = (() => {
  const idx = readJson(join(repo, "playbooks", "_index.json"), { playbooks: [] });
  const m = {};
  for (const p of idx.playbooks || []) m[p.id] = { selection_hint: p.selection_hint, criticality: p.criticality, deliverable: p.deliverable || null, rubric: p.rubric || null };
  return m;
})();
function readJsonl(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
// latest score per node (casa-review appends to scores.jsonl)
function readScores() {
  const m = {};
  for (const s of readJsonl(join(CONSOLE_DIR, "scores.jsonl"))) m[s.nodeId] = s;
  return m;
}
function readNotes() {
  const m = {};
  for (const n of readJsonl(join(CONSOLE_DIR, "notes.jsonl"))) m[n.nodeId] = n;
  return m;
}
// nodes with a pending or running intent are "working"
function workingSet() {
  const w = new Set();
  for (const r of readQueue()) if (r.nodeId && (r.status === "pending" || r.status === "running")) w.add(r.nodeId);
  return w;
}
function enriched() {
  const brain = readBrain(brainDir);
  return toFoundry(brain, {
    catalog: CATALOG, scores: readScores(), working: workingSet(), notes: readNotes(),
    loops: loopStatus(brain), receipts: readReceipts(brainDir),
  });
}

// ---- intent queue (append-only JSONL, OUTSIDE the brain state files) ----
function readQueue() {
  if (!existsSync(QUEUE)) return [];
  const out = [];
  for (const line of readFileSync(QUEUE, "utf8").split("\n")) {
    const s = line.trim(); if (!s) continue;
    try { out.push(JSON.parse(s)); } catch { /* skip a bad line */ }
  }
  // collapse to the latest record per intent id (the executor rewrites status by appending)
  const byId = new Map();
  for (const r of out) byId.set(r.id, { ...(byId.get(r.id) || {}), ...r });
  return [...byId.values()];
}
function appendQueue(rec) {
  if (!existsSync(CONSOLE_DIR)) mkdirSync(CONSOLE_DIR, { recursive: true });
  appendFileSync(QUEUE, JSON.stringify(rec) + "\n");
}
function appendMessage(rec) {
  if (!existsSync(CONSOLE_DIR)) mkdirSync(CONSOLE_DIR, { recursive: true });
  appendFileSync(MESSAGES, JSON.stringify(rec) + "\n");
}
let counter = 0;
const genId = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

// Intents that map 1:1 to a deterministic brain.mjs subcommand: run inline, no LLM, no agent.
// brain.mjs is the only writer of brain state.
const DETERMINISTIC = {
  complete: (i) => ["complete", brainDir, i.nodeId],
  "loop-ran": (i) => ["loop-ran", brainDir, i.nodeId],
  "priority-ran": () => ["priority-ran", brainDir],
  experiment: (i) => ["experiment", brainDir, JSON.stringify(i.payload || {})],
};
// Intents that need real LLM work: queued for the founder's interactive casa-serve drain.
const WORK = new Set(["build", "chat", "review", "next", "resolve-gate"]);

function runBrain(argv) {
  return execFileSync("node", [BRAIN_SCRIPT, ...argv], { encoding: "utf8", timeout: 30000 });
}

// Guard: never complete a node that is not currently `ready` (rule 4 -- a click cannot bypass gating).
function nodeStatus(nodeId) {
  const bm = readBrain(brainDir).buildMap;
  for (const lvl of bm.levels || []) for (const n of lvl.nodes || []) if (n.id === nodeId) return n.status;
  return null;
}

function handleIntent(body) {
  const kind = String(body.kind || "");
  const rec = { id: genId(), ts: new Date().toISOString(), kind, nodeId: body.nodeId || null, payload: body.payload || {}, status: "pending" };

  if (DETERMINISTIC[kind]) {
    if (kind === "complete") {
      const st = nodeStatus(rec.nodeId);
      if (st !== "ready") { rec.status = "error"; rec.result = `node "${rec.nodeId}" is ${st || "unknown"}, not ready to complete`; appendQueue(rec); return rec; }
    }
    try {
      const out = runBrain(DETERMINISTIC[kind](rec));
      // re-render the brain after a deterministic mutation
      try { runBrain(["sync", brainDir]); } catch { /* sync best-effort */ }
      rec.status = "done"; rec.result = out.trim().slice(0, 2000);
    } catch (e) {
      rec.status = "error"; rec.result = String(e.stderr || e.message || e).slice(0, 2000);
    }
    appendQueue(rec);
    return rec;
  }

  if (WORK.has(kind)) {
    if (kind === "chat" && body.payload?.message) {
      appendMessage({ id: genId(), nodeId: rec.nodeId, role: "user", content: String(body.payload.message), intentId: rec.id, ts: rec.ts });
    }
    appendQueue(rec); // a present founder drains this via /casa-serve; the bridge never executes it
    return rec;
  }

  rec.status = "error"; rec.result = `unknown intent kind "${kind}"`;
  appendQueue(rec);
  return rec;
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".png": "image/png", ".webp": "image/webp" };
const clients = new Set();
function notify() { for (const res of clients) res.write("data: changed\n\n"); }

function readBody(req) {
  return new Promise((resolve) => {
    let data = ""; req.on("data", (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); } });
  });
}

const server = createServer(async (req, res) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
  const path = (req.url || "/").split("?")[0];
  const url = new URL(req.url || "/", "http://localhost");

  if (req.method === "OPTIONS") { res.writeHead(204, cors); res.end(); return; }

  if (path === "/api/brain") {
    res.writeHead(200, { "Content-Type": "application/json", ...cors });
    res.end(JSON.stringify(enriched()));
    return;
  }
  if (path === "/api/output") {
    // the deliverable files a node produced (written under company-brain/outputs/<node>/)
    const node = url.searchParams.get("node") || "";
    const dir = join(brainDir, "outputs", node);
    const files = [];
    if (node && existsSync(dir) && statSync(dir).isDirectory()) {
      const walk = (d, base = "") => {
        for (const name of readdirSync(d)) {
          const p = join(d, name), rel = base ? `${base}/${name}` : name;
          if (statSync(p).isDirectory()) walk(p, rel);
          else { const c = readFileSync(p, "utf8"); files.push({ path: `${node}/${rel}`, bytes: Buffer.byteLength(c), content: c.length > 50000 ? c.slice(0, 50000) + "\n...(truncated)" : c }); }
        }
      };
      try { walk(dir); } catch { /* skip */ }
    }
    res.writeHead(200, { "Content-Type": "application/json", ...cors });
    res.end(JSON.stringify({ node, files }));
    return;
  }
  if (path === "/api/activity") {
    const node = url.searchParams.get("node");
    const all = readJsonl(join(CONSOLE_DIR, "activity.jsonl"));
    res.writeHead(200, { "Content-Type": "application/json", ...cors });
    res.end(JSON.stringify(node ? all.filter((a) => a.nodeId === node) : all.slice(-60)));
    return;
  }
  if (path === "/api/queue") {
    res.writeHead(200, { "Content-Type": "application/json", ...cors });
    res.end(JSON.stringify(readQueue()));
    return;
  }
  if (path === "/api/messages") {
    const node = url.searchParams.get("node");
    const all = existsSync(MESSAGES) ? readFileSync(MESSAGES, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [];
    res.writeHead(200, { "Content-Type": "application/json", ...cors });
    res.end(JSON.stringify(node ? all.filter((m) => m.nodeId === node) : all));
    return;
  }
  if (path === "/api/intent" && req.method === "POST") {
    const body = await readBody(req);
    const rec = handleIntent(body);
    setTimeout(notify, 50); // SSE so a queued click shows progress even before brain.mjs writes
    res.writeHead(rec.status === "error" ? 400 : 200, { "Content-Type": "application/json", ...cors });
    res.end(JSON.stringify(rec));
    return;
  }
  if (path === "/api/events") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", ...cors });
    res.write("retry: 2000\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  // Serve the built UI if present (SPA fallback to index.html).
  if (existsSync(DIST)) {
    let file = join(DIST, path === "/" ? "/index.html" : path);
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, "index.html");
    if (existsSync(file)) {
      res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
      res.end(readFileSync(file));
      return;
    }
  }
  res.writeHead(404, { "Content-Type": "text/plain", ...cors });
  res.end("Casa Console bridge is running. The UI is not built yet.\nRun:  cd console && npm install && npm run build\nOr for the dev server:  npm run dev\n");
});

// Watch the brain (and the console queue under it) and notify clients on any change (debounced).
if (existsSync(brainDir)) {
  let timer;
  try {
    watch(brainDir, { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(notify, 150); });
  } catch { /* recursive watch unsupported here; live refresh degrades to manual reload */ }
}

// Bind to loopback only. The Console runs on the founder's own machine (rule 1: on
// localhost) and exposes state-mutating POSTs, so it must never be reachable from the LAN.
server.listen(PORT, "127.0.0.1", () => {
  console.log(`Casa Console bridge on http://localhost:${PORT}  (brain: ${brainDir})`);
});
