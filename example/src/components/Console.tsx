import { useEffect, useRef, useSyncExternalStore } from "react";
import { subscribe, getEntries } from "../lib/logStore";
import { formatTime } from "../lib/format";

export function Console() {
  const entries = useSyncExternalStore(subscribe, getEntries);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  return (
    <aside className="console">
      <div className="console-header">
        <h3>Activity</h3>
        <p>Every action call made from this demo, in order, with its result or error.</p>
      </div>
      <div className="console-log" ref={logRef}>
        {[...entries].reverse().map((entry) => (
          <div key={entry.id} className={`log-entry ${entry.status}`}>
            <div className="log-top">
              <span className="log-title">{entry.title}</span>
              <span>{formatTime(entry.at)}</span>
            </div>
            {entry.detail && <div className="log-detail">{entry.detail}</div>}
          </div>
        ))}
      </div>
    </aside>
  );
}
