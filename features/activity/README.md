# Activity Timeline

## Purpose

Premium **Activity Timeline** UI over the existing Workflows Activity Service.

Activities remain the audit log. This module is **presentation + aggregation only**.

## Structure

```
features/activity/
  components/   # Timeline, Card, Drawer, Filters, …
  services/     # Scope, grouping, presenters, timeline queries
  actions/      # Pagination / filter reloads
  types/
```

## Reuse

- Persistence: `features/workflows` (`recordActivity`, `listActivitiesForEntity`, `listActivities`)
- No activity repository in this module

## Routes

- `/activities` — global timeline (role-scoped)

## Entity timelines

Workspace tabs / drawers for Client, Partner, and reusable `EntityActivityPanel` / `ActivityDrawer` for Job, Allocation, Candidate, Submission, Document, Payout, User.

Notification entity timeline is optional and returns empty (activities are not notifications).

## Permissions

Reuses existing session + entity access:

| Role | Global timeline |
|------|-----------------|
| Super Admin | All activities |
| Admin | All business activities |
| Account Manager | Activities on assigned jobs / related submissions & payouts |
| Talent Partner | Own partner-related activities only |

Never returns activities for entities the viewer cannot already access.

## Activity vs Notifications

| | Activities | Notifications |
|--|------------|---------------|
| Audience | Audit / “what happened” | User inbox |
| Module | workflows + activity UI | notifications |
