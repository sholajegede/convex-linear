# Changelog

## 0.0.5

### Patch Changes

- Fix the Convex directory badge image URL, which still pointed at `badge/sholajegede/convex-linear` after the link URL was corrected in a previous release; both now use the plain `badge/convex-linear` path.

## 0.0.4

### Patch Changes

- Drop the username scope from the Convex directory badge link in README, matching the directory's updated URL format

## 0.0.3

### Patch Changes

Fix `createIssue`, `updateIssue`, `createComment`, `archiveIssue`, and `unarchiveIssue` being typed as `ctx: GenericActionCtx<GenericDataModel>`, which only type-checks when the calling app's schema is empty. Any real app with its own tables got a compile error on every one of these calls. They now accept a minimal structural ctx type instead, matching the pattern the query methods already used. The example app's schema was also given a real table, so this class of bug shows up in this repo's own typecheck from now on instead of only in a downstream app.

## 0.0.2

### Patch Changes

- Add demo screenshot to README

## 0.0.1

- Add `archiveIssue` and `unarchiveIssue` actions, mirroring Linear's own
  archive/restore instead of deleting the row.
- Reconcile `Issue` webhook events against Linear's live GraphQL state instead
  of trusting the webhook's `action` field, which doesn't reliably distinguish
  archived, trashed, and deleted issues.
- Track Linear's 30-day trash state as `trashed`, separate from `archivedAt`.
- Rebuild the example app with a full interactive demo: an Overview tab, live
  issue/webhook tracking, and team switching.

## 0.0.0

- Initial release.
