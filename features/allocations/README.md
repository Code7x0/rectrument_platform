# Allocation Engine

## Purpose

Job-originated **Talent Partner** assignments. One Job → many Partners.

## Workflow

```
Account Manager (only)
  → Assigned Jobs
  → Allocate Talent Partner (Partner ID)
  → Allocation created
  → Partner Work Queue
```

Admin may **view** allocations but never create/edit/archive them.

## Rules

- Allocations must reference a Job
- Job must already have an Assigned Account Manager
- Same active partner cannot be allocated twice to the same job
- Soft archive via Status = Archived
- Partner identity: Admin lists may include company/contact; AM lists expose Partner ID only

## Permissions

| Role | Capabilities |
|------|----------------|
| Admin | Read only |
| Account Manager | Create / Update / Archive |
| Talent Partner | Read own allocations |

## Privacy

`listAllocations({ includePartnerIdentity: false })` by default for AM.
