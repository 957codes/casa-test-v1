#!/usr/bin/env node
// Preflight for publishing/installing Capx Casa as a Claude Code plugin.
// Zero dependencies on purpose (node: builtins only) so it runs on a fresh clone
// with no npm install. Validates structure + the runtime zero-dependency
// guarantee. Run: node scripts/check-plugin.mjs   (exits non-zero on failure)

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const fails = [];
const oks = [];
const ok = (m) => oks.push(m);
const fail = (m) => fails.push(m);

function readJSON(p) { return JSON.parse(readFileSync(p, "utf8")); }
function frontmatter(p) {
  const m = readFileSync(p, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : null;
}
function walk(dir, ext) {
  const out = [];
  for (const n of readdirSync(dir)) {
    const f = join(dir, n);
    statSync(f).isDirectory() ? out.push(...walk(f, ext)) : (ext ? n.endsWith(ext) : true) && out.push(f);
  }
  return out;
}

// 1. plugin + marketplace manifests
try {
  const p = readJSON(join(repo, ".claude-plugin", "plugin.json"));
  p.name && p.version ? ok(`plugin.json: ${p.name}@${p.version}`) : fail("plugin.json missing name/version");
} catch (e) { fail(`plugin.json: ${e.message}`); }
try { readJSON(join(repo, ".claude-plugin", "marketplace.json")); ok("marketplace.json parses"); }
catch (e) { fail(`marketplace.json: ${e.message}`); }

// 2. skills have name + description frontmatter
for (const dir of readdirSync(join(repo, "skills"))) {
  const f = join(repo, "skills", dir, "SKILL.md");
  if (!existsSync(f)) { fail(`skill ${dir}: no SKILL.md`); continue; }
  const fm = frontmatter(f);
  if (fm && /\bname:\s*\S/.test(fm) && /\bdescription:\s*\S/.test(fm)) ok(`skill ${dir}`);
  else fail(`skill ${dir}: frontmatter needs name + description`);
}

// 3. agents have name + description frontmatter
for (const f of walk(join(repo, "agents"), ".md")) {
  const fm = frontmatter(f);
  if (fm && /\bname:\s*\S/.test(fm) && /\bdescription:\s*\S/.test(fm)) ok(`agent ${relative(repo, f)}`);
  else fail(`agent ${relative(repo, f)}: frontmatter needs name + description`);
}

// 4. hooks.json parses + referenced command exists and is executable
try {
  const hooks = readJSON(join(repo, "hooks", "hooks.json"));
  const cmds = JSON.stringify(hooks).match(/\$\{CLAUDE_PLUGIN_ROOT\}\/[^"]+/g) || [];
  if (!cmds.length) fail("hooks.json: no ${CLAUDE_PLUGIN_ROOT} command found");
  for (const c of cmds) {
    const f = join(repo, c.replace("${CLAUDE_PLUGIN_ROOT}/", ""));
    if (!existsSync(f)) { fail(`hook command missing: ${c}`); continue; }
    (statSync(f).mode & 0o111) ? ok(`hook ${relative(repo, f)} (executable)`) : fail(`hook ${relative(repo, f)} not executable (chmod +x)`);
  }
} catch (e) { fail(`hooks.json: ${e.message}`); }

// 5. playbook catalog parses + count matches files
try {
  const idx = readJSON(join(repo, "playbooks", "_index.json"));
  const files = walk(join(repo, "playbooks"), ".md").length;
  idx.playbooks.length === files ? ok(`_index.json: ${idx.playbooks.length} playbooks == ${files} files`)
    : fail(`_index.json count ${idx.playbooks.length} != ${files} playbook files (run npm run build:index)`);
} catch (e) { fail(`_index.json: ${e.message}`); }

// 6. RUNTIME ZERO-DEPENDENCY GUARANTEE: the scripts a founder's session invokes
//    must import only node: builtins or relative paths (no node_modules).
const RUNTIME = ["router.mjs", "brain.mjs", "stage.mjs", "scan.mjs", "copy-lint.mjs", "design-check.mjs", "operate.mjs", "check-plugin.mjs"];
for (const s of RUNTIME) {
  const src = readFileSync(join(repo, "scripts", s), "utf8");
  const specs = [...src.matchAll(/^\s*import\s+[^'"]*from\s+["']([^"']+)["']/gm)].map((m) => m[1]);
  const bad = specs.filter((x) => !x.startsWith("node:") && !x.startsWith("."));
  bad.length ? fail(`${s} has external imports (breaks zero-dep): ${bad.join(", ")}`) : ok(`${s} zero-dep (${specs.length} imports, all node:/relative)`);
}

// 7. company-brain template has the JSON state files + contract
for (const f of ["CLAUDE.md", "NOW.md", "profile.json", "build-map.json", "loops.json"]) {
  const p = join(repo, "templates", "company-brain", f);
  if (!existsSync(p)) { fail(`template missing ${f}`); continue; }
  if (f.endsWith(".json")) { try { readJSON(p); ok(`template ${f}`); } catch (e) { fail(`template ${f}: ${e.message}`); } }
  else ok(`template ${f}`);
}

// report
console.log(oks.map((m) => `  ok   ${m}`).join("\n"));
if (fails.length) { console.log("\nFAILURES:"); console.log(fails.map((m) => `  FAIL ${m}`).join("\n")); }
console.log(`\n${fails.length ? "FAIL" : "PASS"}: ${oks.length} ok, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
