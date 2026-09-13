export function formatTime(ms: number): string {
  const date = new Date(ms);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Linear's states are team-defined free text, not a fixed enum, so this is a
// best-effort heuristic over common default workflow names — good enough to
// pick a status icon for a demo, not a substitute for reading the real state.
export type StateKind = "backlog" | "todo" | "in-progress" | "done" | "canceled";

export function stateKind(state: string): StateKind {
  const s = state.toLowerCase();
  if (s.includes("progress") || s.includes("review")) return "in-progress";
  if (s.includes("done") || s.includes("complete") || s.includes("merged")) return "done";
  if (s.includes("cancel") || s.includes("duplicate") || s.includes("wontfix") || s.includes("won't fix")) {
    return "canceled";
  }
  if (s.includes("backlog") || s.includes("triage")) return "backlog";
  return "todo";
}

// Linear's own priority scale: 0 none, 1 urgent, 2 high, 3 normal, 4 low —
// lower number is MORE urgent.
export function priorityClass(priority: number | undefined): string {
  switch (priority) {
    case 1:
      return "p-urgent";
    case 2:
      return "p-high";
    case 3:
      return "p-normal";
    case 4:
      return "p-low";
    default:
      return "p-none";
  }
}

export function priorityLabel(priority: number | undefined): string {
  switch (priority) {
    case 0:
      return "No priority";
    case 1:
      return "Urgent";
    case 2:
      return "High";
    case 3:
      return "Normal";
    case 4:
      return "Low";
    default:
      return "No priority";
  }
}
