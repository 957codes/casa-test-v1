// Casa Console adapter. Pure transform: the Casa company-brain into the Foundry UI
// shape ({ company, stages, tasks }). Zero-dependency, so it is unit-tested from the
// main suite (tests/adapter.test.mjs). The Console is read-only; this never mutates.

const levelKey = (l) => (l === "always-on" ? -1 : Number(l));

// Map a playbook to a department for the colored node graph and the per-area view.
// Casa playbooks are organized by level, not department, so we derive one from the id
// and title. A `department` field on playbooks can replace this later.
const DEPARTMENT_RULES = [
  [/(north-star|funnel|cohort|event-taxonomy|dashboard|experimentation|metric)/, "Data"],
  [/(brand|naming|positioning|category|visual-identity|tone|messaging)/, "Brand"],
  [/(entity|incorporat|tos|privacy|trademark|legal|founding-docs|compliance)/, "Legal"],
  [/(design|onboarding-flow|landing|wireframe|ux|prd|prototype|merchandising)/, "Product"],
  [/(pricing|unit-econ|financ|fundrais|model|packaging|burn|runway|forecast|cogs|supplier)/, "Finance"],
  [/(sales|discovery|contract|deal|pipeline|enterprise|outbound)/, "Sales"],
  [/(support|nps|csat|churn|customer-success|helpdesk|winback|community)/, "Success"],
  [/(growth|seo|ads|content|referral|affiliate|influencer|launch|product-hunt|email|newsletter|social|retarget)/, "Growth"],
  [/(hosting|repo|stack|security|observability|analytics|deploy|tech|infra|database|incident|backup)/, "Engineering"],
  [/(opportunity|problem-validation|market-sizing|jtbd|red-team|why-now|thesis|beachhead|competitive)/, "Strategy"],
];
function departmentOf(id, title) {
  const s = `${id} ${title}`.toLowerCase();
  for (const [re, dept] of DEPARTMENT_RULES) if (re.test(s)) return dept;
  return "Operations";
}

// build-map status (+ human_gate, + live work) -> Foundry task state. A node with a pending or
// running intent in the queue renders as "agent" (working) so the founder sees live progress.
function stateOf(node, working) {
  if (working && working.has(node.id)) return "agent";
  if (node.status === "done") return "completed";
  if (node.status === "blocked") return "locked";
  return node.human_gate ? "approval" : "input"; // ready
}

