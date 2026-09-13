# Changelog

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
