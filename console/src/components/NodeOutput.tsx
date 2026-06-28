// The deliverable view for a COMPLETED node: each produced output file rendered in
// place. HTML deliverables (e.g. a brand board) render in a sandboxed iframe with
// scripts disabled; markdown/text render via the lightweight Markdown component;
// everything else shows as a plain monospace block. Files come from the bridge's
// node-output endpoint (GET /api/output?node=id), written under company-brain/outputs.

import { useEffect, useState } from "react";
import type { Task, OutputFile } from "../mockData";
import { getOutput } from "../feed";
import { Markdown } from "./Markdown";
import { formatBytes } from "./chips";
import { FileIcon, FilesIcon, SpinnerIcon } from "./icons";

// Treat common text/markup files as markdown-renderable; everything else shows
// as a plain monospace code block.
function isMarkdownish(path: string): boolean {
  return /\.(md|markdown|mdx|txt)$/i.test(path) || !/\.[a-z0-9]+$/i.test(path);
}

export function NodeOutput({ task }: { task: Task }) {
  const [files, setFiles] = useState<OutputFile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setErr(null);
    setFiles(null);
    getOutput(task.id)
      .then((d) => { if (live) setFiles(d.files ?? []); })
      .catch((e) => { if (live) setErr(e?.message ?? "Could not load output"); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [task.id]);

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-ink-400">
        <FilesIcon width={13} height={13} className="text-ink-400" />
        What the agent delivered
        {files && files.length > 0 && <span className="text-ink-300">({files.length})</span>}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-2xs text-ink-400">
          <SpinnerIcon width={13} height={13} className="text-ink-300" />
          Loading the deliverable...
        </div>
      )}

      {err && !loading && (
        <p className="rounded-lg border border-line bg-canvas px-4 py-3 text-2xs text-ink-500">
          Could not load file contents ({err}).
        </p>
      )}

      {!loading && !err && files && files.length === 0 && (
        <p className="rounded-lg border border-line bg-canvas px-4 py-3 text-2xs text-ink-400">
          No output files have been written for this node yet.
        </p>
      )}

      {files && files.length > 0 && (
        <div className="space-y-4">
          {files.map((f) => (
            <div key={f.path} className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line bg-canvas px-3.5 py-2">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <FileIcon width={13} height={13} className="shrink-0 text-ink-400" />
                  <span className="truncate font-mono text-2xs text-ink-700">{f.path}</span>
                </span>
                <span className="shrink-0 font-mono text-[10px] tabular text-ink-400">
                  {formatBytes(f.bytes)}
                </span>
              </div>
              {/\.html?$/i.test(f.path) ? (
                <iframe
                  title={f.path}
                  srcDoc={f.content}
                  sandbox=""
                  className="block w-full border-0 bg-white"
                  style={{ height: 520 }}
                />
              ) : (
                <div className="px-4 py-4">
                  {isMarkdownish(f.path) ? (
                    <Markdown text={f.content} />
                  ) : (
                    <pre className="scroll-thin overflow-x-auto">
                      <code className="font-mono text-2xs leading-relaxed text-ink-700">
                        {f.content}
                      </code>
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
