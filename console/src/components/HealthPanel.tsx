// The attention/health "game": one overall score the founder can raise, broken into
// the dimensions that move it (do-or-die coverage, momentum, graded quality, open gates,
// loop hygiene) and the per-department picture. Color is restrained and always paired
// with a number + label -- never alarm-by-color alone.

import type { CompanyHealth, DeptHealth } from "../mockData";

// Three restrained bands within the existing palette. Amber (human) = needs your
// attention, indigo (agent) = on track, green (approve) = strong.
function band(v: number) {
  if (v >= 75) return { bar: "bg-approve-500", text: "text-approve-600", track: "bg-approve-50" };
  if (v >= 50) return { bar: "bg-agent-500", text: "text-agent-700", track: "bg-agent-50" };
  return { bar: "bg-human-500", text: "text-human-700", track: "bg-human-50" };
}

function Bar({ value, hint, label }: { value: number | null; hint: string; label: string }) {
  if (value == null) {
    return (
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium text-ink-700">{label}</span>
          <span className="font-mono text-2xs text-ink-400">unmeasured</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-canvas" />
        <p className="mt-1 text-[10px] text-ink-400">{hint}</p>
      </div>
    );
  }
  const b = band(value);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-ink-700">{label}</span>
        <span className={`font-mono text-2xs font-semibold tabular ${b.text}`}>{value}</span>
      </div>
      <div className={`mt-1.5 h-1.5 w-full overflow-hidden rounded-full ${b.track}`}>
        <div className={`h-full rounded-full ${b.bar}`} style={{ width: `${value}%` }} />
      </div>
      <p className="mt-1 text-[10px] text-ink-400">{hint}</p>
    </div>
  );
}

function DeptRow({ d }: { d: DeptHealth }) {
  const b = band(d.pct);
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 truncate text-2xs text-ink-600">{d.name}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas">
        <div className={`h-full rounded-full ${b.bar}`} style={{ width: `${d.pct}%` }} />
      </div>
      <span className="w-12 shrink-0 text-right font-mono text-[10px] tabular text-ink-400">
        {d.done}/{d.total}
      </span>
      {d.ready > 0 && (
        <span className="w-6 shrink-0 text-right font-mono text-[10px] tabular text-human-600" title={`${d.ready} ready / needs you`}>
          {d.ready}
        </span>
      )}
    </div>
  );
}

export function HealthPanel({ health }: { health: CompanyHealth }) {
  const b = band(health.overall);
  const verdict = health.overall >= 75 ? "Strong" : health.overall >= 50 ? "On track" : "Needs work";
  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Score */}
        <div className="lg:col-span-1">
          <div className="font-mono text-2xs uppercase tracking-wider text-ink-400">Company health</div>
          <div className={`mt-1 text-4xl font-semibold tabular ${b.text}`}>{health.overall}</div>
          <div className="text-2xs text-ink-500">{verdict} / 100</div>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-canvas px-2 py-1">
            <span className="font-mono text-[10px] text-ink-500">do-or-die</span>
            <span className="font-mono text-2xs font-semibold tabular text-ink-800">
              {health.existentialDone}/{health.existentialTotal}
            </span>
          </div>
        </div>

        {/* Component bars */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:col-span-2">
          {health.components.map((c) => (
            <Bar key={c.key} label={c.label} value={c.value} hint={c.hint} />
          ))}
        </div>

        {/* Department health */}
        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-2xs uppercase tracking-wider text-ink-400">By department</span>
            <span className="font-mono text-[10px] text-ink-300">done / total</span>
          </div>
          <div className="space-y-2">
            {health.departments.slice(0, 7).map((d) => (
              <DeptRow key={d.name} d={d} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
