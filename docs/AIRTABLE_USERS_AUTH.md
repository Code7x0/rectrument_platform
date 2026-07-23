# Airtable Users — Auth & Onboarding Field Requirements

Add/confirm these fields on the **Users** table:

| Field | Type | Notes |
|---|---|---|
| Full Name | Single line text | Required |
| Email | Email | Unique, required |
| Role | Single select | `Super Admin`, `Admin`, `Account Manager`, `Partner` |
| Status | Single select | `Active`, `Inactive`, `Suspended` — login gate |
| Registration Status | Single select | `Pending`, `Approved`, `Rejected`, `Invitation Pending`, `Active`, `Inactive` |
| Identity Visibility | Single select | `PUBLIC`, `PRIVATE` (Talent Partners) |
| Clerk User ID | Single line text | Filled on first successful login / invitation accept |
| Partner | Link to Partners | Optional (Partner users) |
| Account Manager | Link to Users | Optional |
| Phone | Phone / text | Optional |
| City | Single line text | Registration |
| State | Single line text | Registration |
| Skills | Long text | Registration |
| Experience | Long text | Registration |
| Bank Details | Long text | Optional |
| Approval Date | Date | Set on approve |
| Approved By | Link to Users | Approver |
| Rejected Reason | Long text | On reject |
| Invitation Token | Single line text | Staff invite |
| Invitation Expiry | Date/time | Staff invite TTL |
| Created At | Created time / date | Optional |
| Last Login | Date/time | Updated on successful login |

## Important

- Talent Partners self-register via `/register`. Pending / Rejected users **cannot** authenticate.
- Admins and Account Managers are invited by Super Admin only.
- Super Admin cannot be created via the app.
- Email in Airtable must match the Clerk login email for first login / invitation accept.
- After first successful login, auth lookups use **Clerk User ID**.

## Partners table additions

| Field | Type | Notes |
|---|---|---|
| Identity Visibility | Single select | `PUBLIC`, `PRIVATE` (default PRIVATE) |
| City / State / Skills / Experience / Bank Details | text | Mirrored from registration |
