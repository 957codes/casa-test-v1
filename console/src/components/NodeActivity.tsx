// Per-node activity log (GET /api/activity?node=id). A simple chronological
// timeline of what the agent (or the engine) recorded for this node. Re-pulls on
// every brain/queue refresh (the panel passes a fresh `task` reference over SSE)
// and polls while the node is working so live progress shows without a reload.

import { useEffect, useRef, useState } from "react";
import type { Task, ActivityEvent } from "../mockData";
import { getActivity } from "../feed";

const clock = (ts: string) => {
  const d = new Date(ts);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

export function NodeActivity({ task, working }: { task: Task; working?: boolean }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    const all = await getActivity(task.id);
    setEvents(all);
    setLoaded(true);
  }

  useEffect(() => {
    setEvents([]);
    setLoaded(false);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  // Re-pull on brain/queue refresh (new `task` reference) so events stay current.
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);

  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (working) pollRef.current = setInterval(() => void load(), 2500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [working]);

  if (loaded && events.length === 0) return null;

  const ordered = [...events]
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
    .slice(-40);

  return (
    <div className="mt-6">
      <div className="mb-3 font-mono text-2xs uppercase tracking-wider text-ink-400">Activity</div>
      <div className="scroll-thin max-h-64 overflow-y-auto rounded-lg border border-line bg-canvas px-4 py-4">
        <ol className="space-y-0">
          {ordered.map((e, idx) => {
            const isLast = idx === ordered.length - 1;
            return (
              <li key={`${e.ts}-${idx}`} className="relative flex gap-3 pb-3 pl-4 last:pb-0">
                <span
                  className="absolute left-[3px] top-1.5 h-full w-px bg-line"
                  aria-hidden
                  style={{ display: isLast ? "none" : "block" }}
                />
                <span
                  className={`absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full ${
                    isLast && working ? "bg-agent-500" : "bg-ink-300"
                  }`}
                  aria-hidden
                />
                <span className="w-16 shrink-0 pt-px font-mono text-2xs tabular text-ink-400">
                  {clock(e.ts)}
                </span>
                <span className="font-mono text-2xs leading-relaxed text-ink-700">{e.text}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
