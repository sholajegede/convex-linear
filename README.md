# convex-linear

Sync Linear issues and comments into your Convex database reactively, and create, update, comment on, and archive issues directly from Convex functions.

[![npm version](https://badge.fury.io/js/convex-linear.svg)](https://badge.fury.io/js/convex-linear)

<!-- START: Include on https://convex.dev/components -->

## What this does

`convex-linear` gives your Convex app a live, queryable mirror of Linear issues and comments for the teams you care about, kept up to date by Linear webhooks, plus a small set of actions for driving Linear from your own backend logic:

- **Reactive issue & comment tracking** — every `Issue` and `Comment` webhook event updates a Convex table, so `useQuery` in your React app re-renders the instant something changes in Linear.
- **Create, update, comment, archive** — call `createIssue`, `updateIssue`, `createComment`, `archiveIssue`, and `unarchiveIssue` from Convex actions using the Linear GraphQL API.
- **Idempotent by delivery ID** — every webhook delivery is recorded by its `Linear-Delivery` ID, so retried deliveries never double-process.
- **Signature and freshness verified** — every inbound webhook is verified against `Linear-Signature` with a constant-time HMAC-SHA256 comparison, and rejected if `Linear-Timestamp` is more than 60 seconds old, before anything is written.

This is a [Convex component](https://convex.dev/components): its `issues`, `comments`, and `webhookEvents` tables live in an isolated schema, not your app's schema, and are only reachable through the functions this component exposes.

## Table of Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [Setup](#setup)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Type Reference](#type-reference)
- [Webhook Events](#webhook-events)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [Example App](#example-app)
- [Testing](#testing)
- [Limitations](#limitations)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Changelog](#changelog)

## Install

```sh
npm install convex-linear
```

## Quick Start

### 1. Add the component

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import convexLinear from "convex-linear/convex.config";

const app = defineApp();
app.use(convexLinear);

export default app;
```

### 2. Set environment variables

```sh
npx convex env set LINEAR_API_KEY lin_api_...
npx convex env set LINEAR_WEBHOOK_SECRET whsec_...
```

`LINEAR_API_KEY` is a personal API key (Settings → API → Personal API keys) or an OAuth access token. `LINEAR_WEBHOOK_SECRET` is the signing secret shown when you create the webhook in step 4.

### 3. Mount the webhook handler

```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import { Linear } from "convex-linear";

const linear = new Linear(components.convexLinear, {
  apiKey: process.env.LINEAR_API_KEY!,
  webhookSecret: process.env.LINEAR_WEBHOOK_SECRET!,
});

const http = httpRouter();

http.route({
  path: "/webhooks/linear",
  method: "POST",
  handler: linear.webhookHandler,
});

export default http;
```

### 4. Register the webhook in Linear

In your workspace's **Settings → API → Webhooks**, add a webhook pointing at `https://<your-deployment>.convex.site/webhooks/linear`, and subscribe to the **Issues** and **Comments** resource types. Copy the signing secret Linear shows you into `LINEAR_WEBHOOK_SECRET`.

### 5. Initialize the client

```ts
// convex/example.ts
import { action, query } from "./_generated/server";
import { components } from "./_generated/api";
import { Linear } from "convex-linear";
import { v } from "convex/values";

const linear = new Linear(components.convexLinear, {
  apiKey: process.env.LINEAR_API_KEY!,
  webhookSecret: process.env.LINEAR_WEBHOOK_SECRET!,
});

export const listIssuesByTeam = query({
  args: { teamId: v.string() },
  handler: async (ctx, args) => {
    return await linear.listIssuesByTeam(ctx, args);
  },
});
```

## Setup

The component needs no schema changes in your app — its tables (`issues`, `comments`, `webhookEvents`) live entirely inside the component's own isolated schema. All you need is the webhook mounted (step 3 above) and a `Linear` client instance wherever you call its methods.

Issues and comments are keyed by Linear's own UUID `id` field, not by the human-readable identifier (e.g. `"ENG-123"`) — identifiers are stored too and are what you'd show in a UI, but lookups and upserts go through the UUID since that's what's stable across a team's issue-numbering changes.

## Usage

### Create an issue

```ts
export const fileIssue = action({
  args: {
    teamId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await linear.createIssue(ctx, args);
  },
});
```

Returns `{ identifier, url }` and immediately records the full issue in Convex — you don't have to wait for the webhook round-trip to see it in a query.

### Update an issue

```ts
export const reprioritize = action({
  args: { issueId: v.string(), priority: v.number() },
  handler: async (ctx, args) => {
    await linear.updateIssue(ctx, args);
    return null;
  },
});
```

Pass a `stateId` (a workflow state's UUID, found via Linear's GraphQL API or the URL when viewing a team's workflow settings) to move an issue between states — Linear's states are custom per team, so there's no fixed `"open"`/`"closed"` enum the way there is for GitHub issues.

### Comment on an issue

```ts
export const comment = action({
  args: { issueId: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    return await linear.createComment(ctx, args);
  },
});
```

### Archive an issue

```ts
export const dismiss = action({
  args: { issueId: v.string() },
  handler: async (ctx, args) => {
    await linear.archiveIssue(ctx, args);
    return null;
  },
});
```

Archiving in Linear is a separate concept from closing — an archived issue is hidden from active views but is not deleted; it stays restorable from Linear's own archives page. This component mirrors that: `archiveIssue` sets the issue's `archivedAt` field in Convex rather than deleting its row, so an archived issue keeps showing up in `getIssue`/`listIssuesByTeam` with `archivedAt` set, and you decide whether to filter it out of your UI.

**A note on how this is actually detected**, because it is not what you'd guess from Linear's docs alone: we tested this live against Linear's real API, and found that the `action` field on an `Issue` webhook delivery does *not* reliably indicate archived vs. trashed vs. deleted, and none of these deliveries carry `archivedAt` or `trashed` on their own payload:

| What happened | Webhook `action` you actually get |
| --- | --- |
| `issueArchive` (soft archive, restorable) | `remove` |
| `issueUnarchive` (restore from archive) | `restore` |
| Moved to Linear's 30-day trash (e.g. "Delete issue" in the UI) | `update` |
| Permanently gone (after 30 days in trash, or otherwise purged) | issue no longer exists at all |

Because of this, the webhook handler does not branch on `action` for `Issue` events at all — every delivery re-fetches the issue's current state directly from Linear's GraphQL API and mirrors that (`archivedAt` and `trashed` included). The `action` is still recorded on the `webhookEvents` row for your own auditing, but the *only* thing that triggers an actual `removeIssue` (a hard delete of the local row) is the re-fetch itself failing with "Entity not found" — meaning the issue is genuinely, permanently gone. This does mean one extra Linear API call per `Issue` webhook delivery; see [Limitations](#limitations).

### Unarchive an issue

```ts
export const restore = action({
  args: { issueId: v.string() },
  handler: async (ctx, args) => {
    await linear.unarchiveIssue(ctx, args);
    return null;
  },
});
```

Restores the issue in Linear and clears `archivedAt` on its Convex row.

### Read issues and comments reactively

```tsx
const issues = useQuery(api.example.listIssuesByTeam, { teamId: "team_..." });
```

Every `Issue` and `Comment` webhook event patches, inserts, or removes a row, so this query re-renders live as issues move through your team's workflow — no polling.

## API Reference

### Actions (need `ctx` from an action)

| Method | Description |
| --- | --- |
| `createIssue(ctx, { teamId, title, description?, priority?, assigneeId?, labelIds? })` | Creates a new issue via the GraphQL API and records it. Returns `{ identifier, url }`. |
| `updateIssue(ctx, { issueId, title?, description?, stateId?, priority?, assigneeId?, labelIds? })` | Updates an issue's fields and re-records the full result. |
| `createComment(ctx, { issueId, body })` | Posts a comment on an issue. Returns `{ id }`. |
| `archiveIssue(ctx, { issueId })` | Archives an issue in Linear and sets `archivedAt` on its Convex row (the row is kept, not deleted). |
| `unarchiveIssue(ctx, { issueId })` | Restores an archived issue in Linear and clears `archivedAt` on its Convex row. |

### Queries (work from actions, queries, or mutations)

| Method | Description |
| --- | --- |
| `getIssue(ctx, { issueId })` | Fetch one issue by its Linear UUID. |
| `listIssuesByTeam(ctx, { teamId, limit? })` | Most recently updated issues for a team, newest first. |
| `listCommentsByIssue(ctx, { issueId, limit? })` | Most recently updated comments for an issue, newest first. |

### Webhook

| Property | Description |
| --- | --- |
| `webhookHandler` | An `httpAction` that verifies, deduplicates, and processes `Issue` and `Comment` webhook deliveries. Mount it at any route. |

## Type Reference

```ts
type LinearOptions = {
  apiKey: string;        // personal API key or OAuth access token
  webhookSecret: string; // the signing secret configured on the Linear webhook
};

type CreateIssueArgs = {
  teamId: string;
  title: string;
  description?: string;
  priority?: number;   // Linear's own scale: 0 none, 1 urgent, 2 high, 3 normal, 4 low
  assigneeId?: string;
  labelIds?: string[];
};

type UpdateIssueArgs = {
  issueId: string;
  title?: string;
  description?: string;
  stateId?: string;     // a workflow state's UUID
  priority?: number;
  assigneeId?: string;
  labelIds?: string[];
};

type Issue = {
  issueId: string;       // Linear's UUID
  identifier: string;    // e.g. "ENG-123"
  teamId: string;
  title: string;
  description?: string;
  state: string;         // team-defined workflow state name
  priority?: number;
  assigneeId?: string;
  assigneeName?: string;
  labels?: string[];
  url: string;
  archivedAt?: number;   // set when Linear has archived the issue; absent/undefined otherwise
  trashed?: boolean;     // set when the issue is in Linear's 30-day trash — distinct from archivedAt
  createdAt: number;
  updatedAt: number;
};

type Comment = {
  commentId: string;     // Linear's UUID
  issueId: string;
  body: string;
  userId?: string;
  userName?: string;
  createdAt: number;
  updatedAt: number;
};
```

## Webhook Events

The webhook handler subscribes to two Linear resource types (set these when creating the webhook):

- **`Issue`** — every delivery, regardless of its `action`, re-fetches the issue from Linear's API and upserts the result (including `archivedAt` and `trashed`); the row is only deleted if that re-fetch comes back "Entity not found" (the issue is genuinely, permanently gone). See [Archive an issue](#archive-an-issue) for why `action` alone can't be trusted here.
- **`Comment`** — `create`/`update` actions upsert the comment into the `comments` table; `remove` is ignored (there is no dependent state to clean up, so a removed comment is left as a stale row rather than chasing down a delete).

Every delivery is checked against `Linear-Signature` (HMAC-SHA256 of the raw request body, hex-encoded) with a constant-time comparison, checked for a `Linear-Timestamp` within 60 seconds of the current time (Linear's own recommendation against replay attacks), and deduplicated by `Linear-Delivery` before any table write.

Other resource types (`Project`, `Cycle`, `IssueLabel`, etc.) are accepted by the route but ignored after signature verification and idempotency recording, so you can subscribe to more events later without needing a new endpoint.

## Database Schema

```ts
issues: {
  issueId: string;       // indexed: by_issueId — Linear's UUID
  identifier: string;    // e.g. "ENG-123"
  teamId: string;        // indexed: by_teamId
  title: string;
  description?: string;
  state: string;
  priority?: number;
  assigneeId?: string;
  assigneeName?: string;
  labels?: string[];
  url: string;
  archivedAt?: number;   // set when Linear has archived the issue (not deleted)
  trashed?: boolean;     // set when the issue is in Linear's 30-day trash
  createdAt: number;
  updatedAt: number;
}

comments: {
  commentId: string;     // indexed: by_commentId — Linear's UUID
  issueId: string;       // indexed: by_issueId
  body: string;
  userId?: string;
  userName?: string;
  createdAt: number;
  updatedAt: number;
}

webhookEvents: {
  eventId: string;   // indexed: by_eventId — Linear-Delivery
  eventType: string; // Linear-Event: "Issue" | "Comment" | ...
  action?: string;   // payload.action: "create" | "update" | "remove" | "restore" — recorded for
                      // auditing only; see Webhook Events for why Issue events don't branch on it
  payload: string;   // raw JSON body, for auditing/replay
  receivedAt: number;
}
```

This schema lives entirely inside the component's isolated namespace — it will never collide with tables in your app's own `convex/schema.ts`.

## Authentication

Linear's GraphQL API accepts two kinds of tokens in the `Authorization` header, and they are **not** sent the same way:

- A **personal API key** (the kind most integrations use, created under Settings → API) is sent as-is: `Authorization: lin_api_xxxxx` — no `Bearer ` prefix.
- An **OAuth access token** (from a full OAuth app) does use the standard `Authorization: Bearer <token>` form.

This component assumes a personal API key or an already-`Bearer`-formatted token is passed as `apiKey` — if you're using OAuth, prefix the token yourself (`Bearer ${accessToken}`) before passing it in, since the component sends whatever string you give it verbatim.

## Example App

The `example/` app is a full interactive demo, not just a form:

- **Overview** — the landing tab: the pitch, a live tracker for issue/archived/comment/webhook counts (visible from every tab, not just this one), a team picker and "paste a team UUID" fallback, a walkthrough of how the archive/trash reconciliation actually works, and a quick-start code sample.
- **Issues** — file an issue (with suggestion chips), reprioritize it, archive or restore it, and add comments, all reactively reflected the instant the action call returns — no waiting on the webhook.
- **Webhooks** — a live, expandable feed of every raw delivery to `/webhooks/linear`, across every team you've connected, so you can watch signature verification, deduplication, and the ground-truth re-fetch happen in real time.
- **History** — every issue and comment this component has ever recorded, newest first, across every team, with a one-click "file follow-up issue" action.
- A sidebar **Activity** console logging every action call this demo makes, with its result or error.

Run it from the repo root (not `example/`):

```sh
npm install --legacy-peer-deps
npx convex env set LINEAR_API_KEY lin_api_...
npx convex env set LINEAR_WEBHOOK_SECRET whsec_...
npm run dev
```

Then register a webhook on a scratch team pointed at `https://<your-dev-deployment>.convex.site/webhooks/linear` (see [Quick Start](#quick-start)) to see live deliveries land in the Webhooks tab.

## Testing

```sh
npm run test
npm run typecheck
```

Tests use [`convex-test`](https://www.npmjs.com/package/convex-test) and cover `recordIssue` upsert behavior (including the `trashed` flag being carried through re-records), `listIssuesByTeam` scoping by team, `removeIssue` deletion, `setIssueArchived` archiving/restoring without deleting the row, `recordComment` upsert behavior, and webhook idempotency via `checkAndRecordEvent`.

## Limitations

- Only `Issue` and `Comment` webhook resource types are processed; `Project`, `Cycle`, `IssueLabel`, and other resource types are out of scope for this component.
- All mutations (`createIssue`, `updateIssue`, `createComment`, `archiveIssue`, `unarchiveIssue`) go through Linear's GraphQL API directly — this component does not wrap every GraphQL mutation Linear exposes (e.g. issue relations, sub-issues, project updates).
- The component does not manage webhook registration for you — you create the webhook once in Linear's UI or via the GraphQL API yourself.
- Rate limits are Linear's own (complexity-based, roughly 1,500 points/hour for API keys) — this component does not implement its own rate limiting or backoff.
- Every `Issue` webhook delivery makes one extra outbound call to Linear's GraphQL API (the re-fetch described in [Webhook Events](#webhook-events)) before writing anything to Convex — a deliberate tradeoff for correctness given `action` alone is unreliable, but worth knowing if you're watching Linear API usage closely. If that re-fetch throws for a reason other than "not found" (a transient network error, a rate limit), the webhook request fails; because the delivery was already marked processed for idempotency purposes before the re-fetch ran, a Linear-side retry of that same delivery will be treated as a duplicate and skipped rather than retried — in practice this means a very unlucky transient failure can leave one issue's mirror stale until its next change.

## Troubleshooting

**Webhook returns 401** — the signature didn't match. Double check `LINEAR_WEBHOOK_SECRET` matches exactly what Linear showed you when the webhook was created (this secret is only shown once).

**Webhook returns 400 "Stale webhook timestamp"** — your Convex deployment's clock and Linear's disagree by more than 60 seconds, or the request took unusually long to arrive. This is intentionally strict to guard against replay; if you're testing with a manually-crafted request, make sure `Linear-Timestamp` is the current Unix time in milliseconds.

**Issues never appear in queries** — confirm the webhook's delivery log in Linear shows a `200` response, and that the webhook is subscribed to the **Issues** and **Comments** resource types specifically.

**`updateIssue` doesn't seem to change the state** — `stateId` must be the UUID of a workflow state that belongs to the issue's own team; state UUIDs are not shared across teams even when the state names look the same (e.g. every team has its own "In Progress").

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

<!-- END: Include on https://convex.dev/components -->
