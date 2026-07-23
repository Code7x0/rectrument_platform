# Clients Module

## Purpose

Hiring-company root entity. Owns the first **Workspace** implementation.

## Workspace pattern

```
/admin|account-manager/clients          → list
/admin|account-manager/clients/[id]     → Client Workspace
  Overview | Jobs | Partners* | Candidates* | Activity*
```

\* Partners tab → link into Partner Workspace  
\* Candidates placeholder remains; Activity Timeline wired via `features/activity`

## Permissions

| Role | Capabilities |
|------|----------------|
| Admin | Create / Read / Update / Archive |
| Account Manager | Read / Update |
| Partner | No access |

## Calculated stats

`jobCount`, `partnerCount`, `candidateCount` are **never stored** — computed in `getClientWorkspaceStats`.

## Dependencies

- Jobs: Jobs tab reuses `JobTable` / `JobDrawer` / `JobDialog` filtered by `clientId`
- Lookups: Account Managers
- Future: Partner Workspace links from Partners tab

## Structure

```
features/clients/
  actions/
  components/
  repositories/
  services/
  schemas/
  types/
  workspace/
```
