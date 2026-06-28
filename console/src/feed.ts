// Live feed from the bridge. Fetches the brain once, then re-fetches the brain and
// the intent queue whenever the bridge reports a change (Server-Sent Events). Also
// posts founder intents (POST /api/intent) and reads the per-node mailbox endpoints.
// The Console never mutates brain state directly: deterministic intents shell the
// engine through the bridge, work intents are queued for /casa-serve to drain.

import {
  setBrain,
  setQueue,
  type BrainPayload,
  type QueueIntent,
  type NodeMessage,
  type NodeOutputData,
  type ActivityEvent,
} from "./mockData";

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    // The bridge is not running yet; the UI renders empty until it is.
    return fallback;
  }
}

export async function loadBrain(): Promise<void> {
  const data = await getJson<BrainPayload | null>("/api/brain", null);
  if (data) setBrain(data);
}

export async function loadQueue(): Promise<void> {
  setQueue(await getJson<QueueIntent[]>("/api/queue", []));
}

async function refresh(onChange: () => void): Promise<void> {
  await Promise.all([loadBrain(), loadQueue()]);
  onChange();
}

export function subscribeBrain(onChange: () => void): () => void {
  let es: EventSource | null = null;
  // The brain is loaded before first paint (main.tsx); pull the queue now too.
  void loadQueue().then(onChange);
  try {
    es = new EventSource("/api/events");
    // A "data: changed" line fires on any brain OR queue change: re-fetch both.
    es.onmessage = () => { void refresh(onChange); };
  } catch {
    // SSE unavailable; a manual reload still picks up changes.
  }
  return () => es?.close();
}

export interface IntentResult {
  id: string;
  kind: string;
  status: "pending" | "running" | "done" | "error";
  result?: string;
}

// Post a founder intent. Deterministic kinds (complete, loop-ran, priority-ran,
// experiment) mutate the brain inline and return status "done"; work kinds (build,
// chat, review, next, resolve-gate) return "pending" and land in the queue. We
// re-pull the brain + queue afterward so the UI reflects either outcome at once.
export async function postIntent(
  kind: string,
  nodeId: string | null,
  payload: Record<string, unknown> = {},
): Promise<IntentResult> {
  let rec: IntentResult;
  try {
    const res = await fetch("/api/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, nodeId, payload }),
    });
    rec = (await res.json()) as IntentResult;
  } catch (e) {
    rec = { id: "", kind, status: "error", result: String(e) };
  }
  await Promise.all([loadBrain(), loadQueue()]);
  return rec;
}

export const getQueue = () => getJson<QueueIntent[]>("/api/queue", []);
export const getMessages = (node: string) =>
  getJson<NodeMessage[]>(`/api/messages?node=${encodeURIComponent(node)}`, []);
export const getOutput = (node: string) =>
  getJson<NodeOutputData>(`/api/output?node=${encodeURIComponent(node)}`, { node, files: [] });
export const getActivity = (node: string) =>
  getJson<ActivityEvent[]>(`/api/activity?node=${encodeURIComponent(node)}`, []);
