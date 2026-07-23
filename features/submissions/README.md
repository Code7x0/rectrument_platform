# Submissions Module

## Purpose

**Submission = Business Event** linking a Candidate to a Job via an Allocation.

## Status

Status values live on the submission entity, but **transitions only** go through
`features/workflows` (`transitionSubmissionStatus`).

Valid flow (see Workflows README):

```
Submitted → Internal Review → Client Review → Interview → Offer → Joined
(+ Reject from key stages)
```

## Permissions

| Role | Access |
|------|--------|
| Partner | Create for own active allocations |
| Account Manager | Review queue + transitions (`review_candidates`) |
| Admin | Read-only queue |

## Structure

```
features/submissions/
  actions/          # submit candidate
  components/
  repositories/
  services/         # create/list; applySubmissionStatusChange (workflow-only)
  schemas/
  types/
```
