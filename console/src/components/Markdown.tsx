// Minimal, dependency-free markdown renderer for agent output shown read-only
// inside the founder's own local workspace. Every input is HTML-escaped first, then
// a small set of block + inline transforms run, so raw tags in the source render as
// text and cannot execute. We deliberately avoid pulling a parser/sanitizer dep to
// keep the Console light. Styling lives in index.css under `.markdown-body`.

import { useMemo } from "react";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Inline transforms run on already-escaped text.
function inline(s: string): string {
  let out = s.replace(/`([^`]+)`/g, (_m, c) => `<code>${c}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text, url) => {
    const safe = /^(https?:\/\/|mailto:|\/|#)/i.test(url) ? url : "#";
    return `<a href="${safe}" target="_blank" rel="noreferrer">${text}</a>`;
  });
  return out;
}

function toHtml(md: string): string {
  const lines = escapeHtml(md.replace(/\r\n/g, "\n")).split("\n");
  const html: string[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  let listType: "ul" | "ol" | null = null;
  const closeList = () => {
    if (listType) { html.push(`</${listType}>`); listType = null; }
  };

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      if (inCode) {
        html.push(`<pre><code>${codeBuf.join("\n")}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      closeList();
      const level = Math.min(6, h[1].length);
      html.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      if (listType !== "ul") { closeList(); html.push("<ul>"); listType = "ul"; }
      html.push(`<li>${inline(line.replace(/^\s*[-*]\s+/, ""))}</li>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      if (listType !== "ol") { closeList(); html.push("<ol>"); listType = "ol"; }
      html.push(`<li>${inline(line.replace(/^\s*\d+\.\s+/, ""))}</li>`);
      continue;
    }
    if (line.trim() === "") { closeList(); continue; }
    closeList();
    html.push(`<p>${inline(line)}</p>`);
  }
  if (inCode && codeBuf.length) html.push(`<pre><code>${codeBuf.join("\n")}</code></pre>`);
  closeList();
  return html.join("\n");
}

interface Props {
  text: string;
  className?: string;
}

export function Markdown({ text, className = "" }: Props) {
  const html = useMemo(() => toHtml(text ?? ""), [text]);
  return (
    <div
      className={`markdown-body text-sm leading-relaxed text-ink-700 ${className}`}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
