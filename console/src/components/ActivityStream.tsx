// Live agent-activity stream. Reveals lines progressively and types out
// the final, most-recent line to convey "the agent is working right now".

import { useEffect, useState } from "react";
import type { ActivityLine } from "../mockData";

interface Props {
  lines: ActivityLine[];
  live?: boolean; // if true, the last line types out with a blinking caret
}

export function ActivityStream({ lines, live = true }: Props) {
  const lastIndex = lines.length - 1;
  const lastText = lines[lastIndex]?.text ?? "";

  const [typed, setTyped] = useState(live ? "" : lastText);

  useEffect(() => {
    if (!live) {
      setTyped(lastText);
      return;
    }
    setTyped("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(lastText.slice(0, i));
      if (i >= lastText.length) clearInterval(id);
    }, 22);
    return () => clearInterval(id);
  }, [lastText, live]);

  return (
    <ol className="space-y-0">
      {lines.map((line, idx) => {
        const isLast = idx === lastIndex;
        return (
          <li
            key={idx}
            className="relative flex gap-3 pb-3 pl-4 last:pb-0"
            style={{ animation: `draw-in 0.35s ease-out ${idx * 60}ms both` }}
          >
            {/* timeline rail */}
            <span
              className="absolute left-[3px] top-1.5 h-full w-px bg-line"
              aria-hidden
              style={{ display: isLast ? "none" : "block" }}
            />
            <span
              className={`absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full ${
                isLast && live ? "bg-agent-500" : "bg-ink-300"
              }`}
              aria-hidden
            />
            <span className="font-mono text-2xs text-ink-400 tabular pt-px shrink-0 w-9">
              {line.time}
            </span>
            <span className="font-mono text-2xs leading-relaxed text-ink-700">
              {isLast && live ? (
                <>
                  {typed}
                  <span className="inline-block w-1.5 h-3 -mb-0.5 ml-0.5 bg-agent-500 animate-caret-blink align-middle" />
                </>
              ) : (
                line.text
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
