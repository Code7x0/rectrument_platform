# Workflows Module

## Purpose

Centralize **all submission status transitions**.

No other feature may update submission status directly.

```
UI / Actions
  → Workflow Service
    → validate transition
    → Submissions.applySubmissionStatusChange
    → record Activity
```

## Valid status flow

```
Submitted → Internal Review → Client Review → Interview → Offer → Joined

Submitted → Rejected
Interview → Rejected
(+ Reject allowed from Internal Review, Client Review, Offer)
```

## Activity recording

Every transition writes an Activity (`features/workflows`).

Timeline UI: `features/activity` (`/activities`, workspace tabs, drawers).

- **listActivitiesForEntity** / **listActivities** — read APIs
- **Notifications** — separate inbox; may reference an activity id

## Structure

```
features/workflows/
  actions/
  repositories/   # Activities Airtable only
  services/       # transition engine + activity
  types/
```

## Rules

- Invalid transitions throw `InvalidTransitionError`
- Status writes only via `transitionSubmissionStatus`
- Admin is read-only on Review Queue (no `review_candidates`)
