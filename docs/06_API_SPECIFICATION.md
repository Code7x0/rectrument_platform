# API Specification

Internal Next.js Server Actions + lookup routes. No public REST surface for MVP.

## AuthZ

Permissions derived from role (`lib/auth/permissions.ts`). Always enforced in Server Actions.

## Lookups

| Route | Admin | Account Manager | Partner |
|-------|-------|-----------------|---------|
| `/api/lookups/partners` | Identity labels (company/contact) | Operational labels (Partner ID) | Forbidden |

## Jobs

- Create / Update / Archive: Admin (`manage_jobs`)
- Assigned Account Manager: required on create/update
- AM list: filtered to jobs where `accountManagerId = session.userId`

## Allocations

- Create / Update / Archive: Account Manager only
- Admin: `view_allocations` only
- Partner identity on list: `includePartnerIdentity` flag (Admin true, AM false)

## Partner documents

- Verify / Archive: Admin only
- Account Manager: no `view_documents` permission
