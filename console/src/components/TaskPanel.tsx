// Node detail panel: slides in from the right on node click. Surfaces the reasoning
// layer (criticality, tldr, why, deliverable spec, quality score), the rendered
// deliverable, the per-node activity, and a refine-with-chat box. Every action wires
// to a real intent: ready nodes run or complete, gates approve or request changes,
// completed nodes re-score or open chat. Work intents queue for /casa-serve (an
// inline notice says so); deterministic intents (complete) land immediately via SSE.

import { useEffect, useRef, useState } from "react";
import type { Task } from "../mockData";
import { taskById, departments, activeIntentForNode } from "../mockData";
import { postIntent } from "../feed";
import { StateBadge } from "./StateBadge";
import { CriticalityBadge } from "./CriticalityBadge";
import { NodeOutput } from "./NodeOutput";
import { NodeChat } from "./NodeChat";
import { NodeActivity } from "./NodeActivity";
import { LiveStatusPanel } from "./LiveStatusPanel";
import {
  CloseIcon,
  PlayIcon,
  CheckCircleIcon,
  PencilIcon,
  LockIcon,
  SpinnerIcon,
  ReviewIcon,
  ArrowRightIcon,
} from "./icons";

interface Props {
  task: Task | null;
  onClose: () => void;
}

const QUEUED_NOTICE = "Queued. Run /casa-serve in your Claude Code terminal to execute.";

