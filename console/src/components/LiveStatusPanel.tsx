// Working banner for a node that is running or queued. The bridge does not expose
// run telemetry (tokens, cost, turns), so this shows what is available: a live
// "Working now" indicator and the queued intent's kind + status. The per-node
// activity timeline (NodeActivity) renders directly below it in the panel.

import type { Task } from "../mockData";
import { activeIntentForNode } from "../mockData";

const KIND_LABEL: Record<string, string> = {
  build: "Running this node",
  chat: "Refining from your chat",
  review: "Scoring the deliverable",
  next: "Picking the next move",
  "resolve-gate": "Resolving your decision",
};

export function LiveStatusPanel({ task }: { task: Task }) {
  const intent = activeIntentForNode(task.id);
  const label = intent ? KIND_LABEL[intent.kind] ?? "Working" : "Working";
  const status = intent?.status === "running" ? "running" : "queued";

  return (
    <div className="mt-5 rounded-lg border border-agent-100 bg-agent-50 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-agent-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-agent-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-agent-500" />
          </span>
          {label}
        </span>
        <span className="font-mono text-2xs uppercase tracking-wider text-agent-600">{status}</span>
      </div>
      {status === "queued" && (
        <p className="mt-1.5 text-2xs leading-relaxed text-agent-700">
          Run /casa-serve in your Claude Code terminal to execute it. Progress shows here as it runs.
        </p>
      )}
    </div>
  );
}
