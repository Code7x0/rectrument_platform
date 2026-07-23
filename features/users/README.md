# Users — Onboarding & Identity Management

## Purpose

Complete user lifecycle: public Talent Partner registration, Admin approval, Super Admin staff invitations, role management, and identity visibility.

## Architecture

```
features/users/
  types/
  schemas/
  services/     # registration, approval, invitation, roles
  actions/
  components/
```

Persistence reuses `services/users` (Airtable Users table). Email via `services/email` (console provider).

## Flows

### Talent Partner registration (public)

`/register` → form + documents → Partner + User (`registrationStatus=pending`, `status=inactive`) → Admin queue.

Clerk is **not** bound until approval. Pending / rejected users cannot authenticate.

### Approval

Admin `/admin/approvals` → Approve (activate + emails + activity) or Reject (reason + email).

### Staff invitation

Super Admin only → Invite Admin / Account Manager → email with token → `/invite/[token]` → Clerk sign-in → activate.

### Identity visibility

Partner flag `PUBLIC` | `PRIVATE`. AM sees name only when PUBLIC. Super Admin / Admin always see identity. Change via `manage_identity_visibility`.

## Permissions

| Role | Key permissions |
|------|-----------------|
| Super Admin | Everything except creating Super Admin |
| Admin | Business + approve partners + identity visibility |
| Account Manager | Operational only |
| Talent Partner | Own account |

## Activity

`registration_submitted`, `partner_approved`, `partner_rejected`, `invitation_sent`, `invitation_accepted`, `role_changed`, `identity_visibility_changed` on entity type `user`.
