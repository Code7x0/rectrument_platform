# RBAC Validation Report

**Date:** 2026-07-23  
**App:** Recruiting Partner Platform  
**Auth:** Clerk (authentication) + Airtable / env (authorization identity)  
**Identity mode:** Client schema (`AIRTABLE_COMPAT_MODE=client`, no Users table)  
**Validation method:** Code audit of auth, layouts, navigation, permissions, and identity adapters; live env allow-lists inspected. Full interactive multi-role browser login was not executed in this pass (requires four Clerk identities).

---

## Executive summary

| Role | Sign-in gate | Dashboard | Role isolation | Primary gap |
|------|--------------|-----------|----------------|-------------|
| Super Admin | Env email allow-list | `/super-admin` | Strong | No Candidates/Allocations in sidebar (must use `/admin/*` URLs) |
| Admin | Env email allow-list | `/admin` | Strong | Cannot transition candidate statuses (`canTransition={false}`) |
| Account Manager | Active row in Account Managers | `/account-manager` | Strong | Cannot create Jobs/Clients; settings = notification prefs only |
| Talent Partner | Active/Preferred Partners row | `/partner` | Strong | Sees jobs only after allocation; Probation cannot login |

**Overall:** RBAC is enforced in server layouts (`requireRole` / `requirePermission`) and action handlers. Middleware authenticates only; role checks happen in App Router layouts and server actions. Permissions are **never** read from Airtable.

---

## Identity model (how roles are determined)

```
Clerk signs user in (email)
        │
        ▼
getAppSession() → buildAppSession({ clerkUserId, email })
        │
        ▼
clientFindUserByEmail(email)   [client identity mode]
        │
        ├─1─ Email in AIRTABLE_SUPER_ADMIN_EMAILS? → role = super_admin (synthetic or merged)
        ├─2─ Email in AIRTABLE_ADMIN_EMAILS?        → role = admin (synthetic or merged)
        ├─3─ Match Account Managers.Email?         → role = account_manager (or elevated if also in env)
        ├─4─ Match Partners.Official Email ID / Personal Email?
        │         → role = partner (or elevated if also in env)
        └─5─ No match → session = null → /unauthorized
        │
        ▼
canUserAuthenticate(user)?
  status === "active"
  AND registrationStatus ∈ { active, approved }
        │
        ├─ No  → null → /unauthorized
        └─ Yes → AppSession { userId, clerkId, role, status, partnerId?, accountManagerId? }
```

**Source of truth files**

| Concern | Path |
|---------|------|
| Session | `lib/auth/index.ts` |
| Permissions | `lib/auth/permissions.ts` |
| Env elevated emails | `lib/airtable/identity-mode.ts` |
| Client identity | `services/users/client-identity.adapter.ts` |
| Login gate | `services/users/users.service.ts` → `canUserAuthenticate` |
| Post-login redirect | `app/auth/callback/page.tsx` |
| Sidebar | `lib/navigation/index.ts` |

---

## Answers to the nine questions

### 1. Who is allowed to sign in as Super Admin?

Anyone whose Clerk primary email is listed in **`AIRTABLE_SUPER_ADMIN_EMAILS`** (comma-separated, case-insensitive).

- **Does not require** an Airtable Account Managers / Partners / Users row.
- Current local config includes: `vinit@talentsocio.com`.
- Must also pass Clerk sign-in (user exists in the Clerk instance).

### 2. Who is allowed to sign in as Admin?

Anyone whose Clerk email is listed in **`AIRTABLE_ADMIN_EMAILS`**.

- **Does not require** an Airtable row.
- Current local config includes: `sk7436855@gmail.com`.
- If the same email is also a Partner/AM record, **env elevated role wins**.

### 3. Who is allowed to sign in as Account Manager?

A person with:

1. Clerk account for that email, and  
2. A row in **Account Managers** whose **Email** matches, and  
3. Status mapped as active (`Active` or `On Leave`; empty treated as active), and  
4. **Not** stuck in invitation-pending (`invite:` marker while Status is inactive).

They do **not** need to be in `AIRTABLE_ADMIN_EMAILS`.

### 4. Who is allowed to sign in as Talent Partner?

A person with:

1. Clerk account for that email, and  
2. A **Partners** row matching **Official Email ID** or **Personal Email**, and  
3. Status **`Active`** or **`Preferred`**.

**`Probation`** (post-registration, pre-approval) → inactive → **cannot** sign in until Admin approves (Status → Active).  
**`Inactive`** → cannot sign in.

