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
  },
  returns: v.id("issues"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("issues")
      .withIndex("by_issueId", (q) => q.eq("issueId", args.issueId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
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
