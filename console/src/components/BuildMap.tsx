// The HERO: a horizontally-scrolling, stage-gated build-map.
// Stage columns with mono headers + done/total counters, task node cards,
// and dashed dependency connectors drawn as an SVG overlay.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { stages, taskById, type Task } from "../mockData";
import { TaskNode } from "./TaskNode";

interface Props {
  onSelect: (task: Task) => void;
  selectedId?: string | null;
  focusId: string;
}

interface Edge {
  from: string;
  to: string;
}

interface Point {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function BuildMap({ onSelect, selectedId, focusId }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [rects, setRects] = useState<Record<string, Point>>({});

  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    nodeRefs.current[id] = el;
  }, []);

  const measure = useCallback(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const base = inner.getBoundingClientRect();
    const next: Record<string, Point> = {};
    for (const [id, el] of Object.entries(nodeRefs.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      next[id] = {
        x: r.left - base.left,
        y: r.top - base.top,
        w: r.width,
        h: r.height,
      };
    }
    setRects(next);
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    const id = setTimeout(measure, 120); // after fonts settle
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(id);
    };
  }, [measure]);

  // Dependency edges, recomputed from the current brain on each render.
  const edges: Edge[] = [];
  for (const stage of stages) {
    for (const task of stage.tasks) {
      for (const dep of task.dependsOn ?? []) {
        if (taskById[dep]) edges.push({ from: dep, to: task.id });
      }
    }
  }

  const totalW = innerRef.current?.scrollWidth ?? 0;
  const totalH = innerRef.current?.scrollHeight ?? 0;

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        className="scroll-thin map-grid h-full overflow-x-auto overflow-y-auto"
      >
        <div ref={innerRef} className="relative inline-block min-w-full px-8 pb-16 pt-7">
          {/* Dependency connectors overlay */}
          <svg
            className="pointer-events-none absolute inset-0 z-0"
            width={totalW || "100%"}
            height={totalH || "100%"}
            style={{ overflow: "visible" }}
          >
            {edges.map((edge, i) => {
              const a = rects[edge.from];
              const b = rects[edge.to];
              if (!a || !b) return null;
              const toTask = taskById[edge.to];
              const locked = toTask?.state === "locked";
              // exit right-center of source, enter left-center of target
              const x1 = a.x + a.w;
              const y1 = a.y + a.h / 2;
              const x2 = b.x;
              const y2 = b.y + b.h / 2;
              const dx = Math.max(28, (x2 - x1) * 0.5);
              const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
              return (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke={locked ? "#e2e2df" : "#cfcfca"}
                  strokeWidth={1.5}
                  strokeDasharray="3 4"
                  strokeLinecap="round"
                  style={{
                    opacity: 0,
                    animation: `fade-in 0.5s ease-out ${200 + i * 18}ms forwards`,
                  }}
                />
              );
            })}
          </svg>

          {/* Stage columns */}
          <div className="relative z-10 flex items-start gap-10">
            {stages.map((stage) => {
              const complete = stage.done === stage.total && stage.total > 0;
              return (
                <section key={stage.id} className="flex shrink-0 flex-col">
                  {/* Column header */}
                  <header className="mb-4 flex items-center gap-2 pl-0.5">
                    <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-700">
                      {stage.label}
                    </h2>
                    <span
                      className={`rounded font-mono text-2xs tabular px-1.5 py-0.5 ${
                        complete
                          ? "bg-approve-50 text-approve-600"
                          : stage.done > 0
                          ? "bg-canvas text-ink-500"
                          : "bg-canvas text-ink-400"
                      }`}
                    >
                      {stage.done}/{stage.total}
                    </span>
                  </header>

                  {/* Vertical separator + nodes */}
                  <div className="flex flex-col gap-3.5 border-l border-line/70 pl-5">
                    {stage.tasks.map((task) => (
                      <TaskNode
                        key={task.id}
                        task={task}
                        registerRef={registerRef}
                        onClick={onSelect}
                        isFocus={task.id === focusId}
                        selected={selectedId === task.id}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right-edge fade hint that there's more to scroll */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-canvas to-transparent" />
    </div>
  );
}
