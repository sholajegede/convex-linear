import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { withLog } from "../lib/logStore";
import { relativeTime, priorityLabel } from "../lib/format";
import { Card, Field, TextInput, TextArea, Select, Button, Badge, Empty, StatusIcon, PriorityBars } from "./ui";

type Issue = {
  _id: string;
  issueId: string;
  identifier: string;
  title: string;
  description?: string;
  state: string;
  priority?: number;
  url: string;
  archivedAt?: number;
  trashed?: boolean;
  updatedAt: number;
};

function IssueComments(props: { issueId: string }) {
  const comments = useQuery(api.example.listCommentsByIssue, { issueId: props.issueId, limit: 20 });
  const createComment = useAction(api.example.createComment);
  const [body, setBody] = useState("");

  async function submit() {
    if (!body.trim()) return;
    await withLog(`createComment(${props.issueId.slice(0, 8)}…)`, () =>
      createComment({ issueId: props.issueId, body }),
    );
    setBody("");
  }

  return (
    <div>
      {comments && comments.length > 0 && (
        <ul className="comment-list">
          {comments.map((c) => (
            <li key={c._id} className="comment-item">
              <strong>{c.userName ?? "Someone"}</strong> · {relativeTime(c.updatedAt)}
              <div>{c.body}</div>
            </li>
          ))}
        </ul>
      )}
      <div className="issue-actions" style={{ marginTop: "0.5rem" }}>
        <TextInput
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add a comment…"
        />
        <Button variant="secondary" onClick={submit} disabled={!body.trim()}>
          Comment
        </Button>
      </div>
    </div>
  );
}

function IssueItem(props: { issue: Issue }) {
  const { issue } = props;
  const updateIssue = useAction(api.example.updateIssue);
  const archiveIssue = useAction(api.example.archiveIssue);
  const unarchiveIssue = useAction(api.example.unarchiveIssue);
  const [expanded, setExpanded] = useState(false);
  const archived = issue.archivedAt !== undefined;

  async function reprioritize(priority: number) {
    await withLog(`updateIssue(${issue.identifier})`, () => updateIssue({ issueId: issue.issueId, priority }));
  }

  async function toggleArchive() {
    if (archived) {
      await withLog(`unarchiveIssue(${issue.identifier})`, () => unarchiveIssue({ issueId: issue.issueId }));
    } else {
      await withLog(`archiveIssue(${issue.identifier})`, () => archiveIssue({ issueId: issue.issueId }));
    }
  }

  return (
    <li className={`issue-item${archived ? " archived" : ""}`}>
      <div className="issue-top">
        <div className="issue-top-left">
          <StatusIcon state={issue.state} />
          <a className="issue-title" href={issue.url} target="_blank" rel="noreferrer">
            {issue.identifier} {issue.title}
          </a>
        </div>
        <div className="issue-badges">
          {archived && <Badge tone="pending">archived</Badge>}
          {issue.trashed && <Badge tone="bad">trashed</Badge>}
        </div>
      </div>
      <div className="issue-meta">
        <span>{issue.state}</span>
        <span>·</span>
        <PriorityBars priority={issue.priority} />
        <span>{priorityLabel(issue.priority)}</span>
        <span>·</span>
        <span>updated {relativeTime(issue.updatedAt)}</span>
      </div>
      <div className="issue-actions">
        <Select
          value={String(issue.priority ?? 0)}
          onChange={(e) => reprioritize(Number(e.target.value))}
        >
          <option value="0">No priority</option>
          <option value="1">Urgent</option>
          <option value="2">High</option>
          <option value="3">Normal</option>
          <option value="4">Low</option>
        </Select>
        <Button variant="secondary" onClick={toggleArchive}>
          {archived ? "Restore" : "Archive"}
        </Button>
        <Button variant="secondary" onClick={() => setExpanded((e) => !e)}>
          {expanded ? "Hide comments" : "Comments"}
        </Button>
      </div>
      {expanded && <IssueComments issueId={issue.issueId} />}
    </li>
  );
}

// Mount this with a `key` that changes whenever `prefillTitle` changes (see
// App.tsx) so a fresh follow-up title starts a fresh, remounted form instead
// of syncing props into state inside an effect.
export function IssuesPanel(props: { teamId: string; prefillTitle?: string }) {
  const [title, setTitle] = useState(props.prefillTitle ?? "");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("0");
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  const createIssue = useAction(api.example.createIssue);
  const issues = useQuery(api.example.listIssuesByTeam, props.teamId ? { teamId: props.teamId, limit: 50 } : "skip");

  async function submit() {
    if (!props.teamId || !title.trim()) return;
    const result = await withLog("createIssue", () =>
      createIssue({
        teamId: props.teamId,
        title,
        description: description || undefined,
        priority: Number(priority),
      }),
    );
    setCreatedUrl(result.url);
    setTitle("");
    setDescription("");
    setPriority("0");
  }

  return (
    <>
      <Card
        title="Create an issue"
        desc="Files a real issue in Linear via createIssue, and records it in Convex immediately — no need to wait for the webhook."
      >
        {!props.teamId && <Empty>Connect a team on the Overview tab to create issues.</Empty>}
        <Field label="Title">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ship the launch checklist" />
        </Field>
        <Field label="Description (optional)">
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details…"
          />
        </Field>
        <Field label="Priority">
          <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="0">No priority</option>
            <option value="1">Urgent</option>
            <option value="2">High</option>
            <option value="3">Normal</option>
            <option value="4">Low</option>
          </Select>
        </Field>
        <Button onClick={submit} disabled={!props.teamId || !title.trim()}>
          Create issue
        </Button>
        {createdUrl && (
          <p className="empty">
            Created:{" "}
            <a className="issue-title" href={createdUrl} target="_blank" rel="noreferrer">
              {createdUrl}
            </a>
          </p>
        )}
      </Card>

      <Card title="Issues" desc="Live from this team's Convex mirror — updates the instant a webhook lands.">
        {!props.teamId && <Empty>Connect a team on the Overview tab to see its issues.</Empty>}
        {props.teamId && issues && issues.length === 0 && <Empty>No issues yet for this team.</Empty>}
        {issues && issues.length > 0 && (
          <ul className="issue-list">
            {issues.map((issue) => (
              <IssueItem key={issue._id} issue={issue} />
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
