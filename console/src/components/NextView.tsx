// The homepage: a SINGLE clear move framed by the founder's binding constraint and journey, not a
// wall of co-equal emergencies. Ranked by the engine (identical to /casa-next). The journey ladder
// and momentum are the connected "game" (the real company moving toward the win), and THE MOVE is
// the one thing to do now. The rest queue below. Clicking opens the node panel, where work happens.

import { company, type NextAction, type Win } from "../mockData";
import { CriticalityBadge } from "./CriticalityBadge";
import { JourneyBar } from "./JourneyBar";
import { ArrowRightIcon, PlayIcon, CheckCircleIcon } from "./icons";

// The closed-loop payoff: completed work, graded, newest first. Seeing wins accumulate (and the
// move advance) is the reason to come back and do the next one.
function WinsStrip({ wins, onOpen }: { wins: Win[]; onOpen: (id: string) => void }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-5 py-3.5 shadow-card">
      <div className="mb-2 flex items-center gap-2">
        <CheckCircleIcon width={14} height={14} className="text-approve-500" />
        <span className="text-2xs font-semibold text-ink-700">Recently shipped</span>
        <span className="font-mono text-[10px] text-ink-400">{wins.length} graded</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {wins.slice(0, 6).map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => onOpen(w.id)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-2xs transition-colors hover:bg-canvas ${
              w.pass ? "border-approve-100 bg-approve-50 text-approve-700" : "border-human-100 bg-human-50 text-human-700"
            }`}
            title={w.pass ? "Passed the bar" : "Below the bar -- worth improving"}
          >
            <span className="max-w-[160px] truncate font-medium">{w.title}</span>
            <span className="font-mono tabular opacity-80">{w.score}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function reasonLine(a: NextAction): string {
  const parts: string[] = [];
  if (a.unblocks.length) parts.push(`Unblocks ${a.unblocks.slice(0, 2).join(", ")}`);
  if (a.blocksRevenue) parts.push("revenue cannot flow until this is done");
  if (a.humanGate) parts.push("needs your approval");
  return parts.join(" / ");
}

// THE MOVE: the single highest-leverage action, framed by the constraint it beats. Big, singular,
// one CTA -- the antidote to "seven co-equal existential emergencies".
function TheMove({ action, constraint, onOpen }: { action: NextAction; constraint: string | null; onOpen: (id: string) => void }) {
  const reason = reasonLine(action);
  return (
    <section className="rounded-xl border border-agent-100 bg-agent-50/40 p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-agent-700">Your move now</span>
        {constraint && (
          <span className="font-mono text-[10px] text-ink-400">to beat: {constraint}</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold leading-tight text-ink-900">{action.title}</h2>
        {action.criticality && <CriticalityBadge value={action.criticality} />}
        <span className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[9px] text-ink-500">{action.owner}</span>
      </div>
      {reason && <p className="mt-1.5 text-xs leading-relaxed text-ink-600">{reason}.</p>}
      <button
        type="button"
        onClick={() => onOpen(action.id)}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-agent-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-agent-600"
      >
        <PlayIcon width={15} height={15} />
        Start this
      </button>
    </section>
  );
}

function QueueCard({ action, index, onOpen }: { action: NextAction; index: number; onOpen: (id: string) => void }) {
  const reason = reasonLine(action);
  return (
    <button
      type="button"
      onClick={() => onOpen(action.id)}
      className="group flex w-full items-start gap-4 rounded-xl border border-line bg-surface px-5 py-3.5 text-left shadow-card transition-colors hover:border-line-strong hover:bg-canvas"
    >
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-canvas font-mono text-2xs font-semibold tabular text-ink-400 group-hover:bg-surface">
        {index + 2}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink-900">{action.title}</span>
          {action.criticality && <CriticalityBadge value={action.criticality} />}
          <span className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[9px] text-ink-400">{action.owner}</span>
        </span>
        {reason && <span className="mt-1 block text-2xs leading-relaxed text-ink-400">{reason}.</span>}
      </span>
      <span className="mt-0.5 hidden shrink-0 items-center gap-1 self-center rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink-600 sm:inline-flex group-hover:text-ink-900">
        Open
        <ArrowRightIcon width={13} height={13} />
      </span>
    </button>
  );
}

export function NextView({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const actions = company.nextActions || [];
  const journey = company.journey;
  const wins = company.wins || [];
  const constraint = company.focus?.constraint ?? null;
  const move = actions[0] || null;
  const rest = actions.slice(1, 9);

  return (
    <div className="scroll-thin h-full overflow-y-auto bg-canvas">
      <div className="mx-auto max-w-3xl px-8 py-8">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-ink-900">{company.name || "Your company"}</h1>
          <p className="mt-1 text-sm text-ink-500">
            One move at a time. Here is the highest-leverage thing to do now, and where it sits on the
            path to your win.
          </p>
        </div>

        {journey && (
          <div className="mb-6">
            <JourneyBar journey={journey} health={company.health?.overall} />
          </div>
        )}

        {wins.length > 0 && (
          <div className="mb-6">
            <WinsStrip wins={wins} onOpen={onOpenTask} />
          </div>
        )}

        {move ? (
          <TheMove action={move} constraint={constraint} onOpen={onOpenTask} />
        ) : (
          <div className="rounded-xl border border-line bg-surface px-5 py-6 text-center text-2xs text-ink-400 shadow-card">
            Nothing is ready right now. Advance the current level, or open the Build map to see what is
            waiting on earlier work.
          </div>
        )}

        {rest.length > 0 && (
          <div className="mt-6">
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-900">Also ready</h3>
              <span className="font-mono text-2xs text-ink-400">do after your move, or in parallel</span>
            </div>
            <div className="space-y-2.5">
              {rest.map((a, i) => (
                <QueueCard key={a.id} action={a} index={i} onOpen={onOpenTask} />
              ))}
            </div>
          </div>
        )}

        {actions.length > 0 && (
          <p className="mt-6 text-2xs text-ink-400">
            Ranked by the same engine as /casa-next, led by your binding constraint. Work you marked as
            already done lives in the Build map, labeled assumed until Casa verifies it.
          </p>
        )}
      </div>
    </div>
  );
}
