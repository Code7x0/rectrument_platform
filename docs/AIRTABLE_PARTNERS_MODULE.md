# Airtable — Partners Module

## Table

Env: `AIRTABLE_PARTNERS_TABLE`

## Fields

| Airtable field | Domain |
|----------------|--------|
| Partner ID | `partnerCode` |
| Company Name | `companyName` |
| Contact Name | `contactName` |
| Official Email | `email` |
| Phone | `phone` |
| Specialization | `specialization` |
| Revenue Share | `revenueShare` |
| Rating | `rating` |
| Status | `status` |
| Verification Status | `verificationStatus` |
| Identity Visibility | `identityVisibility` (`PUBLIC` / `PRIVATE`) |
| City | `city` |
| State | `state` |
| Skills | `skills` |
| Experience | `experience` |
| Bank Details | `bankDetails` |
| Notes | `notes` |

## Status single-select

- Active → `active`
- Inactive → `inactive`
- Pending → `pending`
- Archived → `archived` (soft delete)

## Verification Status single-select

- Pending → `pending`
- Verified → `verified`
- Rejected → `rejected`

## Notes

Do **not** store Active Jobs / Profiles Submitted / Interviews / Offers / Joined — compute in Partner Workspace Performance.
