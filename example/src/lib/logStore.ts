export type LogEntry = {
  id: number;
  title: string;
  detail?: string;
  status: "ok" | "err";
  at: number;
};

let entries: LogEntry[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getEntries(): LogEntry[] {
  return entries;
}

export function log(title: string, status: "ok" | "err", detail?: string) {
  entries = [{ id: nextId++, title, detail, status, at: Date.now() }, ...entries].slice(0, 200);
  emit();
}

/** Wrap an async action so every call logs a uniform success/error entry. */
export async function withLog<T>(title: string, fn: () => Promise<T>): Promise<T> {
  try {
    const result = await fn();
    log(title, "ok", summarize(result));
    return result;
  } catch (err) {
    log(title, "err", err instanceof Error ? err.message : String(err));
    throw err;
  }
}

function summarize(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value;
  try {
    const json = JSON.stringify(value);
    return json.length > 240 ? json.slice(0, 240) + "…" : json;
  } catch {
    return undefined;
  }
}
