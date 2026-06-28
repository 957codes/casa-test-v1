// The connected "game" header: the founder's path to their win as a four-rung ladder (Validation
// -> Activation -> Retention -> Scale) with the current rung lit, the one metric to move now, and
// honest momentum (real plays shipped). Every element is the real company moving, not generic XP.

import type { Journey } from "../mockData";

export function JourneyBar({ journey, health }: { journey: Journey; health?: number }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-card">
      {journey.win && (
        <div className="mb-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-400">Building toward</div>
          <div className="mt-0.5 text-sm font-medium leading-snug text-ink-800">{journey.win}</div>
        </div>
      )}

      {/* The band ladder */}
      <div className="flex items-stretch gap-1.5">
        {journey.ladder.map((r) => (
          <div key={r.key} className="flex-1">
            <div
              className={`h-1.5 rounded-full ${
                r.reached ? "bg-approve-500" : r.current ? "bg-agent-500" : "bg-line"
              }`}
            />
            <div className="mt-1.5">
              <div
                className={`text-2xs font-semibold ${
                  r.current ? "text-agent-700" : r.reached ? "text-approve-600" : "text-ink-400"
                }`}
              >
                {r.label}
                {r.current && <span className="ml-1 font-normal text-ink-400">you are here</span>}
              </div>
              <div className="text-[10px] leading-tight text-ink-400">{r.blurb}</div>
            </div>
          </div>
        ))}
      </div>

      {/* The three honest vitals: the metric to move, momentum, company vitality */}
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-400">Move this number</div>
          <div className="mt-0.5 text-sm font-semibold text-ink-900">{journey.metric || "validated demand"}</div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-400">Shipped</div>
          <div className="mt-0.5 text-sm font-semibold tabular text-ink-900">
            {journey.shipped}
            <span className="text-2xs font-normal text-ink-400"> verified</span>
            {journey.assumed > 0 && <span className="text-2xs font-normal text-ink-400"> / {journey.assumed} assumed</span>}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-400">Vitality</div>
          <div className="mt-0.5 text-sm font-semibold tabular text-ink-900">
            {typeof health === "number" ? health : "--"}
            <span className="text-2xs font-normal text-ink-400"> / 100</span>
          </div>
        </div>
      </div>
    </section>
  );
}
