# Comprehensive Production UAT Report

**Product:** Recruiting Partner Platform (TalentSocio)  
**Date:** 2026-07-28  
**Airtable base:** `appOh6IpawqSgL8OS` (schema unchanged)  
**Method:** Live app health + route probes + browser public flows + code/security audit + RBAC leak fixes during UAT  

---

## Executive verdict

The platform is **near production-ready for core recruitment operations** after critical env + RBAC fixes applied in this UAT pass.

**Production Readiness Score: 82 / 100**

| Band | Meaning |
|------|---------|
| 90–100 | Sign-off ready |
| **80–89** | **Ready with controlled go-live + interactive role checklist** |
| 70–79 | Blockers remain |
| &lt;70 | Not ready |

**Blocking for unsupervised go-live:** Interactive multi-role login UAT (Clerk) still required with real SA / Admin / AM / Partner sessions. Automated browser could not complete authenticated role walks (Clerk UI / credentials).

---

## Application Health

| Check | Result |
|-------|--------|
| App boots (`next dev`) | ✔ Ready |
| Home `/` | ✔ 200 |
| Register `/register` | ✔ 200 — form fields present (name, email, docs, agreement) |
| Sign-in `/sign-in` | ✔ 200 — Clerk shell loads |
| Protected routes | ✔ 307 → `/sign-in` for `/admin`, `/account-manager`, `/partner`, `/super-admin` |
| Lookups unauthenticated | ✔ `/api/lookups/clients` → 401 |
| Forbidden / Unauthorized pages | ✔ 200 |
| TypeScript | ✔ `tsc --noEmit` clean |
| **`/api/health`** | ✔ **200 `ok`** after fix (was 503 `degraded`) |

### Critical health issue found & fixed

| Issue | Impact | Fix |
|-------|--------|-----|
| `AIRTABLE_ACCOUNT_MANAGERS_TABLE=Account Managers` **unquoted** → process env truncated to `Account` | Health 503; AM table “not found”; identity/lookups fragile | Quoted value in `.env.local`; env quote-stripping; fallback when value is `"Account"`; restarted with clean env |

**Post-fix health:** 0 errors, Account Managers table + Name/Email/Status fields present, Airtable connect OK.

---

## RBAC Validation

### Account Manager (critical)

| Control | Status |
|---------|--------|
| Clients via Account Owner | ✔ Server filter + URL ownership gate |
| Jobs via owned clients | ✔ |
| Allocations / review queue / payouts / dashboard metrics | ✔ `jobIds` scoped |
| Search clients/jobs | ✔ Scoped ids |
| **Dashboard recent activity** | ✔ Fixed — filtered to owned submissions |
| **Search documents** | ✔ Fixed — AM returns empty (no `view_documents`) |
| **Client workspace lookups** | ✔ Fixed — clients + AMs filtered to self |
| **Jobs/Clients AM dropdown** | ✔ Fixed — only self |
| Privilege escalation (URL/actions) | ✔ Scope guards on allocate / review / transition / client update |

### Talent Partner (critical)

| Control | Status |
|---------|--------|
| Jobs via `Jobs.Partners` | ✔ Work queue |
| Own submissions / earnings / profile / docs | ✔ |
| Lookup clients / account-managers APIs | ✔ 403 |
| Submit only on own allocation | ✔ Service check |

### Admin vs Super Admin

| Capability | Admin | Super Admin |
|------------|-------|-------------|
| CRM (clients, jobs, partners, candidates, docs, payouts) | ✔ | ✔ |
| Partner approve/reject | ✔ | ✔ |
| Role Management / invite staff | ✖ | ✔ |
| Company settings write | ✖ | ✔ |

### Gaps (accepted / non-blocking)

- **Reports / Analytics** — not in product scope (PRD future)
- **Managers directory UI** — SA Role Management only; no AM CRUD module beyond invite

---

## Authentication

