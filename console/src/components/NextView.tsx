// The homepage: what to do next for THIS company, ranked by the engine (identical to /casa-next),
// framed by the founder's actual win, binding constraint, and north star. It leads with do-or-die
// work and never shows the wall of presumed-done basics. Clicking an action opens its node panel,
// where the work actually happens.

import { company, type NextAction } from "../mockData";
import { CriticalityBadge } from "./CriticalityBadge";
import { ArrowRightIcon } from "./icons";

function reasonLine(a: NextAction): string {
  const parts: string[] = [];
  if (a.unblocks.length) parts.push(`Unblocks ${a.unblocks.slice(0, 2).join(", ")}`);
  if (a.blocksRevenue) parts.push("revenue cannot flow until this is done");
  if (a.humanGate) parts.push("needs your approval");
  return parts.join(" / ");
}

function ActionCard({ action, index, onOpen }: { action: NextAction; index: number; onOpen: (id: string) => void }) {
  const reason = reasonLine(action);
  return (
    <button
      type="button"
      onClick={() => onOpen(action.id)}
      className="group flex w-full items-start gap-4 rounded-xl border border-line bg-surface px-5 py-4 text-left shadow-card transition-colors hover:border-line-strong hover:bg-canvas"
    >
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-canvas font-mono text-2xs font-semibold tabular text-ink-400 group-hover:bg-surface">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink-900">{action.title}</span>
          {action.criticality && <CriticalityBadge value={action.criticality} />}
          <span className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[9px] text-ink-400">{action.owner}</span>
        </span>
        <span className="mt-1 block text-2xs leading-relaxed text-ink-500">
          {action.criticalityLabel}
          {reason && <span className="text-ink-400">. {reason}.</span>}
        </span>
      </span>
      <span className="mt-0.5 hidden shrink-0 items-center gap-1 self-center rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink-600 sm:inline-flex group-hover:text-ink-900">
        Open
        <ArrowRightIcon width={13} height={13} />
      </span>
    </button>
  );
}

function FocusChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3.5 py-2.5">
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
      <div className="mt-0.5 text-xs font-medium leading-snug text-ink-800">{value}</div>
    </div>
  );
}

export function NextView({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const actions = company.nextActions || [];
  const focus = company.focus;
  const northStarValue = focus?.northStar
    ? focus.northStar + (focus.northStarMature ? ` (toward ${focus.northStarMature})` : "")
    : null;
  return (
    <div className="scroll-thin h-full overflow-y-auto bg-canvas">
      <div className="mx-auto max-w-3xl px-8 py-8">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-ink-900">What to do next</h1>
          <p className="mt-1 text-sm text-ink-500">
            The highest-leverage work for {company.name || "your company"} right now, in order. Open any
            item to run it, approve it, or hand it to an agent.
          </p>
        </div>

        {focus && (focus.win || focus.constraint || northStarValue) && (
          <div className="mb-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {focus.win && <FocusChip label="Your win" value={focus.win} />}
            {focus.constraint && <FocusChip label="Binding constraint" value={focus.constraint} />}
            {northStarValue && <FocusChip label="North star" value={northStarValue} />}
          </div>
        )}

        <div className="space-y-2.5">
          {actions.length === 0 && (
            <div className="rounded-xl border border-line bg-surface px-5 py-6 text-center text-2xs text-ink-400 shadow-card">
              Nothing is ready right now. Advance the current level, or open the Build map to see what is
              waiting on earlier work.
            </div>
          )}
          {actions.slice(0, 12).map((a, i) => (
            <ActionCard key={a.id} action={a} index={i} onOpen={onOpenTask} />
          ))}
        </div>

        {actions.length > 0 && (
          <p className="mt-6 text-2xs text-ink-400">
            Ranked by the same engine as /casa-next. Work you marked as already done lives in the Build
            map, labeled as assumed until Casa verifies it.
          </p>
        )}
      </div>
    </div>
  );
}
