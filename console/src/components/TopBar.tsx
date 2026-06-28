// Persistent top bar: company name, overall progress, attention chip.

import { company, pendingCount } from "../mockData";
import { PersonIcon, ArrowRightIcon, SpinnerIcon } from "./icons";

interface Props {
  onOpenAttention: () => void;
}

export function TopBar({ onOpenAttention }: Props) {
  const pct = Math.round((company.tasksComplete / company.tasksTotal) * 100);
  const queued = pendingCount();
  return (
    <header className="flex items-center justify-between gap-6 border-b border-line bg-surface/90 px-6 py-3 backdrop-blur">
      {/* Company identity */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-sm font-semibold text-white">
          C
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink-900">{company.name}</span>
            <span className="rounded bg-canvas px-1.5 py-0.5 font-mono text-2xs text-ink-400">
              workspace
            </span>
          </div>
          <p className="truncate text-2xs text-ink-500">{company.oneLiner}</p>
        </div>
      </div>

      {/* Overall progress */}
      <div className="hidden flex-1 items-center gap-3 md:flex">
        <div className="ml-auto flex items-center gap-2.5">
          <span className="font-mono text-2xs text-ink-400">
            <span className="tabular text-ink-700">{company.tasksComplete}</span>
            <span className="text-ink-300"> / </span>
            <span className="tabular">{company.tasksTotal}</span> tasks
          </span>
          <div className="h-1.5 w-44 overflow-hidden rounded-full bg-canvas">
            <div
              className="h-full rounded-full bg-ink-900/80"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="font-mono text-2xs tabular text-ink-500">{pct}%</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {/* Queue indicator: how many work intents await /casa-serve */}
        {queued > 0 && (
          <span
            className="inline-flex items-center gap-1.5 rounded-lg border border-agent-100 bg-agent-50 px-3 py-1.5 font-mono text-2xs text-agent-700"
            title="Work intents queued for /casa-serve to execute"
          >
            <SpinnerIcon width={13} height={13} className="text-agent-500" />
            {queued} queued
            <span className="text-agent-600">to /casa-serve</span>
          </span>
        )}

        {/* Attention chip */}
        <button
          type="button"
          onClick={onOpenAttention}
          className="group flex items-center gap-2 rounded-lg border border-human-100 bg-human-50 px-3 py-1.5 transition-colors hover:bg-human-100"
        >
          <PersonIcon width={15} height={15} className="text-human-600" />
          <span className="text-xs font-medium text-human-700">
            {company.needsAttention} need your attention
          </span>
          <ArrowRightIcon
            width={14}
            height={14}
            className="text-human-600 transition-transform group-hover:translate-x-0.5"
          />
        </button>
      </div>
    </header>
  );
}
