// Minimal line-icon set. Stroke-based, 1.5px, inherits currentColor.
// One icon per task-state (state legibility) plus a small department glyph set.

import type { SVGProps } from "react";
import type { Department, TaskState } from "../mockData";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

// --- State icons (must be distinguishable by shape, not color) ---

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

// Agent: a four-point spark / star burst
export const SparkIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="M12 8.5 13.2 11l2.3 1-2.3 1L12 15.5 10.8 13l-2.3-1 2.3-1L12 8.5Z" />
  </svg>
);

// Input: a person (human decision)
export const PersonIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
  </svg>
);

// Approval: an eye / review glyph
export const ReviewIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.4" />
  </svg>
);

// Locked: a padlock
export const LockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export const stateIcon: Record<TaskState, (p: IconProps) => JSX.Element> = {
  completed: CheckIcon,
  agent: SparkIcon,
  input: PersonIcon,
  approval: ReviewIcon,
  locked: LockIcon,
};

// --- UI affordance icons ---

export const ArrowRightIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const PlayIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 5.5v13l11-6.5-11-6.5Z" />
  </svg>
);

export const ExternalIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const MapIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 4 3 6.5v13.5L9 17.5l6 2.5 6-2.5V6.5L15 4 9 6.5 9 4Z" />
    <path d="M9 4v13.5M15 6.5V20" />
  </svg>
);

export const InboxIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 13h5l1.5 2.5h5L21 13" />
    <path d="M5.5 6.5h13L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5l2.5-6.5Z" />
  </svg>
);

export const OrgIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <rect x="3" y="16" width="6" height="4" rx="1" />
    <rect x="15" y="16" width="6" height="4" rx="1" />
    <path d="M12 7v5M6 16v-2h12v2" />
  </svg>
);

export const LoopsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2" />
    <path d="M18 4v4h-4M6 20v-4h4" />
  </svg>
);

export const NextIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
  </svg>
);

export const CheckCircleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12l2.5 2.5L16 9" />
  </svg>
);

export const PencilIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20h4l10-10-4-4L4 16v4Z" />
    <path d="M13.5 6.5l4 4" />
  </svg>
);

export const SpinnerIcon = (p: IconProps) => (
  <svg {...base(p)} className={"animate-spin " + (p.className ?? "")}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
);

// A document / output-file glyph
export const FileIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 2.5h7l5 5V21a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 21V3a.5.5 0 0 1 .5-.5Z" />
    <path d="M13 2.5V8h5" />
  </svg>
);

// A folder with a document peeking out (the deliverable file browser)
export const FilesIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 7.5a2 2 0 0 1 2-2h3.2l1.6 2H19a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5Z" />
    <path d="M8 11h8M8 14.5h5" />
  </svg>
);

// Chevron, used for disclosure toggles
export const ChevronIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

// Send / paper-plane glyph for the node chat input
export const SendIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 3 11 13" />
    <path d="M21 3l-6.5 18-3.5-8-8-3.5L21 3Z" />
  </svg>
);

// --- Department glyph (small letter token) ---

export const deptInitial: Record<Department, string> = {
  You: "Y",
  Brand: "B",
  Engineering: "E",
  Legal: "L",
  Design: "D",
  Operations: "O",
  Marketing: "M",
  Finance: "F",
  Sales: "S",
  Support: "Su",
};
