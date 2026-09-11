import { describe, expect, test } from "vitest";
import { initConvexTest } from "./setup.test.js";
import { api } from "./_generated/api.js";

describe("issues", () => {
  test("recordIssue inserts then updates the same issueId", async () => {
    const t = initConvexTest();

    await t.mutation(api.lib.recordIssue, {
      issueId: "issue_1",
      identifier: "ENG-1",
      teamId: "team_eng",
      title: "Fix bug",
      state: "In Progress",
      url: "https://linear.app/acme/issue/ENG-1",
    });

    let issue = await t.query(api.lib.getIssue, { issueId: "issue_1" });
    expect(issue?.state).toBe("In Progress");

    await t.mutation(api.lib.recordIssue, {
      issueId: "issue_1",
      identifier: "ENG-1",
      teamId: "team_eng",
      title: "Fix bug",
      state: "Done",
      url: "https://linear.app/acme/issue/ENG-1",
    });

    issue = await t.query(api.lib.getIssue, { issueId: "issue_1" });
    expect(issue?.state).toBe("Done");
    expect(issue?.title).toBe("Fix bug");
  });

  test("listIssuesByTeam scopes by teamId", async () => {
    const t = initConvexTest();

    await t.mutation(api.lib.recordIssue, {
      issueId: "issue_a",
      identifier: "ENG-2",
      teamId: "team_a",
      title: "a",
      state: "Todo",
      url: "https://linear.app/acme/issue/ENG-2",
    });
    await t.mutation(api.lib.recordIssue, {
      issueId: "issue_b",
      identifier: "DES-1",
      teamId: "team_b",
      title: "b",
      state: "Todo",
      url: "https://linear.app/acme/issue/DES-1",
    });

    const results = await t.query(api.lib.listIssuesByTeam, { teamId: "team_a" });
    expect(results).toHaveLength(1);
    expect(results[0].issueId).toBe("issue_a");
  });

  test("removeIssue deletes the issue", async () => {
    const t = initConvexTest();

    await t.mutation(api.lib.recordIssue, {
      issueId: "issue_gone",
      identifier: "ENG-3",
      teamId: "team_eng",
      title: "Will be archived",
      state: "Todo",
      url: "https://linear.app/acme/issue/ENG-3",
    });

    expect(await t.query(api.lib.getIssue, { issueId: "issue_gone" })).not.toBeNull();

    await t.mutation(api.lib.removeIssue, { issueId: "issue_gone" });

    expect(await t.query(api.lib.getIssue, { issueId: "issue_gone" })).toBeNull();
  });
});

describe("comments", () => {
  test("recordComment upserts by commentId", async () => {
    const t = initConvexTest();

    await t.mutation(api.lib.recordComment, {
      commentId: "comment_1",
      issueId: "issue_1",
      body: "First draft",
    });

    let comment = (await t.query(api.lib.listCommentsByIssue, { issueId: "issue_1" }))[0];
    expect(comment.body).toBe("First draft");

    await t.mutation(api.lib.recordComment, {
      commentId: "comment_1",
      issueId: "issue_1",
      body: "Edited",
    });

    comment = (await t.query(api.lib.listCommentsByIssue, { issueId: "issue_1" }))[0];
    expect(comment.body).toBe("Edited");
  });
});

describe("webhook idempotency", () => {
  test("checkAndRecordEvent flags duplicate delivery ids", async () => {
    const t = initConvexTest();

    const first = await t.mutation(api.lib.checkAndRecordEvent, {
      eventId: "delivery_1",
      eventType: "Issue",
      action: "update",
      payload: "{}",
    });
    expect(first.alreadyProcessed).toBe(false);

    const second = await t.mutation(api.lib.checkAndRecordEvent, {
      eventId: "delivery_1",
      eventType: "Issue",
      action: "update",
      payload: "{}",
    });
    expect(second.alreadyProcessed).toBe(true);
  });
});
