import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  issues: defineTable({
    issueId: v.string(), // Linear's UUID
    identifier: v.string(), // e.g. "ENG-123"
    teamId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    state: v.string(), // Linear workflow state name (team-defined, not a fixed enum)
    priority: v.optional(v.number()), // Linear's own scale: 0 none, 1 urgent, 2 high, 3 normal, 4 low
    assigneeId: v.optional(v.string()),
    assigneeName: v.optional(v.string()),
    labels: v.optional(v.array(v.string())),
    url: v.string(),
    // Set from Issue.archivedAt when Linear archives the issue (via the webhook or
    // archiveIssue()) — archived issues are kept, not deleted, so a stale local
    // mirror never quietly diverges from what's actually in Linear.
    archivedAt: v.optional(v.number()),
    // Linear's own "moved to trash" flag — distinct from archivedAt. A
    // trashed issue is still recoverable for 30 days (and its own webhook
    // delivery arrives as an "update", not "remove" — see client/index.ts).
    trashed: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_issueId", ["issueId"])
    .index("by_teamId", ["teamId"]),

  comments: defineTable({
    commentId: v.string(), // Linear's UUID
    issueId: v.string(),
    body: v.string(),
    userId: v.optional(v.string()),
    userName: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_commentId", ["commentId"])
    .index("by_issueId", ["issueId"]),

  webhookEvents: defineTable({
    eventId: v.string(),
    eventType: v.string(), // Linear-Event: "Issue" | "Comment" | ...
    // payload.action: "create" | "update" | "remove" | "restore" — NOTE: for
    // Issue events this does not reliably indicate archived vs trashed vs
    // deleted (see client/index.ts); it's recorded here only for auditing.
    action: v.optional(v.string()),
    payload: v.string(),
    receivedAt: v.number(),
  }).index("by_eventId", ["eventId"]),
});
