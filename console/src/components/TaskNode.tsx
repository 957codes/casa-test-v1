// A single task node card on the build-map.
// icon + title + owner + state badge. Locked nodes recede; the next
// actionable node (input/approval) gets a subtle focal treatment.

import type { Task } from "../mockData";
import { stateIcon, deptInitial, SpinnerIcon } from "./icons";
import { StateBadge, stateMeta } from "./StateBadge";

interface Props {
  task: Task;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
  onClick: (task: Task) => void;
  isFocus?: boolean; // draw-the-eye treatment for the prime next action
  selected?: boolean;
}

export function TaskNode({ task, registerRef, onClick, isFocus, selected }: Props) {
  const Icon = stateIcon[task.state];
  const meta = stateMeta[task.state];
  const locked = task.state === "locked";
  // Seeded-as-done from the stage tier, not verified by Casa. Render it as presumed, not confidently done.
  const assumed = task.state === "completed" && !!task.assumed;

  // Border + ambient treatment per state, kept restrained.
  let frame = "border-line bg-surface shadow-card hover:shadow-card-hover";
  if (locked) frame = "border-line/70 bg-surface/60 shadow-none";
  if (assumed) frame = "border-dashed border-line bg-surface/70 shadow-none hover:shadow-card";
  if (task.state === "approval")
    frame = "border-approve-100 bg-surface shadow-card hover:shadow-card-hover";
  if (selected) frame = "border-agent-500 bg-surface shadow-card-hover ring-1 ring-agent-100";

  return (
    <div
      ref={(el) => registerRef(task.id, el)}
      className="relative"
    >
      {/* Focal ring for the prime next-action node */}
      {isFocus && !selected && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-1 rounded-2xl ring-2 ring-human-100"
        />
      )}
      <button
        type="button"
        onClick={() => onClick(task)}
        className={`group relative z-10 w-[244px] rounded-xl border ${frame} px-3.5 py-3 text-left transition-all duration-200 ${
          locked ? "cursor-default" : "cursor-pointer hover:-translate-y-px"
        }`}
        disabled={locked}
        aria-label={`${task.title}, ${meta.label}`}
      >
        <div className="flex items-start gap-2.5">
          <span
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
              locked
                ? "border-line bg-canvas text-ink-300"
                : assumed
                ? "border-line bg-canvas text-ink-400"
                : task.state === "agent"
                ? "border-agent-100 bg-agent-50 text-agent-600"
                : task.state === "completed"
                ? "border-line bg-done-50 text-approve-500"
                : task.state === "input"
                ? "border-human-100 bg-human-50 text-human-600"
                : "border-approve-100 bg-approve-50 text-approve-500"
            }`}
          >
            <Icon width={15} height={15} />
          </span>
          <div className="min-w-0 flex-1">
            <div
              className={`truncate text-sm font-medium leading-snug ${
                locked || assumed ? "text-ink-500" : "text-ink-900"
              }`}
            >
              {task.title}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span
                className={`inline-flex h-3.5 min-w-3.5 items-center justify-center rounded px-1 font-mono text-[9px] font-semibold leading-none ${
                  locked ? "bg-canvas text-ink-300" : "bg-canvas text-ink-500"
                }`}
              >
                {deptInitial[task.owner]}
              </span>
              <span
                className={`truncate text-2xs ${locked ? "text-ink-300" : "text-ink-500"}`}
              >
                {task.owner}
              </span>
            </div>
          </div>
        </div>

        {/* In-progress meter for active agent tasks (when a percentage is known) */}
        {task.inProgress && typeof task.progress === "number" && (
          <div className="mt-2.5">
            <div className="flex items-center justify-between font-mono text-[9px] text-agent-600">
              <span className="tracking-wide uppercase">In progress</span>
              <span className="tabular">{task.progress}%</span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-agent-50">
              <div
                className="h-full rounded-full bg-agent-500"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Indeterminate working indicator (the bridge reports no percentage) */}
        {task.inProgress && typeof task.progress !== "number" && (
          <div className="mt-2.5">
            <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wide text-agent-600">
              <SpinnerIcon width={10} height={10} className="text-agent-500" />
              Working
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-agent-50">
              <div className="h-full w-1/3 rounded-full bg-agent-500 animate-working-slide" />
            </div>
          </div>
        )}

        <div className="mt-2.5">
          {assumed ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-line bg-canvas px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wide text-ink-400">
              Assumed
            </span>
          ) : (
            <StateBadge state={task.state} />
          )}
        </div>
      </button>
    </div>
  );
}
