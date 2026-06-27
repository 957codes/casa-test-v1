// Task detail panel — slides in from the right on node click.
// Handles all states, with rich treatments for:
//  - agent + inProgress (live activity stream, preview link, Plan/Execute)
//  - approval (drafted output + Approve / Request changes / Mark complete,
//    plus the approval-border animation)

import { useEffect, useRef, useState } from "react";
import type { Task } from "../mockData";
import { taskById, departments } from "../mockData";
import { StateBadge, stateMeta } from "./StateBadge";
import { ActivityStream } from "./ActivityStream";
import {
  CloseIcon,
  ExternalIcon,
  PlayIcon,
  CheckCircleIcon,
  PencilIcon,
  ArrowRightIcon,
  LockIcon,
} from "./icons";

interface Props {
  task: Task | null;
  onClose: () => void;
}

type Mode = "plan" | "execute";

export function TaskPanel({ task, onClose }: Props) {
  const [mode, setMode] = useState<Mode>("execute");
  const [approved, setApproved] = useState(false);
  const [requestedChanges, setRequestedChanges] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Reset transient UI when the task changes.
  useEffect(() => {
    setApproved(false);
    setRequestedChanges(false);
    setMode(task?.state === "agent" ? "execute" : "plan");
  }, [task?.id, task?.state]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (task) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [task, onClose]);

  if (!task) return null;

  const meta = stateMeta[task.state];
  const dept = departments.find((d) => d.name === task.owner);
  const agentName = dept?.agents[0]?.name;
  const isAgent = task.state === "agent";
  const isApproval = task.state === "approval";
  const isInput = task.state === "input";
  const isLocked = task.state === "locked";
  const blockers = (task.dependsOn ?? [])
    .map((id) => taskById[id])
    .filter((t) => t && t.state !== "completed");

  return (
    <div className="fixed inset-0 z-40">
      {/* Scrim */}
      <div
        ref={overlayRef}
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/10 animate-fade-in"
      />

      {/* Panel */}
      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-[440px] animate-slide-in flex-col bg-surface shadow-panel"
        role="dialog"
        aria-label={`${task.title} detail`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-mono text-2xs uppercase tracking-wider text-ink-400">
              <span>{task.owner}</span>
              {agentName && !isInput && (
                <>
                  <span className="text-ink-300">/</span>
                  <span className="text-ink-500">{agentName}</span>
                </>
              )}
            </div>
            <h2 className="mt-1.5 text-lg font-semibold leading-tight text-ink-900">
              {task.title}
            </h2>
            <div className="mt-2.5">
              <StateBadge state={task.state} size="md" />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-ink-400 transition-colors hover:bg-canvas hover:text-ink-700"
            aria-label="Close"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>

        {/* Body */}
        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-5">
          {/* Description */}
          {task.description && (
            <p className="text-sm leading-relaxed text-ink-700">{task.description}</p>
          )}

          {/* Plan / Execute mode toggle (agent-capable tasks) */}
          {(isAgent || isApproval) && (
            <div className="mt-5">
              <div className="mb-2 font-mono text-2xs uppercase tracking-wider text-ink-400">
                Mode
              </div>
              <div className="inline-flex rounded-lg border border-line bg-canvas p-0.5">
                {(["plan", "execute"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      mode === m
                        ? "bg-surface text-ink-900 shadow-card"
                        : "text-ink-500 hover:text-ink-700"
                    }`}
                  >
                    {m} mode
                  </button>
                ))}
              </div>
              <p className="mt-2 text-2xs leading-relaxed text-ink-400">
                {mode === "plan"
                  ? "The agent proposes a plan and waits for your sign-off before acting."
                  : "The agent executes and checks in at approval gates."}
              </p>
            </div>
          )}

          {/* Locked: show blockers honestly */}
          {isLocked && blockers.length > 0 && (
            <div className="mt-5 rounded-lg border border-line bg-canvas px-4 py-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-ink-500">
                <LockIcon width={14} height={14} className="text-ink-400" />
                Waiting on earlier steps
              </div>
              <ul className="mt-2.5 space-y-1.5">
                {blockers.map((b) => (
                  <li key={b.id} className="flex items-center gap-2 text-xs text-ink-500">
                    <span className="h-1 w-1 rounded-full bg-ink-300" />
                    {b.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Live agent activity (in-progress agent tasks) */}
          {isAgent && task.activity && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-mono text-2xs uppercase tracking-wider text-ink-400">
                  Agent activity
                </div>
                {task.inProgress && (
                  <span className="inline-flex items-center gap-1.5 font-mono text-2xs text-agent-600">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-agent-500 opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-agent-500" />
                    </span>
                    Working now
                  </span>
                )}
              </div>
              <div className="rounded-lg border border-line bg-canvas px-4 py-4">
                <ActivityStream lines={task.activity} live={!!task.inProgress} />
              </div>
            </div>
          )}

          {/* Preview link */}
          {task.previewUrl && (
            <a
              href={`https://${task.previewUrl}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 transition-colors hover:border-line-strong hover:bg-canvas"
            >
              <span className="min-w-0">
                <span className="block text-2xs uppercase tracking-wider text-ink-400">
                  Live preview
                </span>
                <span className="block truncate font-mono text-xs text-ink-700">
                  {task.previewUrl}
                </span>
              </span>
              <ExternalIcon width={16} height={16} className="shrink-0 text-ink-400" />
            </a>
          )}

          {/* Approval: drafted output + actions + approval-border animation */}
          {isApproval && task.draft && (
            <div className="mt-6">
              {/* Pre-output agent activity for context */}
              {task.activity && (
                <div className="mb-5">
                  <div className="mb-3 font-mono text-2xs uppercase tracking-wider text-ink-400">
                    How the agent got here
                  </div>
                  <div className="rounded-lg border border-line bg-canvas px-4 py-4">
                    <ActivityStream lines={task.activity} live={false} />
                  </div>
                </div>
              )}

              <div className="mb-2 flex items-center justify-between">
                <div className="font-mono text-2xs uppercase tracking-wider text-ink-400">
                  Ready to review
                </div>
                <span className="font-mono text-2xs text-approve-500">Draft by {agentName}</span>
              </div>

              <div
                className={`rounded-xl border-2 bg-surface px-4 py-4 transition-colors ${
                  approved
                    ? "border-approve-500 animate-approve-pulse"
                    : requestedChanges
                    ? "border-human-500"
                    : "border-approve-100 animate-border-trace"
                }`}
              >
                <p className="text-sm leading-relaxed text-ink-900">{task.draft}</p>
              </div>

              {/* Actions */}
              {!approved && !requestedChanges && (
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setApproved(true)}
                    className="flex items-center justify-center gap-2 rounded-lg bg-approve-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-approve-600"
                  >
                    <CheckCircleIcon width={16} height={16} />
                    Approve
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRequestedChanges(true)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:border-line-strong hover:bg-canvas"
                    >
                      <PencilIcon width={15} height={15} className="text-ink-500" />
                      Request changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setApproved(true)}
                      className="flex flex-1 items-center justify-center rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:border-line-strong hover:bg-canvas"
                    >
                      Mark complete
                    </button>
                  </div>
                </div>
              )}

              {approved && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-approve-100 bg-approve-50 px-4 py-3 text-sm text-approve-600 animate-fade-in">
                  <CheckCircleIcon width={16} height={16} />
                  Approved. The agent will use this across the website, social, and outreach.
                </div>
              )}

              {requestedChanges && (
                <div className="mt-4 animate-fade-in">
                  <textarea
                    autoFocus
                    placeholder="Tell the agent what to change. It will revise and send it back for review."
                    className="h-24 w-full resize-none rounded-lg border border-line bg-canvas px-3.5 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-human-500 focus:outline-none focus:ring-2 focus:ring-human-100"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRequestedChanges(false)}
                      className="rounded-lg px-3 py-2 text-xs font-medium text-ink-500 hover:text-ink-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setRequestedChanges(false)}
                      className="rounded-lg bg-human-500 px-4 py-2 text-xs font-medium text-white hover:bg-human-600"
                    >
                      Send to agent
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input: the human ask + a simple input affordance */}
          {isInput && (
            <div className="mt-6">
              <div className="rounded-lg border border-human-100 bg-human-50 px-4 py-3.5">
                <div className="font-mono text-2xs uppercase tracking-wider text-human-600">
                  Needs your input
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-human-700">{task.ask}</p>
              </div>
              <button
                type="button"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-human-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-human-600"
              >
                Provide your input
                <ArrowRightIcon width={16} height={16} />
              </button>
              <p className="mt-2.5 text-center text-2xs text-ink-400">
                The agent has everything else ready. It continues the moment you respond.
              </p>
            </div>
          )}

          {/* Agent (not yet started) launch affordance — shown when in-progress meter absent */}
          {isAgent && !task.inProgress && (
            <button
              type="button"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-agent-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-agent-600"
            >
              <PlayIcon width={15} height={15} />
              Launch agent
            </button>
          )}

          {/* Completed footer */}
          {task.state === "completed" && (
            <div className="mt-6 flex items-center gap-2 rounded-lg border border-line bg-canvas px-4 py-3 text-sm text-ink-500">
              <CheckCircleIcon width={16} height={16} className="text-approve-500" />
              Completed. No action needed from you.
            </div>
          )}
        </div>

        {/* Footer hint for live agent tasks */}
        {isAgent && task.inProgress && (
          <div className="border-t border-line px-6 py-3.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xs text-ink-400">
                {meta.label}. You will be asked to approve before it ships.
              </span>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
