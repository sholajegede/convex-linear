import { Card } from "./ui";

const STEPS: Array<{ title: string; body: string }> = [
  {
    title: "Call a Convex action",
    body: "Your app calls createIssue, updateIssue, createComment, archiveIssue, or unarchiveIssue from a Convex action or mutation.",
  },
  {
    title: "Linear responds immediately",
    body: "The action talks to Linear's GraphQL API directly and writes the result into Convex's own tables right away, so your UI updates without waiting on a webhook.",
  },
  {
    title: "Linear also sends a webhook",
    body: 'Every change — including ones made outside your app, like an edit in Linear’s own UI — arrives at /webhooks/linear, deduplicated by its Linear-Delivery header before anything is written.',
  },
  {
    title: "Ground truth wins over action strings",
    body: 'For Issue events, the handler doesn’t trust Linear’s action field: archiving an issue actually sends "remove", the same value you’d expect for a delete. Instead, it re-fetches the issue from Linear’s API on every delivery.',
  },
  {
    title: "Reconcile, don't guess",
    body: "If that re-fetch finds the issue, it's upserted with its current archived/trashed state; only when Linear says the issue no longer exists at all is the local row deleted.",
  },
];

const FEATURES: Array<{ title: string; body: string }> = [
  {
    title: "Issues",
    body: "Create, update, archive, and restore issues, mirrored into a reactive Convex table.",
  },
  {
    title: "Comments",
    body: "Post comments on any issue from an action, and read them back live.",
  },
  {
    title: "Archive & trash aware",
    body: "Reflects Linear's real archived and trashed state, not a guess from the webhook's action field.",
  },
  {
    title: "Webhook events",
    body: "Every Issue and Comment delivery is recorded for auditing, deduplicated automatically.",
  },
];

const CODE_SNIPPET = `const linear = new Linear(components.convexLinear, {
  apiKey: process.env.LINEAR_API_KEY!,
  webhookSecret: process.env.LINEAR_WEBHOOK_SECRET!,
});

export const fileIssue = action({
  args: { teamId: v.string(), title: v.string() },
  handler: async (ctx, args) => {
    return await linear.createIssue(ctx, args);
  },
});`;

export function Overview() {
  return (
    <>
      <Card
        title="How it works"
        desc="Linear's webhook action field doesn't reliably say whether an issue was archived, trashed, or deleted — so this component doesn't trust it."
      >
        <ol className="steps">
          {STEPS.map((step, i) => (
            <li className="step" key={step.title}>
              <span className="step-num">{i + 1}</span>
              <div className="step-text">
                <strong>{step.title}</strong>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card title="What this component gives you">
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div className="feature" key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Quick start" desc="Wire it up once in convex/linear.ts, then call it from any action.">
        <pre className="code-block">{CODE_SNIPPET}</pre>
      </Card>
    </>
  );
}
