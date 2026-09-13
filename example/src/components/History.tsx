import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { relativeTime } from "../lib/format";
import { Card, Badge, Button, Empty, StatusIcon, PriorityBars } from "./ui";

export function History(props: { onFileFollowUp: (title: string) => void }) {
  const issues = useQuery(api.example.listRecentIssues, { limit: 20 });
  const comments = useQuery(api.example.listRecentComments, { limit: 20 });

  return (
    <>
      <Card title="Recent issues" desc="The most recently updated issues across every team this deployment has seen.">
        {issues && issues.length === 0 && <Empty>Nothing recorded yet.</Empty>}
        {issues && issues.length > 0 && (
          <ul className="issue-list">
            {issues.map((issue) => (
              <li key={issue._id} className={`issue-item${issue.archivedAt !== undefined ? " archived" : ""}`}>
                <div className="issue-top">
                  <div className="issue-top-left">
                    <StatusIcon state={issue.state} />
                    <a className="issue-title" href={issue.url} target="_blank" rel="noreferrer">
                      {issue.identifier} {issue.title}
                    </a>
                  </div>
                  <div className="issue-badges">
                    {issue.archivedAt !== undefined && <Badge tone="pending">archived</Badge>}
                    {issue.trashed && <Badge tone="bad">trashed</Badge>}
                  </div>
                </div>
                <div className="issue-meta">
                  <span>{issue.state}</span>
                  <span>·</span>
                  <PriorityBars priority={issue.priority} />
                  <span>·</span>
                  <span>updated {relativeTime(issue.updatedAt)}</span>
                </div>
                <div className="issue-actions">
                  <Button variant="secondary" onClick={() => props.onFileFollowUp(`Follow-up: ${issue.title}`)}>
                    🔁 File follow-up issue
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Recent comments" desc="The most recently updated comments across every issue this deployment has seen.">
        {comments && comments.length === 0 && <Empty>Nothing recorded yet.</Empty>}
        {comments && comments.length > 0 && (
          <ul className="comment-list" style={{ borderTop: "none", padding: 0, margin: 0 }}>
            {comments.map((c) => (
              <li key={c._id} className="comment-item">
                <strong>{c.userName ?? "Someone"}</strong> · {relativeTime(c.updatedAt)}
                <div>{c.body}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
