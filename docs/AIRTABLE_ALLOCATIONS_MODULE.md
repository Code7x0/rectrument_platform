# Airtable — Allocations Module

## Table

Env: `AIRTABLE_ALLOCATIONS_TABLE`

## Fields

| Airtable field | Domain |
|----------------|--------|
| Allocation ID | `allocationCode` |
| Job (link) | `jobId` |
| Partner (link) | `partnerId` |
| Assigned Account Manager (link → Users) | `accountManagerId` |
| Assigned By (link → Users) | `assignedById` |
| Assigned Date | `assignedDate` |
| Status | `status` |
| Expected Profiles | `expectedProfiles` |
| Profiles Submitted | `profilesSubmitted` |
| Notes | `notes` |

## Status single-select

- Assigned → `assigned`
- Working → `working`
- Completed → `completed`
- Cancelled → `cancelled`
- Archived → `archived` (soft delete)

## Creation rule

Records are created only by **Account Managers** via **Jobs → Allocate Talent Partner**.

Admin never creates allocations.

One Job may have many Talent Partner allocations.

## Partner Work Queue

Feature 5 filters by Partner + Status in (`Assigned`, `Working`).
