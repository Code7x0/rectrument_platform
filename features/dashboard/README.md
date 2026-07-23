# Dashboard — Command Centers

## Purpose

Daily operations centers for Super Admin, Admin, Account Manager, and Talent Partner.

Not analytics. Every metric answers **“What needs my attention right now?”** and navigates to a module.

## Structure

```
features/dashboard/
  components/     # Shared UI + role dashboards
  services/       # Aggregation only (calls existing domain services)
  types/
```

## Shared components

`DashboardMetricCard`, `DashboardSection`, `DashboardQuickAction`, `DashboardRecentActivity`, `DashboardList`, `DashboardEmptyState`, `DashboardHeader`, `DashboardSkeleton`, `DashboardGrid`, `DashboardCard`

## Aggregation

| Role | Service |
|------|---------|
| Super Admin | `getSuperAdminDashboardData` |
| Admin | `getAdminDashboardData` |
| Account Manager | `getAccountManagerDashboardData(accountManagerId)` |
| Talent Partner | `getPartnerDashboardData(partnerId, name)` |

All data comes from existing modules (users, clients, jobs, documents, submissions, payouts, allocations, activities). No Airtable redesign.

## Routes

- `/super-admin` — Super Admin Command Center
- `/admin` — Admin Command Center
- `/account-manager` — AM Command Center
- `/partner` — Partner Command Center (My Work)
