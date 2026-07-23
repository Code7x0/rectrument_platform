# Workflow Specification

Source of truth: `10_BUSINESS_RULES_UPDATE.md`

## Recruitment flow

```
Admin: Create Client → Create Job → Assign Account Manager
  ↓
Account Manager: Allocate one or more Talent Partners
  ↓
Talent Partner: Submit Candidates
  ↓
Account Manager: Review → update recruitment status
  ↓
Client Review → Interview → Offer → Joined → Payout
```

## Role separation

| Role | Does | Does not |
|------|------|----------|
| Admin | Clients, Jobs, AM assignment, Talent Partner identity, Documents verify | Allocate partners, day-to-day status ops |
| Account Manager | Allocate partners, review submissions, update status | See partner PII / documents |
| Talent Partner | Source & submit candidates, upload KYC | Manage jobs/clients, edit status |

## Multi-partner

One Job → one Account Manager → many Talent Partner allocations.

## Candidate status (Submission)

Submitted → Internal Review → Client Review → Interview → Offer → Joined  
Alt: Rejected  

Only Account Manager updates status. Talent Partners have read-only visibility.

## Payout status (future — on Submission)

Not Eligible → Eligible → Processing → Paid → Completed  

Owned by Account Manager (Admin override). Partners read-only.
