// How much this node matters to the business: existential, core, growth, or
// optional. Distinguished by label + restrained color, never color alone.

import type { Criticality } from "../mockData";

const META: Record<Criticality, { label: string; chip: string }> = {
  existential: { label: "Existential", chip: "bg-human-50 text-human-700 border-human-100" },
  core: { label: "Core", chip: "bg-agent-50 text-agent-700 border-agent-100" },
  growth: { label: "Growth", chip: "bg-approve-50 text-approve-600 border-approve-100" },
  optional: { label: "Optional", chip: "bg-canvas text-ink-500 border-line" },
};

export function CriticalityBadge({ value }: { value: Criticality }) {
  const meta = META[value];
  if (!meta) return null;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-2xs font-medium uppercase tracking-wide ${meta.chip}`}
      title="How much this node matters to the business"
    >
      {meta.label}
    </span>
  );
}
