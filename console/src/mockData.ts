// Casa Console data layer. Holds the live company-brain in the shape the Foundry
// components expect, populated by feed.ts from the bridge (GET /api/brain). The data
// exports are reassigned on each refresh; components re-read them on re-render.
// Read-only: nothing here ever writes back to the brain.

export type TaskState = "completed" | "agent" | "input" | "approval" | "locked";

export type Department =
  | "You" | "Brand" | "Engineering" | "Legal" | "Design"
  | "Operations" | "Marketing" | "Finance" | "Sales" | "Support";

// The reasoning layer the bridge surfaces per node.
export type Criticality = "existential" | "core" | "growth" | "optional";

export interface DeliverableSpec {
  artifact: string;
  sections: string[];
  max_words?: number;
}

export interface TaskScore {
  value: number;
  pass: boolean;
  gaps: string[];
}

export interface ActivityLine { time: string; text: string; }

export interface Task {
  id: string;
  title: string;
  state: TaskState;
  owner: Department;
  stageId: string;
  inProgress?: boolean;
  progress?: number;
  description?: string;
  ask?: string;
  dependsOn?: string[];
  activity?: ActivityLine[];
  previewUrl?: string;
  draft?: string;
  onCriticalPath?: boolean;
  leverage?: string;
  recurring?: boolean;
  // Reasoning layer (from the bridge: criticality, tldr, why, deliverable spec, quality score).
  criticality?: Criticality | null;
  tldr?: string | null;
  why?: string | null;
  deliverable?: DeliverableSpec | null;
  score?: TaskScore | null;
  // Completion honesty: a completed node is `verified` only if Casa produced an artifact or graded it;
  // `assumed` means it was seeded as done from the founder's stage tier (Casa did not do it).
  verified?: boolean;
  assumed?: boolean;
}

export interface Stage { id: string; label: string; done: number; total: number; tasks: Task[]; }

// ---- Phase 4: health "game", recurring loops, and Capx Pay spend (all derived by the adapter) ----

export interface HealthComponent { key: string; label: string; value: number | null; hint: string }
export interface DeptHealth { name: string; total: number; done: number; blocked: number; ready: number; working: number; pct: number }
export interface LevelHealth { id: string; label: string; done: number; total: number; pct: number }
export interface AttentionEntry { id: string; title: string; kind: "approval" | "input" | "loop"; owner: string; criticality: Criticality | null; why: string }
export interface ImproveEntry { id: string; title: string; criticality: Criticality | null; score: number | null; gaps: string[]; why: string }
export interface CompanyHealth {
  overall: number;
  components: HealthComponent[];
  departments: DeptHealth[];
  levels: LevelHealth[];
  attention: AttentionEntry[];
  improve: ImproveEntry[];
  existentialDone: number;
  existentialTotal: number;
}
export interface LoopStatus {
  id: string; title: string; why: string; runs: string | null;
  cadence_days: number; min_level: number; brain_key: string | null;
  eligible: boolean; last_ran: string | null; days_since: number | null;
  due: boolean; never_run: boolean; overdue_days: number; next_due_in_days: number | null;
}
export interface Receipt { ts: string | null; descriptor: string; amount_usd: number; status: string; ref: string | null }
export interface SpendPanel { total: number; currency: string; label: string; receipts: Receipt[] }

// The homepage: the engine's ranked next-actions (identical to /casa-next), each with a grounded
// reason, plus the founder's focus (win, binding constraint, north star) so the work is framed by
// what THIS company is actually trying to do.
export interface NextAction {
  id: string;
  title: string;
  owner: Department;
  criticality: Criticality | null;
  criticalityLabel: string;
  tier: number;
  state: "approval" | "input";
  humanGate: boolean;
  blocksRevenue: boolean;
  unblocks: string[]; // titles of the real downstream work this gates
}
export interface Focus {
  win: string | null;
  constraint: string | null;
  northStar: string | null;
  northStarMature: string | null;
}

// The connected "game": a band ladder toward the founder's win with the current rung lit, the
// metric to move now, and honest momentum (real plays shipped). Every cue is tied to the real
// company, never generic XP.
// A closed-loop win: a graded completion. The "you shipped this" payoff that makes the loop
// rewarding -- completing a move visibly advances the game.
export interface Win { id: string; title: string; score: number; pass: boolean; ts: string | null }

export interface JourneyRung { key: string; label: string; blurb: string; reached: boolean; current: boolean }
export interface Journey {
  band: string;
  bandLabel: string;
  metric: string | null;
  win: string | null;
  ladder: JourneyRung[];
  nextBand: string | null;
  shipped: number;
  assumed: number;
  total: number;
  momentumPct: number;
}

