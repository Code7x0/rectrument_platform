# Database Specification

Version: aligned with `10_BUSINESS_RULES_UPDATE.md`

## Core entities

| Entity | Owner role | Notes |
|--------|------------|-------|
| Client | Admin (+ AM manage) | Hiring company |
| Job | Admin creates; **Assigned Account Manager** required | One AM per job |
| Allocation | **Account Manager only** | Many partners per job |
| Talent Partner | Admin manages identity | AM sees Partner ID only |
| Candidate | Person | Independent of payout |
| Submission | Business event | Recruitment status (+ future payout status) |
| Partner Document | Partner upload; Admin verify | AM no access |

## Job ownership

`Jobs.Assigned Account Manager` → Users (Account Manager role). Required.

## Allocation ownership

`Allocations` created only by Account Managers. Fields include Job, Partner, Assigned Account Manager, Expected/Submitted profiles, Status.

## Partner privacy (data exposure)

| Field | Admin | Account Manager |
|-------|:-----:|:---------------:|
| Partner ID / code | ✅ | ✅ |
| Company / Contact / Email / Phone | ✅ | ❌ |
| Documents / PAN / Aadhaar / Bank | ✅ | ❌ |
| Specialization / Rating / Status / Verification | ✅ | ✅ |

Enforced in service / lookup layers — not UI alone.

## Soft delete

Archive via status fields. No hard deletes for business records.
