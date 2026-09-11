import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import "./App.css";

export default function App() {
  const [teamId, setTeamId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  const createIssue = useAction(api.example.createIssue);
  const issues = useQuery(
    api.example.listIssuesByTeam,
    teamId ? { teamId } : "skip",
  );

  async function submit() {
    const result = await createIssue({
      teamId,
      title,
      description: description || undefined,
    });
    setCreatedUrl(result.url);
    setTitle("");
    setDescription("");
  }

  return (
    <main className="app">
      <h1>convex-linear</h1>
      <p>
        Sync Linear issues into Convex reactively, and create, update, and
        comment on issues from Convex functions.
      </p>

      <label>
        Team ID
        <input
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          placeholder="team_..."
        />
      </label>

      <label>
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ship the launch checklist"
        />
      </label>

      <label>
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional details..."
        />
      </label>

      <button onClick={submit} disabled={!teamId || !title}>
        Create issue
      </button>

      {createdUrl && (
        <p>
          Created:{" "}
          <a href={createdUrl} target="_blank" rel="noreferrer">
            {createdUrl}
          </a>
        </p>
      )}

      {issues && issues.length > 0 && (
        <ul>
          {issues.map((issue) => (
            <li key={issue._id}>
              {issue.identifier} {issue.title} — <strong>{issue.state}</strong>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