### 5. How does the application determine a user's role?

1. Clerk authenticates and supplies email.  
2. Application looks up identity via env allow-lists + Airtable Account Managers / Partners (client mode).  
3. Role is set on the resolved `User`, then copied into `AppSession.role`.  
4. Permissions are derived from `ROLE_PERMISSIONS[role]` in code — **not** from Airtable columns.

### 6. Does the user need to already exist in Airtable before signing in?

| Role | Need Airtable row? |
|------|--------------------|
| Super Admin | **No** (env email only) |
| Admin | **No** (env email only) |
| Account Manager | **Yes** (Account Managers table) |
| Talent Partner | **Yes** (Partners table, Active/Preferred) |

All roles need a **Clerk** user for the email.

### 7. What happens if someone signs in through Clerk but has no matching Airtable record?

- `getAppSession()` returns `null`.  
- `/auth/callback` redirects to **`/unauthorized`**.  
- Protected layouts call `requireAuth()` → same unauthorized path.  
They are authenticated in Clerk but **not authorized** in the app.

### 8. What happens if an Admin email is removed from `AIRTABLE_ADMIN_EMAILS`?

On next session resolution:

- If that email **only** existed via the env list → identity lookup fails (unless they also exist as AM/Partner) → **`/unauthorized`**.  
- If they also have an **Account Managers** or **Partners** row → they sign in as **account_manager** or **partner** instead (lose admin powers).  
- Env changes require a new server process / redeploy to pick up (env is read at runtime via `process.env`).

### 9. What happens if an Account Manager exists in Airtable but has never signed in before?

- They can sign in as soon as they create/use a Clerk account with the **same email** and AM Status is Active (or On Leave).  
- No prior Clerk ID binding is required for session (client mode does not require a Users.Clerk field).  
- First successful active login may update **Last Engaged Date** on Partners for partners; AM last-login update is best-effort via identity adapter.  
- If they were invited (`invite:` marker + inactive) they stay blocked until invitation acceptance / status activation.

---

## Per-role matrix

### 1. Super Admin

| Check | Expected | Code status |
|-------|----------|-------------|
| Sign in | Env email + Clerk | ✅ |
| Dashboard | `/super-admin` | ✅ |
| Sidebar | Workspace, Role Mgmt, Approvals, Clients, Jobs, Partners, Documents, Payouts, Activity, Settings | ✅ (see gap: no Candidates/Allocations links) |
| Accessible | `/super-admin/*`, `/admin/*` (layout allows `super_admin`), `/settings`, `/activities`, `/notifications` | ✅ |
| Blocked | `/account-manager/*`, `/partner/*` → `/forbidden` | ✅ |
| CRUD | Users/roles/invites; clients/jobs/partners; allocations; docs; payouts; company settings | ✅ via permissions |
| Airtable sync | Writes through official SDK | ✅ |
| Logout | Clerk `UserButton` / sign-out → public routes | ✅ |
| Redirect after login | `/super-admin` | ✅ |

**Unique powers vs Admin:** `manage_users`, `invite_staff`, `manage_roles`, `manage_company_settings`.

---

### 2. Admin

| Check | Expected | Code status |
|-------|----------|-------------|
| Sign in | `AIRTABLE_ADMIN_EMAILS` + Clerk | ✅ |
| Dashboard | `/admin` | ✅ |
| Sidebar | Dashboard, Approvals, Clients, Jobs, Partners, Candidates, Allocations, Documents, Payouts, Activity, Settings | ✅ |
| Accessible | `/admin/*`, `/settings`, `/activities`, `/notifications` | ✅ |
| Blocked | `/super-admin/*`, `/account-manager/*`, `/partner/*` | ✅ |
| Create Client / Job | Yes (`manage_clients`, `manage_jobs`) | ✅ |
| Assign AM to Job | Via Job form → updates **Clients.Account Owner** in client mode | ✅ |
| Allocate Talent Partners | Yes (`manage_allocations`) | ✅ |
| Candidate status transitions | **No** — `/admin/candidates` sets `canTransition={false}` | ⚠️ Gap (monitor-only) |
| Delete Client | Yes (hard delete action, admin/super_admin) | ✅ |
| Logout / redirect | `/admin` after login | ✅ |

---

### 3. Account Manager

