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
    priority: v.optional(v.number()), // 0 (none) - 4 (urgent)
    assigneeId: v.optional(v.string()),
    assigneeName: v.optional(v.string()),
    labels: v.optional(v.array(v.string())),
    url: v.string(),
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
    action: v.optional(v.string()), // payload.action: "create" | "update" | "remove"
    payload: v.string(),
    receivedAt: v.number(),
  }).index("by_eventId", ["eventId"]),
});
