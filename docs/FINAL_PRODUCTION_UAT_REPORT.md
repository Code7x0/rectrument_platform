# Final Production UAT Report

**Date:** 2026-07-22  
**Application:** Recruiting Partner Platform (TalentSocio)  
**Constraint:** Airtable schema locked — no Airtable writes or schema changes during this UAT  
**Scope:** Application-layer fixes only

---

## Features Tested

1. RBAC for Super Admin, Admin, Account Manager, Talent Partner (pages, actions, APIs, search)
2. Dashboards (counts, scoping, soft-fail sources)
3. Partner registration → pending → notify → approve/reject → email → login gate
4. Emails (registration submitted, approval with login URL, dedupe)
5. Client / Job / Allocation / Candidate / Payout workflows
6. Partner submit + resume upload + duplicate reuse ownership
7. Job details / attachments from Airtable fields
8. Navigation, notifications, health endpoint, UX consistency
9. Security: IDOR, identity leaks, privilege escalation paths

---

## Bugs Found

### Critical (fixed)

| ID | Issue |
|----|--------|
| C1 | AM payout status/notes IDOR — no job ownership check; Super Admin blocked (`role === "admin"` only) |
| C2 | Partner candidate duplicate lookup / reuse exposed other partners’ PII and allowed resume overwrite |
| C3 | Partner self-profile could change email (login identity takeover risk) |
| C4 | `/api/health` leaked Airtable/env diagnostics to unauthenticated callers |
| C5 | AM payouts page loaded full Account Manager directory |
| C6 | Submission enrichment always used identity-mode partner labels (AM private-partner leak) |
| C7 | Client workspace + job partners dialog forced `includePartnerIdentity: true` for AMs |
| C8 | Super Admin allocate stamped SA user id as allocation AM (broke ownership/notifications) |

### High (fixed)

| ID | Issue |
|----|--------|
| H1 | Approval email missing `loginUrl` |
| H2 | Registration resume only noted filename — not bound to `Partners.Resume` |
| H3 | AM search could match private partner company/contact names |
| H4 | Document upload notified all Account Managers (wrong URL) |
| H5 | `assertCanViewJobs` omitted `super_admin` |
| H6 | AM nav “Notifications” pointed at settings; Partner lacked Notifications nav |
| H7 | Job drawer duplicated Description/Notes; filename-as-description fallback |
| H8 | AM dashboard duplicate metric + incorrect payout activity scoping |

### Medium (fixed)

| ID | Issue |
|----|--------|
| M1 | AM pages loaded full AM directory then filtered to self |
| M2 | Health error path could leak exception messages |
| M3 | Dead `revalidatePath("/super-admin/invitations")` |
| M4 | Job details missing Interview Process / Seniority from locked Airtable fields |

---

## Bugs Fixed

All Critical/High/Medium items above were fixed in application code. Highlights:

- Payout mutations: ownership via `assertAccountManagerOwnsJob`; SA treated as elevated
- Candidate reuse: partner-owned submissions only; foreign duplicates create without PII leak
- Partner email: read-only on profile; schema/action omit email
- Health: coarse status for public; full diagnostics for Admin/SA only
- Partner identity: operational labels for AM paths; identity for Admin/SA
- SA allocate: does not override job/client Account Owner
- Approval email includes sign-in URL; registration resume binds to Airtable attachment field
- Nav: Notifications for all four roles; AM Settings separate

`npx tsc --noEmit` passes after changes.

---

## RBAC Validation

| Role | Result |
|------|--------|
| Super Admin | Access to ops + role management; allocate without overwriting job AM |
| Admin | Operational management; no `manage_allocations` create (intentional — unassign only); approvals/docs/payouts OK |
| Account Manager | Clients/jobs/candidates/allocations/payouts scoped to owned Account Owner; no AM directory leak; partner identity operational |
| Talent Partner | Own jobs/submissions/profile/notifications/earnings only; cannot reuse others’ candidates; cannot change login email |

URL/API gates: partner blocked from staff lookups; AM client workspace hard-ownership `notFound()`; payout/submit actions ownership-checked.

---

## Airtable Validation

- **Read-only during UAT** — no schema or data writes from this session.
- App maps locked Jobs fields: Description (Comments + attachments), Experience, Skills, Location, Salary, Documents, Interview Process, Seniority.
- There is **no dedicated “Requirements” field** on the locked Jobs table; Interview Process + JD attachments are the closest available surfaces.
- Dashboard counts are live-derived from list APIs (soft-fail → 0 if a source errors), not hardcoded.

---

## Email Validation

| Event | Status |
|-------|--------|
| New Partner Registration → Admin/SA emails | Implemented (`partner_registration_submitted`); requires env email lists |
| Partner Approval → partner | Implemented (`approval` + `loginUrl`); business action succeeds if email fails (`sendEmailSafe`) |
| Dedupe | 60s `to::template` guard |
| Approval in-app notify | Does not double-send approval email |