export function TaskPanel({ task, onClose }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [changeMode, setChangeMode] = useState(false);
  const [changeText, setChangeText] = useState("");
  // Force a re-read of module-level queue state right after an intent posts.
  const [, setBump] = useState(0);
  const chatRef = useRef<HTMLDivElement | null>(null);

  // Reset transient UI when the node changes.
  useEffect(() => {
    setBusy(null);
    setNotice(null);
    setChangeMode(false);
    setChangeText("");
  }, [task?.id]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (task) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [task, onClose]);

  if (!task) return null;

  const dept = departments.find((d) => d.name === task.owner);
  const agentName = dept?.agents[0]?.name;
  const isAgent = task.state === "agent";
  const isApproval = task.state === "approval";
  const isInput = task.state === "input";
  const isLocked = task.state === "locked";
  const isCompleted = task.state === "completed";
  // A completed node is only "verified" if Casa produced or graded it. "Assumed" means it was seeded
  // as done from the founder's stage tier, so the panel must not present the template as a real result.
  const isAssumed = isCompleted && !!task.assumed;
  const isVerified = isCompleted && !task.assumed;
  const intent = activeIntentForNode(task.id);
  const working = isAgent || !!intent;
  const blockers = (task.dependsOn ?? [])
    .map((id) => taskById[id])
    .filter((t) => t && t.state !== "completed");

  const tldrText = task.tldr || null;
  const whyText = task.why || task.tldr || null;
  const showWhy = !!whyText && whyText !== tldrText;

  async function run(kind: string, payload: Record<string, unknown>, isWork: boolean) {
    if (busy || !task) return;
    setBusy(kind);
    setNotice(null);
    const rec = await postIntent(kind, task.id, payload);
    setBump((b) => b + 1);
    setBusy(null);
    if (rec.status === "error") {
      setNotice(rec.result ? `Could not complete: ${rec.result}` : "Something went wrong.");
      return;
    }
    // Deterministic kinds (complete) update immediately via SSE; only work kinds queue.
    if (isWork) setNotice(QUEUED_NOTICE);
  }

  const score = task.score;

  return (
    <div className="fixed inset-0 z-40">
      <div onClick={onClose} className="absolute inset-0 bg-ink-900/10 animate-fade-in" />

      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-[460px] animate-slide-in flex-col bg-surface shadow-panel"
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
            <h2 className="mt-1.5 text-lg font-semibold leading-tight text-ink-900">{task.title}</h2>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {isAssumed ? (
                <span className="inline-flex items-center rounded-md border border-human-100 bg-human-50 px-2 py-0.5 font-mono text-2xs font-medium uppercase tracking-wide text-human-700">
                  Assumed, not verified
                </span>
              ) : (
                <StateBadge state={task.state} size="md" />
              )}
              {task.criticality && <CriticalityBadge value={task.criticality} />}
              {task.recurring && (
                <span className="inline-flex items-center rounded-md border border-line bg-canvas px-2 py-0.5 font-mono text-2xs text-ink-500">
                  Recurring
                </span>
              )}
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
          {/* Working banner */}
          {working && <LiveStatusPanel task={task} />}

          {/* Assumed-done banner: honesty about seeded work Casa did not actually do */}
          {isAssumed && (
            <div className="mt-5 rounded-lg border border-human-100 bg-human-50 px-4 py-3.5">
              <div className="text-xs font-semibold text-human-700">Assumed done, not verified</div>
              <p className="mt-1 text-2xs leading-relaxed text-human-700/90">
                You told Casa your company is past this stage, so it assumed this is already handled.
                Casa did not do this work and has no record of it. The checklist below is the standard a
                strong version meets, not something Casa produced. Run it in Casa to create and grade a
                real version, or use it to check what you already have.
              </p>
            </div>
          )}

          {/* TLDR */}
          {tldrText && (
            <div className="mt-5">
              <div className="mb-1.5 font-mono text-2xs uppercase tracking-wider text-ink-400">TLDR</div>
              <p className="text-sm leading-relaxed text-ink-700">{tldrText}</p>
            </div>
          )}

          {/* Why this matters */}
          {showWhy && (
            <div className="mt-4">
              <div className="mb-1.5 font-mono text-2xs uppercase tracking-wider text-ink-400">
                Why this matters
              </div>
              <p className="text-sm leading-relaxed text-ink-700">{whyText}</p>
            </div>
          )}

          {/* Deliverable spec */}
          {task.deliverable && task.deliverable.sections.length > 0 && (
            <div className="mt-5 rounded-lg border border-line bg-canvas px-4 py-3.5">
              <div className="flex items-center justify-between">
                <div className="font-mono text-2xs uppercase tracking-wider text-ink-400">
                  {isVerified ? "Deliverable" : "What a strong version contains"}
                </div>
                {task.deliverable.max_words && (
                  <span className="font-mono text-2xs text-ink-400">
                    up to {task.deliverable.max_words} words
                  </span>
                )}
              </div>
              {task.deliverable.artifact && (
                <p className="mt-1.5 text-xs text-ink-600">{task.deliverable.artifact}</p>
              )}
              <ul className="mt-2.5 space-y-1.5">
                {task.deliverable.sections.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-xs text-ink-700">
                    {isVerified ? (
                      <CheckCircleIcon width={14} height={14} className="mt-px shrink-0 text-approve-500" />
                    ) : (
                      <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-[4px] border border-line-strong bg-surface" />
                    )}
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
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

          {/* Actions */}
          {!isLocked && (
            <div className="mt-5">
              {/* Ready / input node */}
              {isInput && !working && (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => void run("build", {}, true)}
                    className="flex items-center justify-center gap-2 rounded-lg bg-agent-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-agent-600 disabled:opacity-50"
                  >
                    {busy === "build" ? <SpinnerIcon width={15} height={15} /> : <PlayIcon width={15} height={15} />}
                    Run this
                  </button>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => void run("complete", {}, false)}
                    className="flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:border-line-strong hover:bg-canvas disabled:opacity-50"
                  >
                    {busy === "complete" ? <SpinnerIcon width={15} height={15} className="text-ink-500" /> : <CheckCircleIcon width={15} height={15} className="text-approve-500" />}
                    Mark complete
                  </button>
                </div>
              )}

              {/* Approval gate */}
              {isApproval && !working && !changeMode && (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => void run("resolve-gate", { decision: "approve" }, true)}
                    className="flex items-center justify-center gap-2 rounded-lg bg-approve-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-approve-600 disabled:opacity-50"
                  >
                    {busy === "resolve-gate" ? <SpinnerIcon width={15} height={15} /> : <CheckCircleIcon width={16} height={16} />}
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => setChangeMode(true)}
                    className="flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:border-line-strong hover:bg-canvas disabled:opacity-50"
                  >
                    <PencilIcon width={15} height={15} className="text-ink-500" />
                    Request changes
                  </button>
                </div>
              )}

              {/* Request-changes composer */}
              {isApproval && changeMode && (
                <div className="animate-fade-in">
                  <textarea
                    autoFocus
                    value={changeText}
                    onChange={(e) => setChangeText(e.target.value)}
                    placeholder="Tell the agent what to change. It revises and sends it back for review."
                    className="h-24 w-full resize-none rounded-lg border border-line bg-canvas px-3.5 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-human-500 focus:outline-none focus:ring-2 focus:ring-human-100"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setChangeMode(false); setChangeText(""); }}
                      className="rounded-lg px-3 py-2 text-xs font-medium text-ink-500 hover:text-ink-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!changeText.trim() || !!busy}
                      onClick={async () => {
                        await run("resolve-gate", { decision: "changes", message: changeText.trim() }, true);
                        setChangeMode(false);
                        setChangeText("");
                      }}
                      className="rounded-lg bg-human-500 px-4 py-2 text-xs font-medium text-white hover:bg-human-600 disabled:opacity-50"
                    >
                      Send to agent
                    </button>
                  </div>
                </div>
              )}

              {/* Verified completed node: improve or re-score the real artifact */}
              {isVerified && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:border-line-strong hover:bg-canvas"
                  >
                    <PencilIcon width={15} height={15} className="text-ink-500" />
                    Improve
                  </button>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => void run("review", {}, true)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:border-line-strong hover:bg-canvas disabled:opacity-50"
                  >
                    {busy === "review" ? <SpinnerIcon width={15} height={15} className="text-ink-500" /> : <ReviewIcon width={15} height={15} className="text-ink-500" />}
                    Score / re-check
                  </button>
                </div>
              )}

              {/* Assumed completed node: produce a real, graded version in Casa */}
              {isAssumed && (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => void run("build", {}, true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-agent-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-agent-600 disabled:opacity-50"
                >
                  {busy === "build" ? <SpinnerIcon width={15} height={15} /> : <PlayIcon width={15} height={15} />}
                  Do this in Casa
                </button>
              )}

              {/* Queued / error notice */}
              {notice && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-human-100 bg-human-50 px-3.5 py-2.5 text-2xs leading-relaxed text-human-700 animate-fade-in">
                  <ArrowRightIcon width={13} height={13} className="mt-px shrink-0 text-human-600" />
                  <span>{notice}</span>
                </div>
              )}
            </div>
          )}

          {/* Quality score (completed) */}
          {isCompleted && score && (
            <div className="mt-6">
              <div className="mb-2 font-mono text-2xs uppercase tracking-wider text-ink-400">
                Quality score
              </div>
              <div
                className={`rounded-lg border px-4 py-3.5 ${
                  score.pass
                    ? "border-approve-100 bg-approve-50"
                    : "border-human-100 bg-human-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-2xl font-semibold tabular ${score.pass ? "text-approve-600" : "text-human-700"}`}>
                    {score.value}
                    <span className="text-sm font-normal text-ink-400"> / 100</span>
                  </span>
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-2xs font-medium uppercase tracking-wide ${
                      score.pass
                        ? "border-approve-100 bg-surface text-approve-600"
                        : "border-human-100 bg-surface text-human-700"
                    }`}
                  >
                    {score.pass ? "Pass" : "Needs work"}
                  </span>
                </div>
                {score.gaps && score.gaps.length > 0 && (
                  <ul className="mt-3 space-y-1.5 border-t border-line/60 pt-3">
                    {score.gaps.map((g, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-ink-700">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-400" />
                        {g}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Rendered deliverable (completed) */}
          {isCompleted && <NodeOutput task={task} />}

          {/* Per-node activity */}
          {!isLocked && <NodeActivity task={task} working={working} />}

          {/* Refine with chat */}
          {!isLocked && (
            <div ref={chatRef}>
              <NodeChat task={task} />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
