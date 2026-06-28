// Per-node chat: refine a node's output in a conversation. Loads the message
// history (GET /api/messages?node=id), optimistically appends the founder's message
// on send, fires postIntent("chat", id, {message}), and shows the required "queued"
// notice. The bridge writes the founder's message immediately and queues a chat
// WORK intent; the assistant's reply lands only after the founder drains the queue
// with /casa-serve, then arrives over SSE (the panel re-renders and history reloads).

import { useEffect, useRef, useState } from "react";
import type { Task, NodeMessage } from "../mockData";
import { activeIntentForNode } from "../mockData";
import { getMessages, postIntent } from "../feed";
import { Markdown } from "./Markdown";
import { SendIcon, SpinnerIcon } from "./icons";

type ChatMsg = NodeMessage & { pending?: boolean };

export function NodeChat({ task, autoFocus }: { task: Task; autoFocus?: boolean }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [queued, setQueued] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const chatPending = activeIntentForNode(task.id)?.kind === "chat";
  const refining = task.state === "agent" || chatPending || sending;

  // Keep every server row; drop a pending row once a matching server row exists.
  function merge(server: NodeMessage[], pending: ChatMsg[]): ChatMsg[] {
    const stillPending = pending.filter(
      (p) => !server.some((s) => s.role === p.role && s.content === p.content),
    );
    return [...server, ...stillPending];
  }

  async function load(showLoading = false) {
    try {
      if (showLoading) setLoading(true);
      const server = await getMessages(task.id);
      setMessages((prev) => merge(server, prev.filter((m) => m.pending)));
      setErr(null);
    } catch (e) {
      setErr((e as Error)?.message ?? "Could not load the conversation");
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  // Reset + load when the node changes.
  useEffect(() => {
    setMessages([]);
    setQueued(false);
    void load(true);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  // The panel re-renders (a fresh `task` reference) on every brain/queue refresh
  // over SSE; re-pull the history so a reply that just landed shows up.
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);

  // Backstop poll while a chat-triggered run is refining, in case SSE is slow.
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (refining) pollRef.current = setInterval(() => void load(), 2500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refining]);

  // Pin to the latest message.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, refining]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    const optimistic: ChatMsg = {
      id: `pending-${Date.now()}`,
      nodeId: task.id,
      role: "user",
      content: text,
      ts: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    setSending(true);
    try {
      await postIntent("chat", task.id, { message: text });
      setQueued(true);
      setTimeout(() => void load(), 400);
    } catch (e) {
      setErr((e as Error)?.message ?? "Could not send your message");
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-mono text-2xs uppercase tracking-wider text-ink-400">
          Refine with chat
        </div>
        {refining && (
          <span className="inline-flex items-center gap-1.5 font-mono text-2xs text-agent-600">
            <SpinnerIcon width={12} height={12} className="text-agent-500" />
            refining
          </span>
        )}
      </div>

      <div
        ref={listRef}
        className="scroll-thin max-h-80 space-y-3 overflow-y-auto rounded-lg border border-line bg-canvas px-4 py-4"
      >
        {loading ? (
          <div className="flex items-center gap-2 text-2xs text-ink-400">
            <SpinnerIcon width={13} height={13} className="text-ink-300" />
            Loading the conversation...
          </div>
        ) : messages.length === 0 ? (
          <p className="text-2xs leading-relaxed text-ink-400">
            Ask the agent to expand, change, or redo this node's output. Your message is queued as
            a short refinement run and the reply appears here once it runs.
          </p>
        ) : (
          messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div
                  className={`max-w-[85%] rounded-lg rounded-br-sm bg-agent-500 px-3.5 py-2 text-sm leading-relaxed text-white ${
                    m.pending ? "opacity-60" : ""
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex justify-start">
                <div className="max-w-[90%] rounded-lg rounded-bl-sm border border-line bg-surface px-3.5 py-2.5">
                  <Markdown text={m.content} />
                </div>
              </div>
            ),
          )
        )}
      </div>

      {err && <p className="mt-2 text-2xs text-human-600">{err}</p>}

      {queued && (
        <p className="mt-2 rounded-md border border-human-100 bg-human-50 px-3 py-2 text-2xs leading-relaxed text-human-700">
          Queued. Run /casa-serve in your Claude Code terminal to execute.
        </p>
      )}

      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={draft}
          autoFocus={autoFocus}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          placeholder="Ask the agent to refine this..."
          className="scroll-thin h-10 max-h-32 min-h-10 flex-1 resize-none rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-agent-500 focus:outline-none focus:ring-2 focus:ring-agent-100"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={!draft.trim() || sending}
          className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-agent-500 px-4 text-sm font-medium text-white transition-colors hover:bg-agent-600 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send"
        >
          <SendIcon width={15} height={15} />
          Send
        </button>
      </div>
    </div>
  );
}
