import { useState } from "react";
import { Header } from "./components/Header";
import { Overview } from "./components/Overview";
import type { Tab } from "./components/Header";
import { TopBanner } from "./components/TopBanner";
import { IssuesPanel } from "./components/IssuesPanel";
import { WebhooksPanel } from "./components/WebhooksPanel";
import { History } from "./components/History";
import { Console } from "./components/Console";
import "./theme.css";

export default function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [teamId, setTeamId] = useState("");
  // A fresh nonce forces IssuesPanel to remount (and pick up a new initial
  // title) whenever a follow-up is filed, without syncing props into state.
  const [followUp, setFollowUp] = useState<{ title: string; nonce: number } | null>(null);

  function addTeam(id: string) {
    setTeamIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setTeamId(id);
  }

  function fileFollowUp(title: string) {
    setFollowUp({ title, nonce: Date.now() });
    setTab("issues");
  }

  return (
    <div className="shell">
      <div className="main">
        <Header
          tab={tab}
          onTab={setTab}
          teamId={teamId}
          teamIds={teamIds}
          onSelectTeam={setTeamId}
          onAddTeam={addTeam}
        />
        <TopBanner />
        {tab === "overview" && <Overview />}
        {tab === "issues" && (
          <IssuesPanel key={followUp?.nonce ?? "default"} teamId={teamId} prefillTitle={followUp?.title} />
        )}
        {tab === "webhooks" && <WebhooksPanel />}
        {tab === "history" && <History onFileFollowUp={fileFollowUp} />}
      </div>
      <Console />
    </div>
  );
}
