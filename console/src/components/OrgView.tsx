// Departments / agent org view. Reinforces "you are running a company".
// Light touch: the manager agent plus a grid of department cards.

import { departments, manager } from "../mockData";
import { deptInitial } from "./icons";

export function OrgView() {
  return (
    <div className="scroll-thin h-full overflow-y-auto bg-canvas">
      <div className="mx-auto max-w-5xl px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-ink-900">Your company</h1>
          <p className="mt-1 text-sm text-ink-500">
            Cadence is run by an org of specialized agents, coordinated by a manager. You
            stay in control of the decisions that matter.
          </p>
        </div>

        {/* Manager */}
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-agent-100 bg-agent-50 px-5 py-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-agent-500 text-base font-semibold text-white">
            {manager.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink-900">{manager.name}</span>
              <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-2xs text-agent-700">
                {manager.role}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-500">
              Coordinates all departments, sequences the build-map, and routes work to you
              only when a human decision is needed.
            </p>
          </div>
        </div>

        {/* Department grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <div
              key={dept.name}
              className="rounded-xl border border-line bg-surface px-5 py-4 shadow-card"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-canvas font-mono text-[10px] font-semibold text-ink-600">
                  {deptInitial[dept.name]}
                </span>
                <span className="text-sm font-semibold text-ink-900">{dept.name}</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-500">{dept.status}</p>
              <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-line pt-3">
                {dept.agents.map((a) => (
                  <span
                    key={a.name}
                    className="inline-flex items-center gap-1.5 rounded-md bg-canvas px-2 py-1 text-2xs text-ink-600"
                    title={a.role}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-agent-500" />
                    {a.name}
                    <span className="text-ink-400">· {a.role}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
