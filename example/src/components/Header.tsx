import { useEffect, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Chip, TextInput, Button } from "./ui";

export type Tab = "overview" | "issues" | "webhooks" | "history";

/** The "your app <-> Convex <-> Linear" call path, and Linear's own
 * workflow-state icons as a compact legend underneath — one boxed widget,
 * no explanatory paragraph (that's already covered by the banner below the
 * hero, so it isn't repeated here). */
function FlowWidget() {
  const states: Array<{ cls: string; label: string }> = [
    { cls: "backlog", label: "Backlog" },
    { cls: "todo", label: "Todo" },
    { cls: "in-progress", label: "In Progress" },
    { cls: "done", label: "Done" },
    { cls: "canceled", label: "Canceled" },
  ];
  return (
    <div className="hero-widget">
      <div
        className="flow"
        aria-label="your app talks to Convex, which talks to Linear over GraphQL and webhooks, and mirrors state back reactively"
      >
        <span className="flow-node">your app</span>
        <span className="flow-arrow">⇄</span>
        <span className="flow-node hub">Convex</span>
        <span className="flow-arrow">⇄</span>
        <span className="flow-node accent">Linear</span>
      </div>
      <div className="state-rail" aria-hidden="true">
        {states.map((s) => (
          <span key={s.cls} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            <span className={`status-icon ${s.cls} rail-icon`}>
              {s.cls === "done" ? "✓" : s.cls === "canceled" ? "✕" : ""}
            </span>
            <span className="rail-label">{s.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** A single labeled number in the overview strip. */
function Stat(props: { value: number | undefined; label: string }) {
  return (
    <div className="stat">
      <strong>{props.value ?? "…"}</strong>
      <span>{props.label}</span>
    </div>
  );
}

type Team = { id: string; name: string; key: string };

function TeamPicker(props: { onConnect: (teamId: string) => void }) {
  const listTeams = useAction(api.example.listTeams);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listTeams({})
      .then((result) => {
        if (!cancelled) setTeams(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return <p className="error-text">Couldn't load teams — {error}</p>;
  }
  if (!teams) {
    return <p className="empty">Loading your Linear teams…</p>;
  }
  if (teams.length === 0) {
    return <p className="empty">No teams found in this workspace.</p>;
  }
  return (
    <div className="team-switch">
      {teams.map((t) => (
        <Chip key={t.id} onClick={() => props.onConnect(t.id)}>
          {t.key} · {t.name}
        </Chip>
      ))}
    </div>
  );
}

function ConnectTeam(props: { onConnect: (teamId: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Enter a Linear team ID");
      return;
    }
    setError(null);
    props.onConnect(trimmed);
    setValue("");
  }

  return (
    <div className="connect-repo">
      <TextInput
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="or paste a team UUID directly"
      />
      <Button variant="secondary" onClick={submit} disabled={!value.trim()}>
        Connect
      </Button>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

export function Header(props: {
  tab: Tab;
  onTab: (t: Tab) => void;
  teamId: string;
  teamIds: string[];
  onSelectTeam: (teamId: string) => void;
  onAddTeam: (teamId: string) => void;
}) {
  const stats = useQuery(api.example.getStats);

  return (
    <div className="hero-frame">
      {/* Top bar: brand + section nav only — kept plain, like Convex's own
          site nav, instead of also carrying the stat numbers. */}
      <div className="hero-nav">
        <div className="hero-nav-brand">
          <span className="logo-mark" aria-hidden="true" />
          convex-linear
        </div>
        <nav className="hero-nav-links">
          <button
            className={`nav-tab${props.tab === "overview" ? " active" : ""}`}
            onClick={() => props.onTab("overview")}
          >
            Overview
          </button>
          <button
            className={`nav-tab${props.tab === "issues" ? " active" : ""}`}
            onClick={() => props.onTab("issues")}
          >
            Issues
          </button>
          <button
            className={`nav-tab${props.tab === "webhooks" ? " active" : ""}`}
            onClick={() => props.onTab("webhooks")}
          >
            Webhooks
          </button>
          <button
            className={`nav-tab${props.tab === "history" ? " active" : ""}`}
            onClick={() => props.onTab("history")}
          >
            History
          </button>
        </nav>
      </div>

      {/* The live counts are a tracker, not a page — they stay visible no
          matter which tab you're on. Only the pitch/connect/flow content
          below belongs to the Overview tab specifically. */}
      <div className="hero-overview">
        <div className="hero-overview-stats">
          <Stat value={stats?.issueCount} label="issues" />
          <Stat value={stats?.archivedCount} label="archived" />
          <Stat value={stats?.commentCount} label="comments" />
          <Stat value={stats?.webhookEventCount} label="webhooks" />
        </div>
      </div>

      {props.tab === "overview" && (
        <>
          <div className="hero-grid">
            <div className="hero-copy">
              <span className="convex-badge">Convex Component · Linear Integration</span>
              <h1 className="hero-title">
                Sync <span className="hl">Linear</span> into Convex, reactively
              </h1>
              <p className="hero-sub">
                Issues and comments mirrored live by webhook, driven from Convex actions.
              </p>

              {props.teamIds.length > 0 && (
                <div className="team-switch">
                  {props.teamIds.map((t) => (
                    <Chip key={t} active={props.teamId === t} onClick={() => props.onSelectTeam(t)}>
                      {t}
                    </Chip>
                  ))}
                </div>
              )}
              <div className="hero-connect">
                <TeamPicker onConnect={props.onAddTeam} />
                <ConnectTeam onConnect={props.onAddTeam} />
              </div>
            </div>

            <FlowWidget />
          </div>
        </>
      )}
    </div>
  );
}
