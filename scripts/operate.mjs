#!/usr/bin/env node
// Operate mode (v2): run due loops headless. This is automation, which Anthropic
// Consumer Terms section 3.7 prohibits on a subscription. It runs ONLY on the
// founder's own API key (metered billing). Dry-run by default; --run executes.
//
//   ANTHROPIC_API_KEY=sk-ant-... CASA_OPERATE=1 node scripts/operate.mjs <brainDir> [--run]

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const brainCli = join(here, "brain.mjs");
const dir = process.argv[2];
const run = process.argv.includes("--run");
if (!dir || dir.startsWith("--")) { console.error("usage: operate.mjs <brainDir> [--run]"); process.exit(2); }

// --- ToS guardrails ---
const key = process.env.ANTHROPIC_API_KEY;
if (!key) {
  console.error("Operate mode is headless automation. That is prohibited on a Claude subscription (Consumer Terms 3.7).");
  console.error("It runs only on your own API key. Set ANTHROPIC_API_KEY (metered billing) to use it. Aborting.");
  process.exit(1);
}
if (key.includes("oat") || key.startsWith("sk-ant-sid")) {
  console.error("That looks like a subscription/session token, not a console API key. Operate mode needs a console.anthropic.com API key. Aborting.");
  process.exit(1);
}
if (process.env.CASA_OPERATE !== "1") {
  console.error("Set CASA_OPERATE=1 to confirm you accept metered API billing for headless runs. Aborting.");
  process.exit(1);
}

execSync(`node ${brainCli} sync ${JSON.stringify(dir)}`, { stdio: "ignore" });
const due = JSON.parse(execSync(`node ${brainCli} due ${JSON.stringify(dir)}`).toString());
if (!due.length) { console.log("No loops due. Nothing to operate."); process.exit(0); }

console.log(`${due.length} loop(s) due${run ? "" : " (dry-run; pass --run to execute)"}:`);
for (const l of due) {
  const prompt = `You are operating Capx Casa for the company in ${dir}. Run the recurring loop "${l.id}" (${l.runs}). Read company-brain first, do the loop, write outputs to the brain, then run: node ${brainCli} loop-ran ${dir} ${l.id}`;
  const cmd = `claude -p ${JSON.stringify(prompt)} --permission-mode acceptEdits`;
  if (run) { console.log(`[run] ${l.id}`); execSync(cmd, { stdio: "inherit", env: process.env }); }
  else { console.log(`\n[${l.id}] would run:\n  ${cmd}`); }
}
