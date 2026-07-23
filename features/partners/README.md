# Talent Partners Module

## Purpose

External talent-partner root entity. Admin manages full identity; Account Managers work with **Partner ID** only.

## Workspace pattern

```
/admin/partners              → list (Admin)
/admin/partners/[id]         → Workspace (full identity)
  Overview | Assigned Jobs | Submissions | Documents | Performance | Activity*
```

\* Activity Timeline: `features/activity` (workspace tab + drawer)

## Privacy

| Viewer | Sees |
|--------|------|
| Admin | Company, contact, email, phone, documents, everything |
| Account Manager | Partner ID, specialization, rating, verification, performance, status |
| Talent Partner | Own profile only |

Enforced in `partner-privacy.ts` + operational partner lookups — not UI alone.

## Permissions

| Role | Capabilities |
|------|----------------|
| Admin | Create / Read / Update / Archive / Documents |
| Account Manager | No identity pages; allocate via Partner ID |
| Talent Partner | Own portal only |

## Structure

```
features/partners/
  actions/ components/ repositories/ services/ schemas/ types/ workspace/
```
