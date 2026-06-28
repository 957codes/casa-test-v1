// Capx Pay spend. Casa only READS receipts (Pay writes finance/receipts.jsonl, rule 8);
// the Console never charges. The balance is labeled "Capx Pay" so it is never confused
// with a CAPX token holding. Money intents go through casa-pay with a founder confirm.

import type { SpendPanel as SpendData } from "../mockData";

function fmtUsd(n: number) {
  return `$${n.toFixed(2)}`;
}
function fmtTs(ts: string | null) {
  if (!ts) return "";
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function SpendPanel({ spend }: { spend: SpendData }) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-900">Spend</h2>
        <span className="font-mono text-2xs text-ink-400">{spend.label}</span>
      </div>
      <div className="rounded-xl border border-line bg-surface shadow-card">
        <div className="flex items-baseline gap-2 border-b border-line px-5 py-4">
          <span className="text-2xl font-semibold tabular text-ink-900">{fmtUsd(spend.total)}</span>
          <span className="font-mono text-2xs text-ink-400">{spend.currency} via {spend.label}</span>
        </div>
        {spend.receipts.length === 0 ? (
          <p className="px-5 py-4 text-2xs text-ink-400">
            No paid actions yet. When a step needs one, it routes through Capx Pay for your confirmation.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {spend.receipts.slice(0, 8).map((r, i) => (
              <li key={r.ref || i} className="flex items-center gap-3 px-5 py-2.5">
                <span className="font-mono text-[10px] tabular text-ink-300 w-9 shrink-0">{fmtTs(r.ts)}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-ink-700">{r.descriptor}</span>
                <span
                  className={`font-mono text-[10px] ${r.status === "settled" ? "text-ink-400" : "text-human-600"}`}
                  title={r.status}
                >
                  {r.status}
                </span>
                <span className="w-16 shrink-0 text-right font-mono text-2xs tabular text-ink-800">{fmtUsd(r.amount_usd)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
