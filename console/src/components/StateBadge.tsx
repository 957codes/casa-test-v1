// The five-state autonomy badge — the core UI primitive.
// Distinguishable by icon + label + restrained color treatment.
// Never relies on color alone (color-blind safe).

import type { TaskState } from "../mockData";
import { stateIcon } from "./icons";

interface StateMeta {
  label: string;
  // Tailwind classes for the badge chip
  chip: string;
  iconColor: string;
  // dot/legend treatment
}

export const stateMeta: Record<TaskState, StateMeta> = {
  completed: {
    label: "Completed",
    chip: "bg-done-50 text-ink-500 border-line-strong",
    iconColor: "text-approve-500",
  },
  agent: {
    label: "Agent can do this",
    chip: "bg-agent-50 text-agent-700 border-agent-100",
    iconColor: "text-agent-600",
  },
  input: {
    label: "Needs your input",
    chip: "bg-human-50 text-human-700 border-human-100",
    iconColor: "text-human-600",
  },
  approval: {
    label: "Needs approval",
    chip: "bg-approve-50 text-approve-600 border-approve-100",
    iconColor: "text-approve-500",
  },
  locked: {
    label: "Needs earlier steps first",
    chip: "bg-canvas text-ink-400 border-line",
    iconColor: "text-ink-300",
  },
};

interface Props {
  state: TaskState;
  size?: "sm" | "md";
  className?: string;
}

export function StateBadge({ state, size = "sm", className = "" }: Props) {
  const meta = stateMeta[state];
  const Icon = stateIcon[state];
  const pad = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-2xs";
  const iconSize = size === "md" ? 14 : 12;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium tracking-tight whitespace-nowrap ${meta.chip} ${pad} ${className}`}
    >
      <Icon width={iconSize} height={iconSize} className={meta.iconColor} />
      <span>{meta.label}</span>
    </span>
  );
}
