// Recurring loops: the cadences that keep a company alive after launch (weekly retro,
// compliance heartbeat, metrics pulse, content engine). This view shows which are due,
// when each last ran, and what it runs. A due loop runs in the founder's own session via
// /casa-priority + /casa-loops; "Mark ran" here resets the cadence deterministically
// (brain.mjs loop-ran) for when the founder has already run it.

import { useState } from "react";
import { company } from "../mockData";
import type { LoopStatus } from "../mockData";
import { postIntent } from "../feed";

function statusMeta(l: LoopStatus) {
  if (!l.eligible) return { label: "Locked", chip: "bg-canvas text-ink-400 border-line", note: `Unlocks at level ${l.min_level}` };
  if (l.due && l.never_run) return { label: "Due", chip: "bg-human-50 text-human-700 border-human-100", note: "Never run" };
  if (l.due) return { label: "Due", chip: "bg-human-50 text-human-700 border-human-100", note: `${l.overdue_days}d overdue` };
  return { label: "On cadence", chip: "bg-approve-50 text-approve-600 border-approve-100", note: l.next_due_in_days != null ? `Due in ${l.next_due_in_days}d` : "" };
}

function LoopRow({ l }: { l: LoopStatus }) {
  const [busy, setBusy] = useState(false);
  const m = statusMeta(l);
  const markRan = async () => {
    setBusy(true);
    await postIntent("loop-ran", l.id, {});
    setBusy(false);
  };
  return (
    <div className="px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink-900">{l.title}</span>
            <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wide ${m.chip}`}>
              {m.label}
            </span>
          </div>
          <p className="mt-1 text-2xs leading-relaxed text-ink-500">{l.why}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[10px] text-ink-400">
            <span>every {l.cadence_days}d</span>
            <span>{m.note}</span>
            <span>last: {l.last_ran || "never"}</span>
            {l.runs && <span>runs: {l.runs}</span>}
          </div>
        </div>
        {l.eligible && (
          <button
            type="button"
            onClick={markRan}
            disabled={busy}
            className="shrink-0 rounded-md border border-line bg-canvas px-2.5 py-1 text-xs font-medium text-ink-600 transition-colors hover:bg-surface hover:text-ink-900 disabled:opacity-50"
            title="Already ran this in your terminal? Reset the cadence."
          >
            {busy ? "..." : "Mark ran"}
          </button>
        )}
      </div>
    </div>
  );
}

export function LoopsView() {
  const loops = company.loops || [];
  const due = loops.filter((l) => l.due).length;
  return (
    <div className="scroll-thin h-full overflow-y-auto bg-canvas">
      <div className="mx-auto max-w-3xl px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-ink-900">Loops</h1>
          <p className="mt-1 text-sm text-ink-500">
            Recurring cadences that keep the company alive. {due > 0 ? `${due} due now.` : "All on cadence."} Due loops run
            in your own session via /casa-priority.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card divide-y divide-line">
          {loops.length === 0 && <p className="px-5 py-4 text-2xs text-ink-400">No loops defined for this company yet.</p>}
          {loops.map((l) => (
            <LoopRow key={l.id} l={l} />
          ))}
        </div>
      </div>
    </div>
  );
}