export interface Company {
  name: string;
  oneLiner: string;
  founder: string;
  founderProfile: string;
  northStar?: string | null;
  headingToward?: string | null;
  tasksComplete: number;
  tasksTotal: number;
  needsAttention: number;
  currentLevel?: number;
  nextActions?: NextAction[];
  focus?: Focus;
  journey?: Journey;
  wins?: Win[];
  health?: CompanyHealth;
  loops?: LoopStatus[];
  spend?: SpendPanel;
  metrics: { level: number; done: number; spend: number; loopsDue: number; health?: number };
}

// ---- Interactive layer: the request queue + per-node fetched data (read by the
// panel components). These mirror the bridge endpoints; nothing here writes the brain. ----

export interface QueueIntent {
  id: string;
  ts: string;
  kind: string;
  nodeId: string | null;
  payload?: Record<string, unknown>;
  status: "pending" | "running" | "done" | "error";
  result?: string;
}

export interface NodeMessage {
  id: string;
  nodeId: string;
  role: "user" | "assistant";
  content: string;
  ts: string;
}

export interface OutputFile { path: string; bytes: number; content: string }
export interface NodeOutputData { node: string; files: OutputFile[] }
export interface ActivityEvent { nodeId: string; ts: string; text: string }

export interface Agent { name: string; role: string; }
export interface DepartmentInfo { name: Department; agents: Agent[]; status: string; }
export interface AttentionItem {
  taskId: string; title: string; owner: Department;
  state: Extract<TaskState, "input" | "approval">; ask: string; cta: string;
}
export interface FeedItem { agent: string; owner: Department; text: string; time: string; }

const emptyCompany: Company = {
  name: "", oneLiner: "", founder: "", founderProfile: "",
  tasksComplete: 0, tasksTotal: 0, needsAttention: 0, currentLevel: 0,
  metrics: { level: 0, done: 0, spend: 0, loopsDue: 0 },
};

export let company: Company = emptyCompany;
export let stages: Stage[] = [];
export let tasks: Task[] = [];
export let taskById: Record<string, Task> = {};
export let stageById: Record<string, Stage> = {};
export let departments: DepartmentInfo[] = [];
export let attentionQueue: AttentionItem[] = [];
export let activityFeed: FeedItem[] = [];
export const manager = { name: "Casa", role: "Coordinator" };

// The interactive request queue (GET /api/queue). Populated by feed.ts on each SSE
// event. WORK intents (build/chat/review/next/resolve-gate) sit here pending until
// the founder drains them with /casa-serve; deterministic intents land already done.
export let queue: QueueIntent[] = [];
export function setQueue(q: QueueIntent[]) { queue = Array.isArray(q) ? q : []; }
const isActive = (r: QueueIntent) => r.status === "pending" || r.status === "running";
export function pendingCount(): number { return queue.filter(isActive).length; }
export function activeIntentForNode(nodeId: string): QueueIntent | undefined {
  return queue.find((r) => r.nodeId === nodeId && isActive(r));
}

export interface BrainPayload { company: Company; stages: Stage[]; tasks: Task[]; }

// Populate every export from a fresh brain snapshot, deriving the per-department
// rollups, the attention queue, and a light recent-activity feed.
export function setBrain(payload: BrainPayload) {
  company = payload.company || emptyCompany;
  stages = payload.stages || [];
  tasks = payload.tasks || [];

  taskById = {};
  for (const t of tasks) taskById[t.id] = t;
  stageById = {};
  for (const s of stages) stageById[s.id] = s;

  const byDept = new Map<Department, { done: number; total: number }>();
  for (const t of tasks) {
    const d = byDept.get(t.owner) ?? { done: 0, total: 0 };
    d.total++;
    if (t.state === "completed") d.done++;
    byDept.set(t.owner, d);
  }
  departments = [...byDept.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, c]) => ({ name, agents: [], status: `${c.done} of ${c.total} done` }));

  attentionQueue = tasks
    .filter((t) => t.state === "approval" || t.state === "input")
    .slice(0, 8)
    .map((t) => ({
      taskId: t.id, title: t.title, owner: t.owner,
      state: t.state as "input" | "approval",
      ask: t.ask ?? "", cta: t.state === "approval" ? "Review" : "Open",
    }));

  activityFeed = tasks
    .filter((t) => t.state === "completed")
    .slice(-7).reverse()
    .map((t) => ({ agent: t.owner, owner: t.owner, text: `Completed ${t.title}`, time: "" }));
}
