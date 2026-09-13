export function TopBanner() {
  return (
    <div className="banner">
      This example calls the real Linear GraphQL API using <code>LINEAR_API_KEY</code> (set via{" "}
      <code>npx convex env set</code>), and receives live webhook deliveries at{" "}
      <code>/webhooks/linear</code>. Actions below make real changes in Linear — use a workspace
      and team you don't mind editing.
    </div>
  );
}
