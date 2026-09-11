import { query, action } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { Linear } from "../../src/client/index.js";
import { v } from "convex/values";

const linear = new Linear(components.convexLinear, {
  apiKey: process.env.LINEAR_API_KEY!,
  webhookSecret: process.env.LINEAR_WEBHOOK_SECRET!,
});

export const createIssue = action({
  args: {
    teamId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.optional(v.number()),
    assigneeId: v.optional(v.string()),
    labelIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await linear.createIssue(ctx, args);
  },
});

export const updateIssue = action({
  args: {
    issueId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    stateId: v.optional(v.string()),
    priority: v.optional(v.number()),
    assigneeId: v.optional(v.string()),
    labelIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await linear.updateIssue(ctx, args);
    return null;
  },
});

export const createComment = action({
  args: { issueId: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    return await linear.createComment(ctx, args);
  },
});

export const archiveIssue = action({
  args: { issueId: v.string() },
  handler: async (ctx, args) => {
    await linear.archiveIssue(ctx, args);
    return null;
  },
});

export const getIssue = query({
  args: { issueId: v.string() },
  handler: async (ctx, args) => {
    return await linear.getIssue(ctx, args);
  },
});

export const listIssuesByTeam = query({
  args: { teamId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await linear.listIssuesByTeam(ctx, args);
  },
});

export const listCommentsByIssue = query({
  args: { issueId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await linear.listCommentsByIssue(ctx, args);
  },
});
