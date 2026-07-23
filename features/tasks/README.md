# Tasks Feature

## Purpose

Unified **task queues** for role-specific daily work.

| Audience | Queue |
|----------|--------|
| Partner | My Work — active allocations |
| Account Manager | Review Queue — open submissions |
| Admin | Read-only review pipeline |

## Account Manager Review Queue

```
listReviewQueueSubmissions()
  → DataTable
  → Review drawer
  → transitionSubmissionAction → Workflow Service
  → Activity recorded
```

Status changes never happen outside `features/workflows`.

## Partner workflow

```
My Work → Submit Candidate → Submission (Submitted) → AM Review Queue
```