// Company health (the attention/health "game"): a pure function over the already-shaped tasks +
// stages + loop status (the bridge dates the loops; this stays clock-free so it is unit-testable).
// It blends do-or-die coverage, momentum, graded quality, open-gate pressure, and loop hygiene into a
// single 0-100 score, and exposes the components so the founder can see and fix the weakest dimension.
const CRIT_RANK = { existential: 0, core: 1, growth: 2, optional: 3 };
function computeHealth(tasks, stages, loops) {
  const byDept = {};
  for (const t of tasks) {
    const d = (byDept[t.owner] ||= { name: t.owner, total: 0, done: 0, blocked: 0, ready: 0, working: 0 });
    d.total++;
    if (t.state === "completed") d.done++;
    else if (t.state === "locked") d.blocked++;
    else if (t.state === "agent") d.working++;
    else d.ready++; // approval | input
  }
  const departments = Object.values(byDept)
    .map((d) => ({ ...d, pct: d.total ? Math.round((d.done / d.total) * 100) : 0 }))
    .sort((a, b) => b.ready - a.ready || b.total - a.total);

  const levels = stages.map((s) => ({ id: s.id, label: s.label, done: s.done, total: s.total, pct: s.total ? Math.round((s.done / s.total) * 100) : 0 }));

  // Existential coverage: do-or-die plays that are actionable now (not locked) -- are they done?
  const exNow = tasks.filter((t) => t.criticality === "existential" && t.state !== "locked");
  const exDone = exNow.filter((t) => t.state === "completed").length;
  const existentialHealth = exNow.length ? exDone / exNow.length : 1;

  // Quality: average graded score of completed nodes (null when nothing graded yet).
  const scored = tasks.filter((t) => t.state === "completed" && t.score && typeof t.score.value === "number");
  const quality = scored.length ? scored.reduce((s, t) => s + t.score.value, 0) / scored.length / 100 : null;

  const openExistential = exNow.filter((t) => t.state === "approval" || t.state === "input").length;
  const attentionFlow = 1 - Math.min(1, openExistential / 5);

  const eligibleLoops = (loops || []).filter((l) => l.eligible);
  const overdueLoops = eligibleLoops.filter((l) => l.due);
  const loopHygiene = eligibleLoops.length ? 1 - overdueLoops.length / eligibleLoops.length : 1;

  const completeCount = tasks.filter((t) => t.state === "completed").length;
  const momentum = tasks.length ? completeCount / tasks.length : 0;

  // Composite. When nothing is graded, quality's weight redistributes to momentum so a company is
  // scored on what it has shipped, not penalized for not having run a grader yet.
  const qw = quality == null ? 0 : 0.2;
  const mw = 0.25 + (quality == null ? 0.2 : 0);
  const overall = Math.round(100 * (
    0.30 * existentialHealth + mw * momentum + qw * (quality ?? 0) + 0.15 * attentionFlow + 0.10 * loopHygiene
  ));

  const components = [
    { key: "existential", label: "Do-or-die coverage", value: Math.round(existentialHealth * 100),
      hint: exNow.length - exDone > 0 ? `${exNow.length - exDone} existential play(s) not done` : "all actionable do-or-die work done" },
    { key: "momentum", label: "Momentum", value: Math.round(momentum * 100),
      hint: `${completeCount}/${tasks.length} plays complete` },
    { key: "quality", label: "Quality of done work", value: quality == null ? null : Math.round(quality * 100),
      hint: quality == null ? "no completed work graded yet" : `${scored.length} graded, avg ${Math.round(quality * 100)}` },
    { key: "attention", label: "Open gates", value: Math.round(attentionFlow * 100),
      hint: openExistential ? `${openExistential} existential gate(s) waiting on you` : "no existential work waiting" },
    { key: "loops", label: "Loop hygiene", value: Math.round(loopHygiene * 100),
      hint: overdueLoops.length ? `${overdueLoops.length} loop(s) due` : "loops up to date" },
  ];

  const gates = tasks
    .filter((t) => t.state === "approval" || t.state === "input")
    .sort((a, b) => (CRIT_RANK[a.criticality] ?? 4) - (CRIT_RANK[b.criticality] ?? 4))
    .map((t) => ({ id: t.id, title: t.title, kind: t.state, owner: t.owner, criticality: t.criticality,
      why: t.state === "approval" ? "Needs your approval" : "Ready to start" }));
  const loopItems = overdueLoops.map((l) => ({ id: l.id, title: l.title, kind: "loop", owner: "Operations", criticality: null,
    why: l.never_run ? "Recurring loop, never run" : `Recurring loop, ${l.overdue_days}d overdue` }));
  const attention = [
    ...gates.filter((g) => g.criticality === "existential"),
    ...loopItems,
    ...gates.filter((g) => g.criticality !== "existential"),
  ];

  // Improve: completed work that is ungraded (existential/core) or graded below the bar -- the
  // "is there a way to make done things better" path the founder asked for.
  const improve = tasks
    .filter((t) => t.state === "completed")
    .filter((t) => (t.score && t.score.value < 70) || (!t.score && (t.criticality === "existential" || t.criticality === "core")))
    .map((t) => ({ id: t.id, title: t.title, criticality: t.criticality,
      score: t.score ? t.score.value : null, gaps: t.score ? t.score.gaps : [],
      why: t.score ? "Scored below the bar" : "Not yet quality-checked" }))
    .sort((a, b) => (CRIT_RANK[a.criticality] ?? 4) - (CRIT_RANK[b.criticality] ?? 4));

  return { overall, components, departments, levels, attention, improve, existentialDone: exDone, existentialTotal: exNow.length };
}