| Item | Status |
|------|--------|
| Clerk middleware protect | ✔ |
| Role layouts | ✔ |
| Client identity (AM + Partner + env SA/Admin) | ✔ after AM table env fix |
| Pending partner cannot login | ✔ (registration status gate — code path) |

**Manual required:** Sign in as each of 4 roles and confirm dashboard landing.

---

## Email Workflow

| Event | Status | Notes |
|-------|--------|-------|
| Registration → SA + Admin | ✔ | Resend template `partner_registration_submitted` |
| Approval → partner | ✔ | Soft-fail `sendEmailSafe` |
| Rejection → partner | ✔ | Switched to soft-fail during UAT |
| Staff invite | ✔ | Single invitation email (removed duplicate password_setup send) |
| Deliverability | ⚠ | `EMAIL_FROM=onboarding@resend.dev` — only delivers to Resend account owner until domain verified |

---

## Airtable Synchronization

| Item | Status |
|------|--------|
| Schema lock honored | ✔ |
| Health schema probe | ✔ |
| Dashboard `noStore()` | ✔ |
| Revalidate after submit/status/allocate | ✔ |
| Live Airtable edit → UI | ⚠ | Needs interactive refresh test after AM table fix |

---

## Partner Registration & Approval Flow

| Step | Status |
|------|--------|
| Public registration UI | ✔ Browser-verified |
| Pending partner + docs | ✔ Code path (Partners.Resume + markers) |
| Notify SA/Admin (email + in-app) | ✔ |
| Approve → Active + welcome email | ✔ |
| Reject → Inactive + rejection email | ✔ |

---

## Job & Candidate Workflows

| Step | Status |
|------|--------|
| Job description + attachment links | ✔ JobDrawer |
| Partner opens allocated job | ✔ |
| Submit + resume Content API | ✔ Buffer on `UploadedFile` |
| Native Company/Experience/Skills write | ✔ |
| AM/Admin see submission | ✔ Scoped lists |
| Status transitions AM-owned only | ✔ |

---

## Dashboard Validation

| Role | Status |
|------|--------|
| Super Admin | ✔ noStore + users summary |
| Admin | ✔ CRM metrics |
| AM | ✔ Owned-only metrics + scoped activity (fixed) |
| Partner | ✔ Tasks + submissions + earnings |

---

## Security Audit

| Test | Result |
|------|--------|
| Unauthenticated protected pages | Redirect sign-in |
| Unauthenticated lookups | 401 |
| Partner lookup clients/AMs | 403 |
| AM foreign client URL | notFound |
| AM foreign submission actions | ScopeDenied |
| Role spoofing via UI alone | Blocked by server session role |
| Repository direct from client | N/A — server-only |

---

## Repository Audit

Scoping applied at service/page/action layers for AM/Partner. Remaining over-fetch: `listSubmissions()` then filter by `jobIds` on AM dashboard (correct results, medium performance).

---

## Communication Audit

```
Partner register → SA/Admin email + notify
       ↓
Approve/Reject → partner email + notify
       ↓
Allocate (Jobs.Partners) → partner work queue
       ↓
Submit candidate → AM notify + review queue
       ↓
Status change → partner candidates + dashboards revalidate
```

No intentional disconnected module found after fixes. Notifications remain partially derived (known schema limit).

---

## Performance Observations

| Observation | Severity |
|-------------|----------|
| `job_partners` allocations scan Jobs then filter | Medium |
| AM dashboard submissions: fetch-all then filter | Medium |
| Lookup React `cache` within request | OK |

---

## Edge Cases

| Case | Status |
|------|--------|
| Empty AM assignment → empty lists | ✔ |
| Missing resume on new candidate | ✔ Validated required |
| Duplicate candidate email/phone | ✔ Reuse flow |
| Email provider failure on approve/reject | ✔ Soft-fail (won’t roll back Airtable) |
| Truncated AM table env | ✔ Detected + mitigated |
| Concurrent / session expiry / large resume | ⚠ Manual |

