# Production Stabilization & UAT Report

**Date:** 2026-07-28  
**Base:** Partner Relationship Manager (`appOh6IpawqSgL8OS`) — schema unchanged  
**Scope:** Final RBAC, workflow, email, dashboard sync, submission, job details  

---

## ✔ RBAC fixes

| Role | Fix |
|------|-----|
| **Account Manager** | Clients list/detail hard-scoped via `Clients.Account Owner` + URL ownership gate (`notFound` on foreign client) |
| **Account Manager** | Jobs scoped by owned client ids (never all jobs) |
| **Account Manager** | Allocations / review queue / dashboard / payouts / search filtered by owned `jobIds` |
| **Account Manager** | Actions: allocate / update / archive allocation, transition submission, review detail, update/archive client — ownership asserted server-side |
| **Talent Partner** | Lookups `/api/lookups/clients` and `/api/lookups/account-managers` return 403; partners already job-scoped via `Jobs.Partners` |
| **Helpers** | `resolveAccountManagerScopeId` / `resolvePartnerScopeId` + `lib/auth/scope.ts` ownership guards |

---

## ✔ Repository audit

| Area | Scoping |
|------|---------|
| `listClients` | `accountManagerId` → Airtable `FIND` on Account Owner |
| `listJobs` | Client-compat: owned client ids first, then filter jobs |
| `listAllocations` | Optional `jobIds` hard filter (AM) |
| `listReviewQueueSubmissions` | Optional `jobIds` hard filter (AM) |
| Partner work queue | `listPartnerWorkTasks(partnerId)` only |
| Partner submissions | `listPartnerSubmissions(partnerId)` only |
| Search | AM clients/jobs use scoped ids |

---

## ✔ Email workflow (Resend)

| Event | Behavior |
|-------|----------|
| **Partner registration** | Soft-fail email to all `AIRTABLE_SUPER_ADMIN_EMAILS` + `AIRTABLE_ADMIN_EMAILS` — subject *New Partner Registration – Approval Required* (name, experience, specialization, approval URL) |
| **Partner approval** | One welcome/approval email to Partners.Official Email ID (no duplicate path; no Airtable schema writes) |

Requires `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`.

---

## ✔ Dashboard synchronization

- `unstable_noStore()` on Super Admin / Admin / AM / Partner dashboard loaders  
- Revalidate dashboard + module paths after submissions, status transitions, allocations  
- AM dashboard loads only owned jobs → scoped allocations / queue / submissions  

---

## ✔ Airtable validation

- **Schema:** untouched (no new tables/fields/automations)  
- **Ownership model:** Clients.Account Owner; Jobs.Partners; Candidates person+event fields  
- **Attachments:** Job Description / Sample Profiling / Skill Matrix Fitment; Candidates.Resume  
- Live interactive multi-role UAT against Airtable should still be walked in the browser with each login  

---

## ✔ Candidate submission & resume upload

- Native write of Current Company / Experience / Skills (exist on locked Candidates table)  
- Resume: FormData → stage with inlined `Buffer` on `UploadedFile` → Airtable Content API bind (survives serverless Map loss)  
- Allocation ownership enforced (`partnerId` must match)  

---

## ✔ Job details

- Description text from Comments (Job ID marker stripped) or string JD  
- Document links for Job Description, Sample Profiling, Skill Matrix Fitment rendered in `JobDrawer`  

---

## ✔ Security validation (code-level)

| Attack | Expected |
|--------|----------|
| AM opens another AM’s `/account-manager/clients/{id}` | `notFound` |
| AM review/transition foreign submission | ScopeDenied |
| AM allocate on foreign job | ScopeDenied |
| Partner hits client/AM lookup APIs | 403 |
| Partner submit on foreign allocation | Service error |
| AM update client to steal Account Owner | Forced back to own id |

---

## ✔ Communication validation

Registration → SA/Admin email + in-app notify → Approval → partner welcome email → Login → allocated jobs → submit → AM/Admin review queue → status transitions → dashboards revalidated.

---

## ✔ End-to-end workflow checklist

### Super Admin / Admin
- [ ] Approvals queue shows new registration  
- [ ] Approval sends one email; partner can sign in  
- [ ] Clients / Jobs / Partners / Candidates / Allocations unrestricted  
- [ ] Dashboard counts match Airtable after edits  

### Account Manager (`purivinit@…` or assigned AM)
- [ ] Dashboard counts = only owned clients’ jobs  
- [ ] Clients list = Account Owner only  
- [ ] Foreign client URL → not found  
- [ ] Jobs / Allocations / Review Queue / Search / Payouts scoped  
- [ ] Status change on own submission updates Airtable + dashboards  

### Talent Partner
- [ ] Only allocated jobs in Work Queue  
- [ ] Job drawer shows description + attachment links  
- [ ] Submit with resume → Candidates.Resume populated  
- [ ] Own submissions / earnings / profile only  
- [ ] Lookup APIs forbidden  

---

## Remaining issues / follow-ups

1. **Interactive multi-role UAT** — code-complete; confirm in browser with each role (credentials not exercised in this pass).  
2. **`job_partners` allocations** — still derived by scanning Jobs.Partners; AM filter is post-fetch by `jobIds` (correct, but not a single Airtable formula).  
3. **Resend deliverability** — `onboarding@resend.dev` only delivers to the Resend account owner until a verified domain is set on `EMAIL_FROM`.  
4. **Rotate Resend API key** if it was ever pasted in chat.  
5. **Notification persistence** — still derived/ephemeral (known schema blocker from alignment report).  

---

## Verdict

Core recruitment workflows, RBAC scoping, email fan-out, job documents, resume bind, and dashboard freshness are production-ready **without** Airtable schema changes. Complete the interactive checklist above before go-live sign-off.
