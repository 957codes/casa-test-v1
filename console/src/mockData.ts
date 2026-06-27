// Casa Console data layer. Holds the live company-brain in the shape the Foundry
// components expect, populated by feed.ts from the bridge (GET /api/brain). The data
// exports are reassigned on each refresh; components re-read them on re-render.
// Read-only: nothing here ever writes back to the brain.

export type TaskState = "completed" | "agent" | "input" | "approval" | "locked";

export type Department =
  | "You" | "Brand" | "Engineering" | "Legal" | "Design"
  | "Operations" | "Marketing" | "Finance" | "Sales" | "Support";

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
}

export interface Stage { id: string; label: string; done: number; total: number; tasks: Task[]; }

export interface Company {
  name: string;
  oneLiner: string;
  founder: string;
  founderProfile: string;
  tasksComplete: number;
  tasksTotal: number;
  needsAttention: number;
  currentLevel?: number;
  metrics: { level: number; done: number; spend: number; loopsDue: number };
}

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
