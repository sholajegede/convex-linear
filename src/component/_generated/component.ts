/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    lib: {
      checkAndRecordEvent: FunctionReference<
        "mutation",
        "internal",
        { action?: string; eventId: string; eventType: string; payload: string },
        { alreadyProcessed: boolean },
        Name
      >;
      getIssue: FunctionReference<
        "query",
        "internal",
        { issueId: string },
        null | {
          _creationTime: number;
          _id: string;
          assigneeId?: string;
          assigneeName?: string;
          createdAt: number;
          description?: string;
          identifier: string;
          issueId: string;
          labels?: Array<string>;
          priority?: number;
          state: string;
          teamId: string;
          title: string;
          updatedAt: number;
          url: string;
        },
        Name
      >;
      listCommentsByIssue: FunctionReference<
        "query",
        "internal",
        { issueId: string; limit?: number },
        Array<{
          _creationTime: number;
          _id: string;
          body: string;
          commentId: string;
          createdAt: number;
          issueId: string;
          updatedAt: number;
          userId?: string;
          userName?: string;
        }>,
        Name
      >;
      listIssuesByTeam: FunctionReference<
        "query",
        "internal",
        { limit?: number; teamId: string },
        Array<{
          _creationTime: number;
          _id: string;
          assigneeId?: string;
          assigneeName?: string;
          createdAt: number;
          description?: string;
          identifier: string;
          issueId: string;
          labels?: Array<string>;
          priority?: number;
          state: string;
          teamId: string;
          title: string;
          updatedAt: number;
          url: string;
        }>,
        Name
      >;
      recordComment: FunctionReference<
        "mutation",
        "internal",
        { body: string; commentId: string; issueId: string; userId?: string; userName?: string },
        string,
        Name
      >;
      recordIssue: FunctionReference<
        "mutation",
        "internal",
        {
          assigneeId?: string;
          assigneeName?: string;
          description?: string;
          identifier: string;
          issueId: string;
          labels?: Array<string>;
          priority?: number;
          state: string;
          teamId: string;
          title: string;
          url: string;
        },
        string,
        Name
      >;
      removeIssue: FunctionReference<
        "mutation",
        "internal",
        { issueId: string },
        null,
        Name
      >;
    };
  };
