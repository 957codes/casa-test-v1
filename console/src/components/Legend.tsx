// A compact, always-visible legend of the five autonomy states.
// Anchors the design soul: every task is honestly labeled by who drives it.

import type { TaskState } from "../mockData";
import { stateIcon } from "./icons";
import { stateMeta } from "./StateBadge";

const order: TaskState[] = ["completed", "agent", "input", "approval", "locked"];

export function Legend() {
  return (
    <div className="flex items-center gap-1 border-b border-line bg-surface/70 px-6 py-2">
      <span className="mr-2 font-mono text-2xs uppercase tracking-wider text-ink-400">
        Who drives it
      </span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {order.map((s) => {
          const meta = stateMeta[s];
          const Icon = stateIcon[s];
          return (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span
                className={`flex h-4 w-4 items-center justify-center rounded ${meta.iconColor}`}
              >
                <Icon width={12} height={12} />
              </span>
              <span className="text-2xs font-medium text-ink-600">{meta.label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
