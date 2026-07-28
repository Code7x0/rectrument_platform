# Role login test guide (no confusion)

Use this when someone asks “why did I land on the wrong dashboard?”

## One rule to remember

| Priority | Source | Role after Clerk login |
|----------|--------|------------------------|
| **1 (wins)** | Email in `AIRTABLE_SUPER_ADMIN_EMAILS` | Super Admin → `/super-admin` |
| **2 (wins)** | Email in `AIRTABLE_ADMIN_EMAILS` | Admin → `/admin` |
| **3** | Active row in Airtable **Account Managers** | Account Manager → `/account-manager` |
| **4** | Active/approved row in Airtable **Partners** | Talent Partner → `/partner` |

Env allow-lists **always beat** Airtable rows.  
Do **not** put an Account Manager email into the Super Admin or Admin env lists.

---

## Current UAT Account Manager

| Field | Value |
|-------|--------|
| Email | `lucifer01x7@gmail.com` |
| Role | Account Manager |
| Dashboard | `/account-manager` |
| Airtable | Account Managers table, Status = **Active** |

### First login steps

1. Open the app → **Sign in** (Clerk).
2. Use **exactly** `lucifer01x7@gmail.com` (create Clerk account if needed).
3. You must land on **Account Manager** home — not Admin, not Partner.
4. You should see only **clients where you are Account Owner**. If you see none, ask Admin to set Clients → Account Owner = your AM record.

---

## Quick smoke tests (manual)

### A. Account Manager (`lucifer01x7@gmail.com`)

- [ ] Lands on `/account-manager`
- [ ] Clients list = only assigned clients
- [ ] Open another client URL → not found / forbidden
- [ ] Jobs → **Allocate** works; create job does **not**
- [ ] Review Queue can update candidate status
- [ ] Search does not show other managers’ clients

### B. Super Admin (env SA emails)

- [ ] Lands on `/super-admin`
- [ ] Can open Approvals + Role Management
- [ ] Sees all clients/jobs

### C. Admin (env Admin emails)

- [ ] Lands on `/admin`
- [ ] Can create clients/jobs
- [ ] **Cannot** allocate partners (no Allocate on jobs)
- [ ] Cannot open `/super-admin/users`

### D. Talent Partner (Partners table email)

- [ ] Lands on `/partner`
- [ ] Only allocated jobs
- [ ] Can submit candidate + resume

---

## Automated check (no browser)

```bash
pnpm test:roles
```

This prints every known email → role → dashboard.  
It **fails** if `lucifer01x7@gmail.com` is missing or not `account_manager`.

### Add / refresh an Account Manager in Airtable

```bash
pnpm am:upsert -- --email=lucifer01x7@gmail.com --name="Lucifer"
```

---

## Email confusion checklist

| Event | Who gets email |
|-------|----------------|
| Partner registers | Every address in Super Admin **and** Admin env lists |
| Partner approved | The Talent Partner (Official Email / registration email) |
| Job allocated | The Talent Partner |

If mail does not arrive: check Resend + `EMAIL_FROM` domain (test `onboarding@resend.dev` only delivers to the Resend account owner).