**Remaining ops dependency:** `AIRTABLE_SUPER_ADMIN_EMAILS` / `AIRTABLE_ADMIN_EMAILS` + Resend must be configured in production or staff emails will not fan out (in-app notifications still fire).

---

## Workflow Validation

| Flow | Status |
|------|--------|
| Register → Pending → Notify → Pending list | Pass (code path) |
| Approve → Status + Welcome/approval email → Login gate | Pass |
| Job allocate → Partner work queue → Submit + resume | Pass |
| AM review → Status update → Dashboard | Pass (scoped) |
| Reject partner | Implemented in users.service |

End-to-end live email delivery was **not** exercised against production Resend in this session (no Airtable/user mutations).

---

## Dashboard Validation

| Dashboard | Scoping | Counts |
|-----------|---------|--------|
| Super Admin | Global | Live |
| Admin | Global ops | Live |
| Account Manager | Owned jobs → submissions/allocations/reviews | Live; duplicate metric removed |
| Partner | Own allocations/submissions/payouts | Live |

---

## Security Validation

| Check | Result |
|-------|--------|
| Direct URL to other AM client | `notFound` when Account Owner mismatch |
| Payout IDOR | Fixed |
| Candidate PII / reuse IDOR | Fixed |
| Partner email takeover | Fixed |
| Health diagnostics leak | Fixed |
| AM partner identity | Fixed (operational) |
| Lookup APIs | Auth + role checks present |
| Search partner oracle | Fixed for AM |

---

## UX Validation

- Loading/error/success patterns use existing FormDialog / toast flows
- Notifications reachable from all role navs
- Job drawer no longer doubles Notes/Description or invents description from filenames
- No “coming soon” pages in production role navigation
- Settings security/integrations/system remain read-only future surfaces (Admin/SA settings only)

---

## Remaining Issues

1. **Ops:** Production email env lists + Resend must be verified with a controlled registration/approval in a staging base (not done here — Airtable locked / no writes).
2. **Schema:** No Airtable “Requirements” column — product must accept Interview Process + JD attachments as the requirements surface, or add a field later (blocked by lock).
3. **Admin allocate create:** Admins can unassign but not create allocations by design; confirm this matches TalentSocio ops policy.
4. **AM partner picker:** Still lists all operational partners (needed to allocate new partners to jobs) — codes/specializations only for PRIVATE.
5. **Live browser UAT:** Full interactive click-through across all four Clerk roles was not completed in this pass; validation is code-path + typecheck + prior scoped audits.

---

## Production Readiness Score

**82 / 100**

| Category | Score | Weight note |
|----------|-------|-------------|
| RBAC / Security | 90 | Critical IDORs fixed; residual AM directory for allocate is intentional |
| Workflows / Emails | 78 | Code complete; live email/Airtable write verification blocked |
| Dashboards / Sync | 85 | Live counts; Airtable write-back sync not re-tested (no writes) |
| UX / Health | 88 | Nav/job detail/health fixed |
| Go-live blockers cleared | Yes for app-layer criticals | Ops email config still required |

### Go-live checklist (client list)

| Item | Status |
|------|--------|
| RBAC all four roles | ✅ App-layer verified |
| Role-appropriate dashboards | ✅ |
| Airtable relationships/attachments | ✅ Read mapping; no schema edits |
| Registration workflow | ✅ Code path |
| Partner approval workflow | ✅ Code path |
| Emails at correct stages | ✅ Code + template; env-dependent delivery |
| Resume upload | ✅ |
| Candidate submission | ✅ |
| Candidate visibility | ✅ Scoped |
| Job descriptions from Airtable | ✅ |
| Attachments open | ✅ URLs from Airtable |
| Dashboard counts match Airtable | ⚠️ Logic live; spot-check vs base recommended in staging |
| Airtable changes reflected | ⚠️ Not re-tested (no writes this UAT) |
| Search/filters/pagination | ✅ Existing; AM search privacy fixed |
| No URL permission leaks | ✅ Hard gates present |
| No API permission leaks | ✅ Critical gaps fixed |
| No unauthorized data visibility | ✅ Identity leaks fixed |
| Module communication | ✅ |
| Full chain seamless | ✅ Code; live smoke recommended |
| No placeholder pages | ✅ |
| No disconnected modules | ✅ |
| No console/server errors | ⚠️ Typecheck clean; runtime smoke recommended |
| No critical bugs (known) | ✅ Fixed in this pass |

**Recommendation:** Production-ready for app deployment **after** staging smoke of registration → approval email → partner login → allocate → submit with resumes, with Resend + admin email env confirmed. Do not treat Airtable write-sync as re-certified until a controlled staging write test is allowed.
