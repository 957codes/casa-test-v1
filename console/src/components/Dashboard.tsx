// Dashboard: company health and the "needs your attention" queue.
// Metric tiles, the human-gate / ready queue, and recently completed work.

import {
  company,
  attentionQueue,
  activityFeed,
  type AttentionItem,
} from "../mockData";
import { stateIcon, deptInitial, ArrowRightIcon } from "./icons";
import { stateMeta } from "./StateBadge";

interface Props {
  onOpenTask: (taskId: string) => void;
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-4 shadow-card">
      <div className="font-mono text-2xs uppercase tracking-wider text-ink-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular text-ink-900">{value}</div>
      {sub && <div className="mt-1 text-2xs text-ink-400">{sub}</div>}
    </div>
  );
}

function QueueRow({ item, index, onOpen }: { item: AttentionItem; index: number; onOpen: (id: string) => void }) {
  const meta = stateMeta[item.state];
  const Icon = stateIcon[item.state];
  const human = item.state === "input";
  return (
    <button
      type="button"
      onClick={() => onOpen(item.taskId)}
      className="group flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition-colors hover:bg-canvas"
    >
      <span className="font-mono text-2xs tabular text-ink-300 w-4 shrink-0">{index + 1}</span>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
          human ? "border-human-100 bg-human-50 text-human-600" : "border-approve-100 bg-approve-50 text-approve-500"
        }`}
      >
        <Icon width={16} height={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink-900">{item.title}</span>
          <span className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[9px] text-ink-400">{item.owner}</span>
        </span>
        <span className="mt-0.5 block truncate text-2xs text-ink-500">{item.ask}</span>
      </span>
      <span
        className={`hidden shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium sm:inline-flex ${
          human ? "border-human-100 bg-human-50 text-human-700" : "border-approve-100 bg-approve-50 text-approve-600"
        } group-hover:brightness-[0.98]`}
      >
        {item.cta}
        <ArrowRightIcon width={13} height={13} className={meta.iconColor} />
      </span>
    </button>
  );
}

export function Dashboard({ onOpenTask }: Props) {
  const pct = company.tasksTotal ? Math.round((company.tasksComplete / company.tasksTotal) * 100) : 0;
  return (
    <div className="scroll-thin h-full overflow-y-auto bg-canvas">
      <div className="mx-auto max-w-5xl px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-ink-900">Building {company.name || "your company"}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {company.needsAttention} {company.needsAttention === 1 ? "item needs" : "items need"} a decision from you.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Level" value={String(company.metrics.level)} sub="Current level" />
          <Metric label="Progress" value={`${pct}%`} sub={`${company.tasksComplete}/${company.tasksTotal} done`} />
          <Metric label="Spend" value={`$${company.metrics.spend}`} sub="via Capx Pay" />
          <Metric label="Needs you" value={String(company.needsAttention)} sub="open decisions" />
        </div>

        <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <section className="lg:col-span-3">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-900">Needs your attention</h2>
              <span className="font-mono text-2xs text-ink-400">Ready and human-gate items</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card divide-y divide-line">
              {attentionQueue.length === 0 && (
                <p className="px-5 py-4 text-2xs text-ink-400">Nothing needs you right now.</p>
              )}
              {attentionQueue.map((item, i) => (
                <QueueRow key={item.taskId} item={item} index={i} onOpen={onOpenTask} />
              ))}
            </div>
          </section>

          <section className="lg:col-span-2">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-900">Recently completed</h2>
            </div>
            <div className="rounded-xl border border-line bg-surface px-5 py-4 shadow-card">
              <ol className="space-y-3.5">
                {activityFeed.length === 0 && <li className="text-2xs text-ink-400">No completed work yet.</li>}
                {activityFeed.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-canvas font-mono text-[9px] font-semibold text-ink-500">
                      {deptInitial[item.owner]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs leading-relaxed text-ink-700">{item.text}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-ink-400">{item.owner}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
