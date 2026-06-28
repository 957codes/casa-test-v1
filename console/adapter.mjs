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

// build-map status (+ human_gate) -> Foundry task state.
function stateOf(node) {
  if (node.status === "done") return "completed";
  if (node.status === "blocked") return "locked";
  return node.human_gate ? "approval" : "input"; // ready
}

// brain = { buildMap, profile, state, spend, loopsDue }
export function toFoundry(brain) {
  const { buildMap = { levels: [] }, profile = {}, spend = 0, loopsDue = [] } = brain;
  const levels = (buildMap.levels || []).slice().sort((a, b) => levelKey(a.level) - levelKey(b.level));

  const tasks = [];
  const stages = levels.map((lvl) => {
    let done = 0;
    const stageTasks = (lvl.nodes || []).map((n) => {
      const st = stateOf(n);
      if (st === "completed") done++;
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

  const company = {
    name: profile.company_name || "(unnamed)",
    oneLiner: profile.one_liner || "",
    founder: profile.founder || "",
    founderProfile: [profile.primary_type, ...(profile.traits || []).slice(0, 3)].filter(Boolean).join(" · "),
    tasksComplete,
    tasksTotal: tasks.length,
    needsAttention,
    currentLevel: buildMap.current_level ?? 0,
    metrics: {
      level: buildMap.current_level ?? 0,
      done: tasksComplete,
      spend,
      loopsDue: loopsDue.length,
    },
  };

  return { company, stages, tasks };
}