// brain = { buildMap, profile, state, spend }
// enrich = { catalog:{id->{selection_hint,criticality,deliverable,rubric}}, scores:{id->{score,pass,gaps}},
//            working:Set<id>, notes:{id->{tldr,why}}, loops:[loopStatus], receipts:[{ts,descriptor,amount_usd,status}] }
// all optional; the console is read-only and this is a pure transform, so an absent enrich just yields
// the plain build map.
export function toFoundry(brain, enrich = {}) {
  const { buildMap = { levels: [] }, profile = {}, spend = 0 } = brain;
  const { catalog = {}, scores = {}, working = new Set(), notes = {}, loops = [], receipts = [] } = enrich;
  const levels = (buildMap.levels || []).slice().sort((a, b) => levelKey(a.level) - levelKey(b.level));

  const tasks = [];
  const stages = levels.map((lvl) => {
    let done = 0;
    const stageTasks = (lvl.nodes || []).map((n) => {
      const st = stateOf(n, working);
      if (st === "completed") done++;
      const cat = catalog[n.id] || {};
      const note = notes[n.id] || {};
      const sc = scores[n.id];
      const task = {
        id: n.id,
        title: n.title,
        state: st,
        owner: n.department || departmentOf(n.id, n.title),
        stageId: String(lvl.level),
        dependsOn: n.depends_on || [],
        description: n.title,
        onCriticalPath: !!n.on_critical_path,
        leverage: n.leverage || "med",
        recurring: !!n.recurring,
        criticality: n.criticality || cat.criticality || null,
        // TLDR + advisor notes (the reasoning layer surfaced per node). tldr falls back to the
        // playbook's selection_hint; richer per-node notes come from console/notes.jsonl when present.
        tldr: note.tldr || cat.selection_hint || null,
        why: note.why || null,
        deliverable: cat.deliverable || null,
        rubric: cat.rubric || null,
        score: sc ? { value: sc.score, pass: sc.pass, gaps: sc.gaps || [] } : null,
        inProgress: st === "agent",
      };
      if (st === "approval") task.ask = "Needs your approval to proceed.";
      else if (st === "input") task.ask = "Ready to start.";
      tasks.push(task);
      return task;
    });
    return { id: String(lvl.level), label: lvl.name, done, total: stageTasks.length, tasks: stageTasks };
  });

  const tasksComplete = tasks.filter((t) => t.state === "completed").length;
  const needsAttention = tasks.filter((t) => t.state === "approval" || t.state === "input").length;

  const health = computeHealth(tasks, stages, loops);
  // Loops sorted for the view: due first, then soonest-next, eligible above locked.
  const loopsView = (loops || []).slice().sort((a, b) =>
    (b.due - a.due) || (b.eligible - a.eligible) ||
    ((a.next_due_in_days ?? 1e9) - (b.next_due_in_days ?? 1e9)));
  const spendPanel = {
    total: spend, currency: "USD", label: "Capx Pay",
    receipts: (receipts || []).slice().sort((a, b) => String(b.ts || "").localeCompare(String(a.ts || ""))),
  };

  const ns = buildMap.active_north_star || null;
  const company = {
    name: profile.company_name || "(unnamed)",
    oneLiner: profile.one_liner || "",
    founder: profile.founder || "",
    founderProfile: [profile.primary_type, ...(profile.traits || []).slice(0, 3)].filter(Boolean).join(" · "),
    northStar: ns ? ns.label : null,
    headingToward: ns && ns.band !== "scale" ? ns.mature_growth_label : null,
    tasksComplete,
    tasksTotal: tasks.length,
    needsAttention,
    currentLevel: buildMap.current_level ?? 0,
    health,
    loops: loopsView,
    spend: spendPanel,
    metrics: {
      level: buildMap.current_level ?? 0,
      done: tasksComplete,
      spend,
      health: health.overall,
      loopsDue: loopsView.filter((l) => l.due).length,
    },
  };

  return { company, stages, tasks };
}
