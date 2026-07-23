# Master Context

Recruitment Partner Management System — internal ops platform.

## Roles

- **Admin** — business administration (clients, jobs, AM assignment, talent partner identity, document verification)
- **Account Manager** — recruitment operations (allocate partners by ID, review candidates, update status)
- **Talent Partner** — external recruiters (submit candidates, upload KYC, track status)

## Hierarchy

Admin → Account Manager → Talent Partner

## Critical business rules

See `10_BUSINESS_RULES_UPDATE.md` (takes precedence over earlier docs).

Highlights:

- One Job → one Account Manager → many Talent Partners
- Admin never allocates partners
- Partner privacy for Account Managers (Partner ID only)
- Candidate status transparency for partners
- Payout status belongs on Submission (future)

## Architecture

Feature-first modules. Architecture Freeze remains in effect. Soft archive. Workspace pattern for Clients / Talent Partners.
