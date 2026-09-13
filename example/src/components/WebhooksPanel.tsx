import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatTime, truncate } from "../lib/format";
import { Card, Badge, Empty } from "./ui";

export function WebhooksPanel() {
  const events = useQuery(api.example.listRecentWebhookEvents, { limit: 30 });

  return (
    <Card
      title="Webhook deliveries"
      desc="Every Issue and Comment delivery Linear has sent this deployment, verified and deduplicated by Linear-Delivery before anything is written."
    >
      {events && events.length === 0 && <Empty>No webhook deliveries recorded yet.</Empty>}
      {events && events.length > 0 && (
        <ul className="obs-list">
          {events.map((e) => (
            <li key={e._id} className="obs-item">
              <div className="obs-top">
                <span className="mono">{e.eventType}</span>
                <span>
                  {e.action && <Badge tone={e.action === "remove" ? "bad" : "neutral"}>{e.action}</Badge>}{" "}
                  {formatTime(e.receivedAt)}
                </span>
              </div>
              <div className="obs-io">{truncate(e.payload, 260)}</div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
