# Feature Architecture

Every business module must follow this structure:

```
features/
  <module>/
    components/      # Module UI only
    actions/         # Server Actions
    repositories/    # Airtable CRUD + domain mapping ONLY
    services/        # Business rules / enrichment / policies
    schemas/         # Zod
    types/           # Domain models
    hooks/           # Module React Query hooks (optional)
```

Shared cross-module code stays in:

```
features/shared/             # Barrel re-exports for feature modules
features/shared/entities/    # Canonical domain models (Airtable-agnostic)
components/shared/
components/ui/
lib/
services/lookups/
services/uploads/            # Abstract file upload (Airtable → R2/S3 later)
providers/
hooks/
```

## Entity layer

Canonical business objects live in `features/shared/entities/`.

- Repositories map Airtable → entities
- Services / UI consume entities only
- Feature `types/` may re-export entities and add DTOs (filters, forms)

Candidate (person) and Submission (business event) are **separate** entities and features.

## Module dependency direction

```
Clients ← Jobs (Assigned AM) ← Allocations (AM-only) ← Tasks
                      ↓
              Submissions → Candidates
                      ↓
                 Workflows → Activities
```

- Clients are the hiring-company root for Jobs
- Every Job has one Assigned Account Manager (Admin assigns)
- Account Managers allocate many Talent Partners per Job
- Admin never creates allocations
- Partner Workspace: Admin sees identity; AM consumers use Partner ID only

### Example (Partners)

```
/admin/partners                 → Partners list
/admin/partners/[partnerId]     → Partner Workspace
  ├── Overview
  ├── Assigned Jobs   (allocations filtered by partnerId)
  ├── Submissions     (submissions filtered by partnerId)
  ├── Documents       (features/partner-documents)
  ├── Performance     (calculated metrics)
  └── Activity        (placeholder → Activity Timeline)
```

## Layer rules

| Layer | Allowed | Forbidden |
|---|---|---|
| Repository | Airtable I/O, map to domain models | Business rules, UI |
| Service | Policies, enrichment, soft-delete, search composition | Raw `record.fields["Job Title"]` in callers |
| Actions | Authz + validation + call service | Direct Airtable |
| Components | Domain models (`job.title`) | Airtable field names |

## Soft delete

Prefer `ArchiveDialog` + status = Archived. Avoid hard deletes unless required.

## Workspace pattern

Major business entities expose a **Workspace** — a dedicated route to inspect the entity and related work in one place.

```
features/<entity>/
  workspace/         # Workspace shell + tab panels
  components/        # List / forms / dialogs
  repositories/
  services/
  ...
```

### Contract

1. **List → Workspace**: row action / click navigates to `/…/<entity>/[id]`
2. **Tabs**: Overview (always) + related domains (Jobs, Partners, Candidates, Activity, …)
3. **Reuse, don't duplicate**: related tabs import existing feature components (e.g. Client Jobs uses `features/jobs`)
4. **Counts are calculated**: never store Job Count / Partner Count / Candidate Count on the parent record
5. **Same pattern for future workspaces**: Partner, Job, Candidate

### Example (Clients)

```
/admin/clients              → Clients list
/admin/clients/[clientId]   → Client Workspace
  ├── Overview
  ├── Jobs          (filter jobs by clientId)
  ├── Partners      (placeholder → Partner Workspace later)
  ├── Candidates    (placeholder)
  └── Activity      (placeholder → Activity Timeline)
```

Shared chrome: `features/shared/workspace/` (`WorkspaceShell`, `WorkspaceHeader`, `WorkspaceTabs`, `WorkspaceMetricCard`, `WorkspaceSection`)

## Lookups

Use `services/lookups` (React `cache` for request dedupe). Client query keys:

- `lookupQueryKeys.clients`
- `lookupQueryKeys.partners`
- `lookupQueryKeys.accountManagers`

## Shared UI

Use `DataTable`, `FormDialog`, `DetailDrawer`, `ConfirmDialog`, `ArchiveDialog`, `DeleteDialog` before inventing module-specific chrome.
