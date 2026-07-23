# Jobs Module

## Purpose

Central hiring-requirement entity. Every Job has one **Assigned Account Manager**.

## Workflow

```
Admin
  → Create Job + Assign Account Manager
Account Manager
  → View assigned Jobs
  → Allocate Talent Partner(s)
  → Partner Work Queue → Candidate Submission
```

## Dependencies

- Airtable `Jobs` table (`AIRTABLE_JOBS_TABLE`) — includes **Assigned Account Manager**
- Clients + Account Managers lookups
- Auth: `view_jobs`, `manage_jobs` (Admin create/edit)
- Allocations: AM-only via `manage_allocations`

## Rules

- Soft delete via Status = Archived
- Assigned Account Manager is required
- Admin does **not** allocate partners
- AM job lists are scoped to `accountManagerId = session.userId`