| Check | Expected | Code status |
|-------|----------|-------------|
| Sign in | Active Account Managers email + Clerk | ✅ |
| Dashboard | `/account-manager` | ✅ |
| Sidebar | Dashboard, Clients, Jobs, Allocations, Review Queue, Payouts, Activity, Settings | ✅ |
| Accessible | `/account-manager/*`, `/activities`, `/notifications` | ✅ |
| Blocked | `/admin/*`, `/super-admin/*`, `/partner/*`, `/settings` (platform) | ✅ |
| View assigned Jobs | Filtered by Clients.Account Owner = self (client mode) | ✅ |
| Create Job / Client | **No** create (admin-only actions); can update clients they manage | ✅ by design |
| Assign Talent Partners | Yes on jobs (`canAllocate` from `manage_allocations`) | ✅ |
| Review submissions | `/account-manager/candidates` with `canTransition={true}` if `review_candidates` | ✅ |
| Update statuses | Yes (workflow transitions) | ✅ |
| Partner documents | `/account-manager/documents` → **hard redirect `/forbidden`** | ✅ privacy |
| Settings nav | Redirects to `/notifications/preferences` | ✅ |
| Logout | ✅ | ✅ |

---

### 4. Talent Partner

| Check | Expected | Code status |
|-------|----------|-------------|
| Sign in | Partners Active/Preferred + Clerk | ✅ |
| Dashboard | `/partner` | ✅ |
| Sidebar | My Work, Assigned Jobs, My Candidates, Documents, Earnings, Activity, Profile | ✅ |
| Accessible | `/partner/*`, `/activities` (scoped), `/notifications` | ✅ |
| Blocked | All admin/AM/super-admin routes | ✅ |
| View assigned Jobs | Only jobs where `Jobs.Partners` includes self; Open/On Hold only | ✅ |
| Submit candidates | From Assigned Jobs; writes Candidates Job+Role+Partner | ✅ |
| View status | `/partner/candidates` live from Airtable Submission Status | ✅ |
| Profile update | Own Partners fields; notes preserve `[RP_DOC]` markers | ✅ |
| Logout | ✅ | ✅ |

---

## End-to-end workflow validation

```
Super Admin / Admin
  → Create Client (+ Account Owner = AM)     [Airtable Clients]
  → Create Job (linked Client; AM synced to Client.Account Owner)
  → (Optional) Allocate Talent Partner      [Jobs.Partners]

Account Manager
  → Sees Jobs for clients they own
  → Allocates Talent Partner(s)             [Jobs.Partners]
  → Reviews submissions                     [Candidates]
  → Updates status (if review_candidates)   [Submission Status]

Talent Partner
  → Sees allocated Open/On Hold jobs
  → Submits candidates                      [Candidates + Job/Role]
  → Sees status updates after refresh
```

| Step | Sync target | Validated |
|------|-------------|-----------|
| Create Client | Clients | ✅ code path |
| Assign AM | Clients.**Account Owner** | ✅ client-mode job create/update |
| Create Job | Jobs | ✅ |
| Allocate Partner | Jobs.**Partners** | ✅ `job_partners` mode |
| Partner sees Job | Derived from Jobs.Partners | ✅ |
| Partner submits | Candidates (Job + Role + Submitted By) | ✅ |
| Admin/AM sees candidate | `listSubmissions` | ✅ |
| Status update | Candidates.Submission Status | ✅ AM; Admin view-only |
| Partner sees status | `listPartnerSubmissions` | ✅ |

---

## Route & redirect map

| Event | Destination |
|-------|-------------|
| Successful login | Role dashboard (`/super-admin` \| `/admin` \| `/account-manager` \| `/partner`) |
| Clerk ok, no identity / inactive | `/unauthorized` |
| Wrong role for layout | `/forbidden` |
| Unauthenticated protected route | Clerk protect → `/sign-in` |
| AM “Settings” | `/notifications/preferences` |
| AM Documents | `/forbidden` |
| Logout | Public home / sign-in (Clerk) |

**Middleware:** `clerkMiddleware` + `auth.protect` on protected prefixes only — **no role checks**.

**Layouts:** `RoleLayout` / `requireRole` enforce roles.

---

## Permission inventory (application layer)

