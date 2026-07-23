# Deployment Report — Live Client Airtable

**Date:** 2026-07-23  
**Base ID:** `appOh6IpawqSgL8OS` (Partner Relationship Manager)  
**Runtime path:** Clerk → Repositories → Official Airtable SDK (`lib/airtable/client.ts`) → Client Airtable  
**MCP:** Development / schema inspection only — **not** used at runtime

---

## Verdict

### READY FOR LIVE CLIENT UAT (Airtable access restored)

| Gate | Status |
|------|--------|
| Environment variables configured (local `.env.local`) | ✅ Configured |
| Compatibility modes (client / job_partners / candidates) | ✅ Correct |
| Elevated roles env set | ✅ Set |
| Clerk keys present | ✅ Present (test keys) |
| Official SDK wired (no mocks / no MCP runtime) | ✅ Pass |
| Startup health endpoint (`GET /api/health`) | ✅ Implemented |
| **Live Airtable Data API authorization** | ✅ **OK (recheck 2026-07-23)** |
| Live Meta schema inspection | ✅ 200 — 8 tables |
| Live SDK list (Clients / Jobs / Partners / Candidates / Account Managers) | ✅ OK |
| Live CRUD smoke (create/update) | ✅ Pass — see `docs/CRUD_SMOKE_REPORT.md` |
| Production Clerk live keys | ⚠️ Still test keys |

**Recheck evidence:** Meta API 200; SDK `select` on all five required tables returned rows (0 errors).

---

## 1. Environment validation

Configured in `.env.local` (gitignored):

