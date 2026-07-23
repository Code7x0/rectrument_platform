# Airtable — Partner Documents Module

## Table

Env: `AIRTABLE_DOCUMENTS_TABLE`

## Fields

| Airtable field | Domain |
|----------------|--------|
| Document ID | `documentCode` |
| Partner | `partnerId` (link → Partners) |
| Document Type | `documentType` |
| File | attachment (`fileUrl` / `fileName`) |
| Uploaded At | `uploadedAt` |
| Verification Status | `verificationStatus` |
| Verified By | `verifiedById` (link → Users) |
| Verified At | `verifiedAt` |
| Rejection Reason | `rejectionReason` |
| Notes | `notes` |
| Status | `status` (Active / Archived) |

## Document Type single-select

- PAN Card → `pan`
- Aadhaar Card → `aadhaar`
- Agreement → `agreement`

## Verification Status single-select

- Pending → `pending`
- Verified → `verified`
- Rejected → `rejected`

## Status single-select

- Active → `active`
- Archived → `archived` (soft delete)

## Notes

- Upload via abstract UploadService → Airtable Attachments Content API
- Verify / Reject writes Activities (`Entity Type` = `partner_document`)
- Partner-level Verification Status is rolled up in application code when all required docs are verified