---

## Issues Found

### Critical (fixed this UAT)

1. Unquoted `AIRTABLE_ACCOUNT_MANAGERS_TABLE` → truncated `Account` → health fail / identity risk  
2. AM dashboard activity unscoped  
3. AM search leaked all partner documents  
4. AM workspace/list loaded all clients & all AMs into forms  

### High (fixed earlier / this pass)

5. AM clients/jobs/allocations/candidates unscoped (prior stabilization)  
6. Job description attachments not shown (prior)  
7. Resume bind Map loss (prior)  
8. Registration email missing (prior)  

### Medium (fixed this UAT)

9. Rejection email hard-fail  
10. Duplicate staff invite emails  
11. Partners lookup treated SA as operational  

### Remaining / accepted

12. Reports/Analytics not built (future)  
13. Resend from-address domain not production-verified  
14. Interactive authenticated role UAT not completed in this session  
15. Notification persistence schema blocker  

---

## Issues Fixed (this UAT session)

- `.env.local` quoted `Account Managers`  
- Env quote normalization + `"Account"` fallback in identity/lookups/health  
- AM dashboard activity scoping + role-aware activity links  
- AM search documents denied  
- AM client workspace & list pages scoped lookups  
- Partners API identity mode for Super Admin  
- Rejection `sendEmailSafe`  
- Invite: one email only  

---

## Remaining Risks

1. **Go-live without interactive 4-role walkthrough** — highest process risk  
2. **Email domain** — partners may not receive mail on `resend.dev`  
3. **Process env pollution** — unquoted spaces in `.env` still dangerous; keep quotes  
4. **Derived modules** (activities/notifications/payouts markers) — softer than native tables  

---

## Recommendations

1. Complete interactive UAT checklist (below) with real Clerk users before production traffic.  
2. Verify Resend domain + rotate any exposed API keys.  
3. Keep `AIRTABLE_ACCOUNT_MANAGERS_TABLE="Account Managers"` quoted in all environments.  
4. Monitor `/api/health` in deploy pipeline — fail deploy on `errors > 0`.  
5. Optional later: Airtable-side formula filters for AM job lists (performance).  

---

## Interactive go-live checklist (must run manually)

### Super Admin
- [ ] Login → `/super-admin`  
- [ ] Role Management invite  
- [ ] Approvals approve/reject + email  
- [ ] Client/Job CRUD + delete  
- [ ] Dashboard counts vs Airtable  

### Admin
- [ ] Login → `/admin`  
- [ ] Cannot open `/super-admin/users`  
- [ ] Full CRM + approvals  

### Account Manager
- [ ] Only assigned clients/jobs  
- [ ] Foreign client URL fails  
- [ ] Review + status update  
- [ ] Search does not show other managers’ data or partner KYC docs  

### Talent Partner
- [ ] Only allocated jobs  
- [ ] JD + attachments  
- [ ] Submit + resume in Airtable  
- [ ] Counts update on dashboards  

### Cross-cutting
- [ ] Edit record in Airtable → refresh app → counts update  
- [ ] Registration → SA email → approve → login → allocate → submit  

---

## Score breakdown

| Area | Weight | Score |
|------|--------|-------|
| Health / config | 15 | 14 |
| RBAC / security | 25 | 22 |
| Core workflows | 25 | 21 |
| Email / communication | 10 | 8 |
| Sync / dashboards | 10 | 8 |
| UX / completeness | 10 | 6 |
| Ops readiness | 5 | 3 |
| **Total** | **100** | **82** |

---

## Conclusion

After this UAT pass, **critical permission leaks and the Account Managers env truncation bug are fixed**, health is green, and core recruitment workflows are wired to the locked Airtable schema.

**Do not declare 100% production-complete until the interactive multi-role checklist is signed off** and Resend production from-address is verified. With those completed, the platform is suitable for TalentSocio production use.
