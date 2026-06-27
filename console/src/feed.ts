// Live feed from the bridge. Fetches the brain once, then re-fetches whenever the
// bridge reports a change (Server-Sent Events). Read-only.

import { setBrain } from "./mockData";

export async function loadBrain(): Promise<void> {
  try {
    const res = await fetch("/api/brain");
    setBrain(await res.json());
  } catch {
    // The bridge is not running yet; the UI renders empty until it is.
  }
}

export function subscribeBrain(onChange: () => void): () => void {
  let es: EventSource | null = null;
  try {
    es = new EventSource("/api/events");
    es.onmessage = () => {
      loadBrain().then(onChange);
    };
  } catch {
    // SSE unavailable; a manual reload still picks up changes.
  }
  return () => es?.close();
}