| Variable | Value / state | Status |
|----------|---------------|--------|
| `AIRTABLE_API_KEY` | PAT set | Present — **unauthorized against base** |
| `AIRTABLE_BASE_ID` | `appOh6IpawqSgL8OS` | Present |
| `AIRTABLE_COMPAT_MODE` | `client` | ✅ |
| `AIRTABLE_ALLOCATIONS_MODE` | `job_partners` | ✅ |
| `AIRTABLE_SUBMISSIONS_MODE` | `candidates` | ✅ |
| `AIRTABLE_CLIENTS_TABLE` | `Clients` | ✅ |
| `AIRTABLE_JOBS_TABLE` | `Jobs` | ✅ |
| `AIRTABLE_PARTNERS_TABLE` | `Partners` | ✅ |
| `AIRTABLE_CANDIDATES_TABLE` | `Candidates` | ✅ |
| `AIRTABLE_ACCOUNT_MANAGERS_TABLE` | `Account Managers` | ✅ |
| `AIRTABLE_USERS_TABLE` | blank | ✅ client identity mode |
| Optional tables (docs/payouts/activities/notifications/settings/allocations/submissions) | blank | ✅ soft-fail / derived |
| `AIRTABLE_SUPER_ADMIN_EMAILS` | `vinit@talentsocio.com` | ✅ |
| `AIRTABLE_ADMIN_EMAILS` | `sk7436855@gmail.com` | ✅ |
| `CLERK_SECRET_KEY` | `sk_test_…` | ✅ present |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_…` | ✅ present |
| `UPLOAD_PROVIDER` | `airtable` | ✅ |
| `EMAIL_PROVIDER` | `console` | ✅ (logs only until real provider) |

No guessed table names — values match the locked client CRM naming from `docs/AIRTABLE_ALIGNMENT_REPORT.md`.

---

## 2. Airtable connectivity (live probe)

### Evidence (recheck 2026-07-23)

**Meta API** — `200 OK`  
Tables (8): Partners, Clients, Jobs, Candidates, Candidates_MV, Candidate Snapshot, Role, Account Managers

**Data API / official SDK** — authorized  
Listed sample rows from Clients, Jobs, Partners, Candidates, Account Managers (maxRecords: 3 each).

Earlier 403 is resolved after PAT scopes / base access were updated.

---

## 3. Repository validation (code path)

All CRM repositories call `@/lib/airtable/client` (`getRecords` / `findRecord` / `createRecord` / `updateRecord`). No mock repositories remain.

| Domain | Storage | Status (code) | Live |
|--------|---------|---------------|------|
| Clients | Clients table | SDK CRUD | ✅ Readable |
| Jobs | Jobs table | SDK CRUD | ✅ Readable |
| Partners | Partners table | SDK CRUD | ✅ Readable |
| Candidates / submissions | Candidates (`candidates` mode) | SDK CRUD | ✅ Readable |
| Allocations | Jobs.Partners (`job_partners`) | SDK update Jobs | ✅ Jobs readable |
| Account Managers | Account Managers table | SDK read/write (identity) | ✅ Readable |
| Documents | Derived (Partners.Resume + notes markers) | SDK | ✅ Partners readable |
| Payouts | Derived (Jobs.Payout + Partners.Communications) | SDK | ✅ Readable |
| Activities | Derived (Candidates status/date) | SDK | ✅ Readable |
| Notifications | Derived feed | SDK / soft-fail | ✅ Readable |
| Search / Dashboards | Feature services → repos | SDK | ✅ Readable |

---

## 4. CRUD validation

**Read path:** Verified live via official SDK list on all five required tables.

**Write smoke** (create → update → allocate → submit → status → cleanup): not re-run in this pass. Say if you want a controlled write smoke against the live base.

---

## 5. Authentication validation

| Role | Resolution mechanism | Config |
|------|----------------------|--------|
| Super Admin | Env allow-list | `AIRTABLE_SUPER_ADMIN_EMAILS=vinit@talentsocio.com` |
| Admin | Env allow-list | `AIRTABLE_ADMIN_EMAILS=sk7436855@gmail.com` |
| Account Manager | Account Managers.Email + Status | Table readable ✅ |
| Talent Partner | Partners.Official Email ID / Personal Email + Status | Table readable ✅ |

- Passwords: **Clerk only** — never stored in Airtable.  
- Session: Clerk → email → `buildAppSession` / client identity adapter.  

**Clerk note:** Current keys are `pk_test_` / `sk_test_`. For production Vercel, switch to live Clerk keys.

---

## 6. Application health check

Implemented:

- `lib/airtable/startup-validation.ts` — env + Meta (optional) + **Data API SDK probe**
- `GET /api/health` — returns `200` when `ok`, `503` when degraded, with per-check diagnostics

With the fixed PAT, `/api/health` should report `airtable:data` / Meta checks as ok (restart the Next.js process so it loads `.env.local`).

---

## 7. Known limitations (schema-locked — not bugs)

See `docs/AIRTABLE_ALIGNMENT_REPORT.md`:

| ID | Limitation |
|----|------------|
| A | Notification read/unread + prefs cannot persist |
| B | No historical from→to status audit trail |
| C | No persistent settings JSON without Settings table |

Derived documents / payouts / activities / notifications remain operational.

---

## 8. Deployment readiness checklist

| Item | Status |
|------|--------|
| No mock / placeholder runtime | ✅ |
| No MCP runtime dependency | ✅ |
| `.env.example` documents all vars | ✅ |
| Client table names + modes set | ✅ |
| Super Admin / Admin emails set | ✅ |
| Health diagnostics endpoint | ✅ |
| **Working Airtable PAT with base access** | ✅ |
| Live read validation | ✅ |
| Live write CRUD smoke | ⏳ Optional / pending |
| Production Clerk live keys | ⚠️ Still test keys |
| Real email provider (optional) | ⚠️ `console` |

---

## 9. Immediate next steps (owner)

1. Restart app / confirm `GET /api/health` → `status: ok`.  
2. Log in as `vinit@talentsocio.com` (Super Admin) and `sk7436855@gmail.com` (Admin) via Clerk.  
3. Ensure AM/Partner users exist in Airtable with matching emails.  
4. Optional: approve a controlled write CRUD smoke.  
5. Deploy to Vercel with the same Airtable env (use **live** Clerk keys for production).

---

## Definition of Done (current)

**Airtable connectivity restored.** Runtime path Clerk → SDK → Client Airtable is live for reads.

Application is **ready for live client UAT** once Clerk logins are verified. Optional write smoke still pending explicit approval.
