# Partner Documents & Verification

## Purpose

Partner KYC / compliance document upload and admin verification.

## Workflow

```
Partner → Documents → Upload / Replace
  → Pending Verification
  → Admin Review (Approve / Reject)
  → Partner sees updated status
```

## Document types

- PAN Card
- Aadhaar Card
- Agreement

## Verification status

- Pending
- Verified
- Rejected

Every verify / reject writes an Activity (`entityType: partner_document`). Activity Timeline UI is deferred.

## Upload

Uses the shared abstract `UploadService` (Airtable Attachments provider today). UI never talks to Airtable.

Allowed: PDF, PNG, JPEG, DOC, DOCX — max 10 MB. Validated client + server.

## Permissions

| Role | Access |
|------|--------|
| Admin | View / Verify / Reject / Archive |
| Account Manager | Read only |
| Partner | View / Upload / Replace own |

## Structure

```
features/partner-documents/
  repositories/
  services/
  actions/
  components/
  schemas/
  types/
```

## Integration points

- Partner Workspace Documents tab
- `/partner/documents`
- `/admin/documents`
- `/account-manager/documents` (read-only)
- Partner `verificationStatus` rolls up when all required docs are verified (feeds future Payout readiness)

## Out of scope

- Notifications / email
- OCR / AI
- Payout Management
- Activity Timeline UI
