#!/usr/bin/env node
// Casa Console bridge. Zero-dependency. Reads the company-brain, serves it in the
// Foundry shape over localhost, and pushes a Server-Sent Event whenever the brain
// changes so the UI live-updates. READ-ONLY: it never writes to the brain.
//
//   node console/bridge.mjs [brainDir] [--port 4317]

import { createServer } from "node:http";
import { readFileSync, existsSync, watch, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { toFoundry } from "./adapter.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const brainDir = args.find((a) => !a.startsWith("--")) || "company-brain";
const portFlag = args.indexOf("--port");
const PORT = portFlag !== -1 ? Number(args[portFlag + 1]) : 4317;
const DIST = join(here, "dist");

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

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".png": "image/png", ".webp": "image/webp" };
const clients = new Set();

const server = createServer((req, res) => {
  const cors = { "Access-Control-Allow-Origin": "*" };
  const path = (req.url || "/").split("?")[0];

  if (path === "/api/brain") {
    res.writeHead(200, { "Content-Type": "application/json", ...cors });
    res.end(JSON.stringify(toFoundry(readBrain(brainDir))));
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

// Watch the brain and notify connected clients on any change (debounced).
if (existsSync(brainDir)) {
  let timer;
  try {
    watch(brainDir, { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => { for (const res of clients) res.write("data: changed\n\n"); }, 150);
    });
  } catch { /* recursive watch unsupported here; live refresh degrades to manual reload */ }
}

server.listen(PORT, () => {
  console.log(`Casa Console bridge on http://localhost:${PORT}  (brain: ${brainDir})`);
});
