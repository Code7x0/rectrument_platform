# Settings & Company Management

## Purpose

Centralized platform configuration for Super Admin and Admin.

Does **not** replace Role Management, payout calculations, workflow transitions, or authentication.

## Structure

```
features/settings/
  repositories/   # Optional Airtable Settings singleton
  services/       # Defaults, access, diagnostics, updates
  actions/
  components/
  schemas/
  types/
```

## Routes

| Path | Access |
|------|--------|
| `/settings` | Super Admin, Admin |
| `/settings/company` | View both; mutate Super Admin |
| `/settings/users` | Both (operational mutate) |
| `/settings/recruitment` | Both (operational mutate) |
| `/settings/payouts` | Both (operational mutate) |
| `/settings/notifications` | Both (operational mutate) |
| `/settings/security` | Read-only |
| `/settings/integrations` | Read-only |
| `/settings/system` | Read-only |

Account Manager and Talent Partner are redirected to `/forbidden`.

Legacy `/admin/settings` and `/super-admin/settings` redirect to `/settings`.

## Persistence

Optional Airtable table via `AIRTABLE_SETTINGS_TABLE`.

Fields:

| Field | Type |
|-------|------|
| Settings Key | text (`platform`) |
| Payload | long text (JSON) |
| Updated At | date/time |
| Updated By | link → Users |

Without the table, settings load from code defaults. Saves require the table.

## Permissions

| Capability | Who |
|------------|-----|
| Access `/settings` | `admin` or `super_admin` (`isAdmin`) |
| Company mutate | Super Admin only |
| Operational defaults | Admin + Super Admin |
| Auto-approve registration default | Super Admin only (not wired to auto-approve workflow) |

## Wired behaviour

- **Invitation expiry days** → used by User Onboarding invite / reset access

Other settings are stored for operators and future wiring (documented below).

## Production Recommendations

Do **not** implement without explicit approval:

1. Grant Admin a dedicated `view_platform_settings` / limited `manage_company_settings` permission instead of role-based `isAdmin` checks.
2. Wire recruitment `requiredDocuments` into Partner Documents validation (today still uses code constants).
3. Wire notification platform defaults into `getOrCreatePreferences` for new users.
4. Wire `defaultIdentityVisibility` into public registration form default.
5. Logo file upload via Upload Service (currently URL text).
6. Auto-approve registration behaviour (would change onboarding business rules).
7. Tax / commission engines under Payouts.
8. Activity retention purge jobs under Security.
