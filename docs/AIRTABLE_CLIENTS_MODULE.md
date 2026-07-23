# Airtable — Clients Module

## Table

Env: `AIRTABLE_CLIENTS_TABLE`

## Fields

| Airtable field | Domain |
|----------------|--------|
| Client ID | `clientCode` |
| Client Name | `name` |
| Industry | `industry` |
| Website | `website` |
| Primary Contact | `primaryContact` |
| Account Manager (link → Users) | `accountManagerId` |
| Status | `status` |
| Notes | `notes` |

## Status single-select

- Active → `active`
- Inactive → `inactive`
- Archived → `archived` (soft delete)

## Notes

Do **not** store Job Count / Partner Count / Candidate Count — compute in Client Workspace.
