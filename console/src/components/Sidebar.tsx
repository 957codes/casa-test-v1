// Slim left rail nav. Switches between Build map, Attention, and Company.

import { MapIcon, InboxIcon, OrgIcon } from "./icons";
import { company } from "../mockData";

export type View = "map" | "dashboard" | "org";

interface Props {
  view: View;
  onChange: (v: View) => void;
}

export function Sidebar({ view, onChange }: Props) {
  const items: { id: View; label: string; Icon: typeof MapIcon; badge?: number }[] = [
    { id: "map", label: "Build map", Icon: MapIcon },
    { id: "dashboard", label: "Attention", Icon: InboxIcon, badge: company.needsAttention },
    { id: "org", label: "Company", Icon: OrgIcon },
  ];

  return (
    <nav className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-line bg-surface py-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900 font-mono text-xs font-bold text-white">
        C
      </div>
      {items.map(({ id, label, Icon, badge }) => {
        const active = view === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`group relative flex h-11 w-11 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors ${
              active
                ? "bg-canvas text-ink-900"
                : "text-ink-400 hover:bg-canvas hover:text-ink-700"
            }`}
            title={label}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            <Icon width={19} height={19} />
            <span className="text-[8px] font-medium leading-none tracking-tight">
              {label.split(" ")[0]}
            </span>
            {badge ? (
              <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-human-500 px-1 font-mono text-[8px] font-bold text-white">
                {badge}
              </span>
            ) : null}
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-ink-900" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
