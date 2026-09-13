import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

const issueValidator = v.object({
  _id: v.id("issues"),
  _creationTime: v.number(),
  issueId: v.string(),
  identifier: v.string(),
  teamId: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  state: v.string(),
  priority: v.optional(v.number()),
  assigneeId: v.optional(v.string()),
  assigneeName: v.optional(v.string()),
  labels: v.optional(v.array(v.string())),
  url: v.string(),
  archivedAt: v.optional(v.number()),
  trashed: v.optional(v.boolean()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const commentValidator = v.object({
  _id: v.id("comments"),
  _creationTime: v.number(),
  commentId: v.string(),
  issueId: v.string(),
  body: v.string(),
  userId: v.optional(v.string()),
  userName: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// ─── Queries ────────────────────────────────────────────────────────────────

export const getIssue = query({
  args: { issueId: v.string() },
  returns: v.union(v.null(), issueValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("issues")
      .withIndex("by_issueId", (q) => q.eq("issueId", args.issueId))
      .first();
  },
});

export const listIssuesByTeam = query({
  args: { teamId: v.string(), limit: v.optional(v.number()) },
  returns: v.array(issueValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("issues")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const listCommentsByIssue = query({
  args: { issueId: v.string(), limit: v.optional(v.number()) },
  returns: v.array(commentValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("comments")
      .withIndex("by_issueId", (q) => q.eq("issueId", args.issueId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

export const recordIssue = mutation({
  args: {
    issueId: v.string(),
    identifier: v.string(),
    teamId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    state: v.string(),
    priority: v.optional(v.number()),
    assigneeId: v.optional(v.string()),
    assigneeName: v.optional(v.string()),
    labels: v.optional(v.array(v.string())),
    url: v.string(),
    archivedAt: v.optional(v.number()),
    trashed: v.optional(v.boolean()),
  },
  returns: v.id("issues"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("issues")
      .withIndex("by_issueId", (q) => q.eq("issueId", args.issueId))
      .first();

    if (existing) {
      // recordIssue is always called with a full, fresh snapshot from
      // Linear (see issueRecordFromFragment in client/index.ts) — so every
      // optional field is listed explicitly here, even when its value is
      // undefined. A bare `...args` spread silently keeps whatever was
      // already stored for a field Linear no longer reports (an unassigned
      // issue, a cleared label list, a restored-from-trash issue), because
      // an omitted optional argument never appears as a key on `args` at
      // all — so spreading it into patch() doesn't touch the old value.
      // Naming the field here forces the key to exist, which is what makes
      // Convex's patch() actually clear it.
      await ctx.db.patch(existing._id, {
        identifier: args.identifier,
        teamId: args.teamId,
        title: args.title,
        description: args.description,
        state: args.state,
        priority: args.priority,
        assigneeId: args.assigneeId,
        assigneeName: args.assigneeName,
        labels: args.labels,
        url: args.url,
        archivedAt: args.archivedAt,
        trashed: args.trashed,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("issues", { ...args, createdAt: now, updatedAt: now });
  },
});

export const recordComment = mutation({
  args: {
    commentId: v.string(),
    issueId: v.string(),
    body: v.string(),
    userId: v.optional(v.string()),
    userName: v.optional(v.string()),
  },
  returns: v.id("comments"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("comments")
      .withIndex("by_commentId", (q) => q.eq("commentId", args.commentId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return existing._id;
    }

    return await ctx.db.insert("comments", { ...args, createdAt: now, updatedAt: now });
  },
});

export const removeIssue = mutation({
  args: { issueId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("issues")
      .withIndex("by_issueId", (q) => q.eq("issueId", args.issueId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

// Marks an issue archived (or restores it, when archivedAt is null) without
// deleting the local row. Linear's own archive is a soft-hide (restorable via
// issueUnarchive), so the local mirror should reflect that instead of
// disappearing the issue entirely — removeIssue() stays reserved for Linear's
// actual delete/remove events.
export const setIssueArchived = mutation({
  args: { issueId: v.string(), archivedAt: v.union(v.number(), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("issues")
      .withIndex("by_issueId", (q) => q.eq("issueId", args.issueId))
      .first();
    if (!existing) {
      return null;
    }
    await ctx.db.patch(existing._id, {
      archivedAt: args.archivedAt ?? undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ─── Dashboard queries ──────────────────────────────────────────────────────
// These do full, un-indexed scans across every issue/comment/event the
// component has ever recorded, on purpose — they power a demo's stats bar
// and activity history, not high-volume production use.

export const getStats = query({
  args: {},
  returns: v.object({
    issueCount: v.number(),
    archivedCount: v.number(),
    commentCount: v.number(),
    webhookEventCount: v.number(),
  }),
  handler: async (ctx) => {
    const [issues, comments, webhookEvents] = await Promise.all([
      ctx.db.query("issues").collect(),
      ctx.db.query("comments").collect(),
      ctx.db.query("webhookEvents").collect(),
    ]);
    return {
      issueCount: issues.length,
      archivedCount: issues.filter((issue) => issue.archivedAt !== undefined).length,
      commentCount: comments.length,
      webhookEventCount: webhookEvents.length,
    };
  },
});

export const listRecentIssues = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(issueValidator),
  handler: async (ctx, args) => {
    const issues = await ctx.db.query("issues").collect();
    return issues.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, args.limit ?? 20);
  },
});

export const listRecentComments = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(commentValidator),
  handler: async (ctx, args) => {
    const comments = await ctx.db.query("comments").collect();
    return comments.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, args.limit ?? 20);
  },
});

export const listRecentWebhookEvents = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("webhookEvents"),
      _creationTime: v.number(),
      eventId: v.string(),
      eventType: v.string(),
      action: v.optional(v.string()),
      payload: v.string(),
      receivedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const events = await ctx.db.query("webhookEvents").collect();
    return events.sort((a, b) => b.receivedAt - a.receivedAt).slice(0, args.limit ?? 20);
  },
});

export const checkAndRecordEvent = mutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    action: v.optional(v.string()),
    payload: v.string(),
  },
  returns: v.object({ alreadyProcessed: v.boolean() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("webhookEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .first();
    if (existing) {
      return { alreadyProcessed: true };
    }
    await ctx.db.insert("webhookEvents", { ...args, receivedAt: Date.now() });
    return { alreadyProcessed: false };
  },
});
