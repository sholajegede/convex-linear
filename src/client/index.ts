import { httpActionGeneric } from "convex/server";
import type { GenericActionCtx, GenericDataModel } from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";

const LINEAR_API_URL = "https://api.linear.app/graphql";
const WEBHOOK_MAX_CLOCK_SKEW_MS = 60_000;

export type LinearOptions = {
  /** A personal API key or OAuth access token for the Linear GraphQL API. */
  apiKey: string;
  webhookSecret: string;
};

export type CreateIssueArgs = {
  teamId: string;
  title: string;
  description?: string;
  priority?: number;
  assigneeId?: string;
  labelIds?: string[];
};

export type UpdateIssueArgs = {
  issueId: string;
  title?: string;
  description?: string;
  stateId?: string;
  priority?: number;
  assigneeId?: string;
  labelIds?: string[];
};

type IssueFragment = {
  id: string;
  identifier: string;
  title: string;
  description?: string | null;
  priority?: number | null;
  url: string;
  state?: { name: string } | null;
  team?: { id: string } | null;
  assignee?: { id: string; name: string } | null;
  labels?: { nodes: Array<{ name: string }> } | null;
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function issueRecordFromFragment(issue: IssueFragment) {
  return {
    issueId: issue.id,
    identifier: issue.identifier,
    teamId: issue.team?.id ?? "",
    title: issue.title,
    description: issue.description ?? undefined,
    state: issue.state?.name ?? "Unknown",
    priority: issue.priority ?? undefined,
    assigneeId: issue.assignee?.id,
    assigneeName: issue.assignee?.name,
    labels: issue.labels?.nodes.map((l) => l.name),
    url: issue.url,
  };
}

const ISSUE_FRAGMENT = `
  id
  identifier
  title
  description
  priority
  url
  state { name }
  team { id }
  assignee { id name }
  labels { nodes { name } }
`;

export class Linear {
  webhookHandler: ReturnType<typeof httpActionGeneric>;

  constructor(
    private component: ComponentApi,
    private options: LinearOptions,
  ) {
    const component_ = component;
    const webhookSecret = options.webhookSecret;

    this.webhookHandler = httpActionGeneric(async (ctx, request) => {
      const rawBody = await request.text();
      const signatureHeader = request.headers.get("linear-signature");
      const deliveryId = request.headers.get("linear-delivery");
      const eventType = request.headers.get("linear-event");
      const timestampHeader = request.headers.get("linear-timestamp");

      if (!signatureHeader || !deliveryId || !eventType) {
        return new Response(JSON.stringify({ error: "Missing Linear webhook headers" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const expected = await hmacSha256Hex(webhookSecret, rawBody);
      if (!timingSafeEqual(expected, signatureHeader)) {
        console.error("convex-linear: webhook signature mismatch");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const timestamp = timestampHeader ? Number(timestampHeader) : NaN;
      if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > WEBHOOK_MAX_CLOCK_SKEW_MS) {
        console.error("convex-linear: webhook timestamp outside allowed clock skew");
        return new Response(JSON.stringify({ error: "Stale webhook timestamp" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const payload = JSON.parse(rawBody) as Record<string, unknown>;
      const action = (payload.action as string) ?? undefined;

      const { alreadyProcessed } = await ctx.runMutation(component_.lib.checkAndRecordEvent, {
        eventId: deliveryId,
        eventType,
        action,
        payload: rawBody,
      });

      if (alreadyProcessed) {
        return new Response(JSON.stringify({ success: true, duplicate: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const data = payload.data as Record<string, unknown> | undefined;

      if (eventType === "Issue" && data) {
        if (action === "remove") {
          await ctx.runMutation(component_.lib.removeIssue, { issueId: String(data.id) });
        } else {
          const team = data.team as Record<string, unknown> | undefined;
          const state = data.state as Record<string, unknown> | undefined;
          const assignee = data.assignee as Record<string, unknown> | undefined;
          const labels = data.labels as Array<Record<string, unknown>> | undefined;

          await ctx.runMutation(component_.lib.recordIssue, {
            issueId: String(data.id),
            identifier: String(data.identifier ?? ""),
            teamId: (team?.id as string) ?? String(data.teamId ?? ""),
            title: (data.title as string) ?? "",
            description: (data.description as string) ?? undefined,
            state: (state?.name as string) ?? "Unknown",
            priority: (data.priority as number) ?? undefined,
            assigneeId: (assignee?.id as string) ?? undefined,
            assigneeName: (assignee?.name as string) ?? undefined,
            labels: Array.isArray(labels) ? labels.map((l) => l.name as string) : undefined,
            url: (data.url as string) ?? "",
          });
        }
      } else if (eventType === "Comment" && data) {
        if (action !== "remove") {
          const issue = data.issue as Record<string, unknown> | undefined;
          const user = data.user as Record<string, unknown> | undefined;

          await ctx.runMutation(component_.lib.recordComment, {
            commentId: String(data.id),
            issueId: (issue?.id as string) ?? String(data.issueId ?? ""),
            body: (data.body as string) ?? "",
            userId: (user?.id as string) ?? undefined,
            userName: (user?.name as string) ?? undefined,
          });
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
  }

  private headers(): Record<string, string> {
    // Linear personal API keys are sent as-is in the Authorization header —
    // unlike OAuth access tokens, they do NOT take a "Bearer " prefix.
    return {
      "Content-Type": "application/json",
      Authorization: this.options.apiKey,
    };
  }

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await fetch(LINEAR_API_URL, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ query, variables }),
    });
    const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (!res.ok || json.errors) {
      const message = json.errors?.map((e) => e.message).join("; ") ?? res.statusText;
      throw new Error(`Linear API error: ${message}`);
    }
    return json.data as T;
  }

  async createIssue(
    ctx: GenericActionCtx<GenericDataModel>,
    args: CreateIssueArgs,
  ): Promise<{ identifier: string; url: string }> {
    const data = await this.graphql<{
      issueCreate: { success: boolean; issue: IssueFragment };
    }>(
      `mutation IssueCreate($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { ${ISSUE_FRAGMENT} }
        }
      }`,
      {
        input: {
          teamId: args.teamId,
          title: args.title,
          description: args.description,
          priority: args.priority,
          assigneeId: args.assigneeId,
          labelIds: args.labelIds,
        },
      },
    );

    if (!data.issueCreate.success) {
      throw new Error("Linear API error: issueCreate did not succeed");
    }

    const issue = data.issueCreate.issue;
    await ctx.runMutation(this.component.lib.recordIssue, issueRecordFromFragment(issue));

    return { identifier: issue.identifier, url: issue.url };
  }

  async updateIssue(
    ctx: GenericActionCtx<GenericDataModel>,
    args: UpdateIssueArgs,
  ): Promise<void> {
    const { issueId, ...rest } = args;
    const data = await this.graphql<{
      issueUpdate: { success: boolean; issue: IssueFragment };
    }>(
      `mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue { ${ISSUE_FRAGMENT} }
        }
      }`,
      {
        id: issueId,
        input: {
          title: rest.title,
          description: rest.description,
          stateId: rest.stateId,
          priority: rest.priority,
          assigneeId: rest.assigneeId,
          labelIds: rest.labelIds,
        },
      },
    );

    if (!data.issueUpdate.success) {
      throw new Error("Linear API error: issueUpdate did not succeed");
    }

    await ctx.runMutation(
      this.component.lib.recordIssue,
      issueRecordFromFragment(data.issueUpdate.issue),
    );
  }

  async createComment(
    ctx: GenericActionCtx<GenericDataModel>,
    args: { issueId: string; body: string },
  ): Promise<{ id: string }> {
    const data = await this.graphql<{
      commentCreate: {
        success: boolean;
        comment: {
          id: string;
          body: string;
          issue: { id: string };
          user?: { id: string; name: string } | null;
        };
      };
    }>(
      `mutation CommentCreate($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment {
            id
            body
            issue { id }
            user { id name }
          }
        }
      }`,
      { input: { issueId: args.issueId, body: args.body } },
    );

    if (!data.commentCreate.success) {
      throw new Error("Linear API error: commentCreate did not succeed");
    }

    const comment = data.commentCreate.comment;
    await ctx.runMutation(this.component.lib.recordComment, {
      commentId: comment.id,
      issueId: comment.issue.id,
      body: comment.body,
      userId: comment.user?.id,
      userName: comment.user?.name,
    });

    return { id: comment.id };
  }

  async archiveIssue(
    ctx: GenericActionCtx<GenericDataModel>,
    args: { issueId: string },
  ): Promise<void> {
    const data = await this.graphql<{ issueArchive: { success: boolean } }>(
      `mutation IssueArchive($id: String!) {
        issueArchive(id: $id) {
          success
        }
      }`,
      { id: args.issueId },
    );

    if (!data.issueArchive.success) {
      throw new Error("Linear API error: issueArchive did not succeed");
    }

    await ctx.runMutation(this.component.lib.removeIssue, { issueId: args.issueId });
  }

  async getIssue(ctx: RunQueryCtx, args: { issueId: string }) {
    return await ctx.runQuery(this.component.lib.getIssue, args);
  }

  async listIssuesByTeam(ctx: RunQueryCtx, args: { teamId: string; limit?: number }) {
    return await ctx.runQuery(this.component.lib.listIssuesByTeam, args);
  }

  async listCommentsByIssue(ctx: RunQueryCtx, args: { issueId: string; limit?: number }) {
    return await ctx.runQuery(this.component.lib.listCommentsByIssue, args);
  }
}

type RunQueryCtx = {
  runQuery: GenericActionCtx<GenericDataModel>["runQuery"];
};
