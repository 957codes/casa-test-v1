import { useEffect, useState } from "react";
import { Sidebar, type View } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Legend } from "./components/Legend";
import { BuildMap } from "./components/BuildMap";
import { TaskPanel } from "./components/TaskPanel";
import { Dashboard } from "./components/Dashboard";
import { NextView } from "./components/NextView";
import { LoopsView } from "./components/LoopsView";
import { OrgView } from "./components/OrgView";
import { taskById, attentionQueue, type Task } from "./mockData";
import { subscribeBrain } from "./feed";

export default function App() {
  const [view, setView] = useState<View>("next");
  const [selected, setSelected] = useState<Task | null>(null);
  // Bump on every live brain update so the components re-read the refreshed data.
  const [, setTick] = useState(0);

  useEffect(() => subscribeBrain(() => setTick((t) => t + 1)), []);

  // Open a node's detail panel in place (the panel is always mounted on the right).
  const selectTaskById = (id: string) => {
    const t = taskById[id];
    if (t) setSelected(t);
  };

  const openTaskById = (id: string) => {
    const t = taskById[id];
    if (t) {
      setView("map");
      setSelected(t);
    }
  };

  // Draw the eye toward the top item awaiting the founder.
  const focusId = attentionQueue[0]?.taskId ?? "";
  // Re-resolve the selected task against the live brain so the panel stays current.
  const selectedLive = selected ? taskById[selected.id] ?? selected : null;

  return (
    <div className="flex h-full w-full overflow-hidden bg-canvas text-ink-900">
      <Sidebar view={view} onChange={setView} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenAttention={() => setView("dashboard")} />

        {view === "next" && <NextView onOpenTask={selectTaskById} />}

        {view === "map" && (
          <>
            <Legend />
            <BuildMap
              onSelect={setSelected}
              selectedId={selectedLive?.id ?? null}
              focusId={focusId}
            />
          </>
        )}

        {view === "dashboard" && <Dashboard onOpenTask={openTaskById} />}

        {view === "loops" && <LoopsView />}

        {view === "org" && <OrgView />}
      </div>

      <TaskPanel task={selectedLive} onClose={() => setSelected(null)} />
    </div>
  );
}