| Permission | SA | Admin | AM | Partner |
|------------|:--:|:-----:|:--:|:-------:|
| manage_users / invite_staff / manage_roles | ✅ | | | |
| manage_company_settings | ✅ | | | |
| approve_partners | ✅ | ✅ | | |
| manage_clients / archive_clients | ✅ | ✅ | manage only* | |
| manage_jobs | ✅ | ✅ | | |
| view_jobs | ✅ | ✅ | ✅ | |
| manage/archive_allocations | ✅ | ✅ | ✅ | |
| view_own_allocations | | | | ✅ |
| review_candidates | | | ✅ | |
| view_submissions | ✅ | ✅ | ✅ | |
| submit_candidates | | | | ✅ |
| verify/archive documents | ✅ | ✅ | | own docs |
| manage_payouts | ✅ | ✅ | update only | own view |
| notifications prefs | ✅ | ✅ | ✅ | ✅ |

\*AM has `manage_clients` but create-client server action requires `admin` \| `super_admin`.

---

## Airtable synchronization notes (client schema)

| App concept | Airtable |
|-------------|----------|
| Super Admin / Admin identity | Env emails (not table rows) |
| Account Manager identity | Account Managers.Email + Status |
| Partner identity | Partners.Official/Personal Email + Status |
| Job → AM assignment | Clients.Account Owner (not a Jobs AM column) |
| Job → Partner assignment | Jobs.Partners multi-link |
| Candidate submission | Candidates row; Job **or** Role link to Jobs |
| Candidate status | Candidates.Submission Status |
| Partner KYC files | Partners.Resume + Performance Notes markers |

---

## Missing workflows & permission gaps

1. **Admin cannot change candidate status in UI**  
   `/admin/candidates` forces `canTransition={false}` despite Admin monitoring role. Status changes are AM-only via `review_candidates`.  
   *Recommendation:* Allow Admin/Super Admin transitions if product expects “Admin monitors everything” to include status edits.

2. **Super Admin sidebar omits Candidates & Allocations**  
   Super Admin can open `/admin/candidates` and `/admin/allocations` (layout allows it) but nav does not link them.  
   *Recommendation:* Add those items to `SUPER_ADMIN_NAV`.

3. **No dedicated “Account Managers” admin module**  
   AM assignment is only via Client Account Owner / Job form — no AM directory CRUD UI beyond Super Admin role management / Airtable.

4. **Partner never sees jobs from “create job” alone**  
   Correct by design (must allocate), but UAT scripts often miss this.

5. **Elevated email vs Airtable conflict**  
   An email in Admin env that is also a Partner becomes Admin (elevated wins). Easy to confuse during testing.

6. **Removing env Admin without Airtable fallback**  
   Instant lockout on next session — no grace period / warning in UI.

7. **Platform Settings table often unset**  
   Settings may be in-memory defaults when `AIRTABLE_SETTINGS_TABLE` is blank (accepted schema limitation).

8. **Interactive multi-role browser pass still pending**  
   This report is code-validated. Recommend a signed checklist with four Clerk users before production sign-off.

9. **AM can manage clients but not create**  
   Intentional; document for UAT so testers don’t file false bugs.

10. **Clerk development keys on production hosts**  
    Operational risk (usage limits / bot protection), not RBAC logic — still relevant to “can sign in” reliability.

---

## Recommended UAT sign-in checklist (manual)

| # | Actor | Precondition | Pass criteria |
|---|-------|--------------|---------------|
| 1 | Super Admin | Email in `AIRTABLE_SUPER_ADMIN_EMAILS` | Lands `/super-admin`; cannot open `/partner` |
| 2 | Admin | Email in `AIRTABLE_ADMIN_EMAILS` | Lands `/admin`; create client/job; allocate partner |
| 3 | AM | Active Account Managers row | Lands `/account-manager`; only owned jobs; can allocate; can transition candidates |
| 4 | Partner (Probation) | Status Probation | `/unauthorized` |
| 5 | Partner (Active) | Status Active + allocated job | Sees job; submit; status visible after AM change |
| 6 | Unknown Clerk user | No env / AM / Partner match | `/unauthorized` |
| 7 | Cross-role | Partner session hits `/admin` | `/forbidden` |
| 8 | Logout | Any role | Cannot load protected route without re-auth |

---

## Verdict

**RBAC is implemented and consistent with the locked client Airtable identity model.**  
Role boundaries for dashboards, sidebars, layouts, and server actions are sound.  

**Ship blockers for “complete” product RBAC (optional depending on client expectations):** Admin status transitions; Super Admin nav completeness; interactive four-role sign-off.

**Config owners must treat `AIRTABLE_SUPER_ADMIN_EMAILS` / `AIRTABLE_ADMIN_EMAILS` as production secrets equivalent to IAM roles.**
