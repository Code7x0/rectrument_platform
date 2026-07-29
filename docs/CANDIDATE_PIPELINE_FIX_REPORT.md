# Candidate Pipeline Fix Report

**Date:** 2026-07-29  
**Constraint:** Airtable schema locked — app-only fixes

---

## Root causes

### 1. Submission failure → generic toast

**Cause:** Every Airtable SDK error became `AirtableOperationError`, then `toUserFacingAirtableMessage` **discarded** the sanitized detail and always returned *"Unable to save or load data right now. Please try again."*

**Contributing write failures (candidates mode):**
- Dual-write of **Job + Role** on the locked base (Role is the live link; Job often rejects)
- `Submission Date` written as full ISO datetime instead of `YYYY-MM-DD`
- Non-atomic flow: person create → resume → link patch — link failure left resume-only orphans

### 2. Stale Partner dashboard / missing candidates after Airtable or app submit

**Primary cause:** `listSubmissions({ partnerId })` used  
`FIND('rec…', ARRAYJOIN({Submitted By (Partner)}))`.  
`ARRAYJOIN` on linked records returns **primary field names**, not record IDs — so partner-scoped lists and dashboard counts silently returned **empty**.

Admin lists (no partner formula) could still see rows → counts drifted by role.

### 3. Resume uploaded but candidate invisible / counts wrong

**Cause:** Create person + resume first, then patch Job/Partner. If the patch failed, Airtable showed a resume, but the app mapper **requires** Job/Role + Partner — row skipped → not in Candidates, work-queue counts from submissions stayed flat. Allocation `profilesSubmitted` is always `0` in `job_partners` mode (no counter column).

### 4. Source-of-truth drift

SA “Candidate Count” used `findCandidates({})` (all rows, including unlinked orphans) while Candidates pages used `listSubmissions` (linked only).

---

## Fixes implemented

| Area | Change |
|------|--------|
| Partner/job filters | In-memory filter by mapped `partnerId`/`jobId` in candidates mode |
| Submit create | Atomic create: person + Role + Partner + status + date, then resume |
| Link fields | Write **Role only** (not Job) on locked base |
| Dates | `YYYY-MM-DD` for Submission Date |
| Errors | Surface sanitized Airtable operation messages; log server-side on submit |
| Sort resilience | Retry unsorted if Airtable sort fails |
| Counts SoT | SA Candidate Count = `listSubmissions` length (same as Candidates page) |
| Allocation counters | Derive `profilesSubmitted` from `listSubmissions` in `job_partners` mode |
| AM Candidates | All submissions on owned jobs (same SoT as dashboard Submissions) |
| Live sync | `useLiveDataSync` — 15s polling + focus/visibility `router.refresh()` in `DashboardShell` |
| Cache | `noStore()` on partner/admin/AM candidates + partner jobs; `revalidatePath` includes `/super-admin` |

---

## Synchronization strategy

Airtable has no webhook in this stack. Strategy:

1. **Mutations:** `revalidatePath` on submit/status change for all role surfaces  
2. **RSC freshness:** `unstable_noStore()` on dashboards and candidate/job list pages  
3. **Live refresh:** client `useLiveDataSync(15000)` in the shared shell — refreshes when the tab is visible, on window focus, and on an interval so Airtable-direct edits appear without manual reload  
4. **Single list API:** `listSubmissions` / `listPartnerSubmissions` for lists **and** metrics

---

## Files modified

- `lib/airtable/errors.ts`
- `lib/actions/errors.ts`
- `lib/navigation/index.ts`
- `features/submissions/services/submissions.mapper.ts`
- `features/submissions/services/submissions.service.ts`
- `features/submissions/repositories/submissions.repository.ts`
- `features/submissions/actions/submissions.actions.ts`
- `features/allocations/services/allocations.service.ts`
- `features/dashboard/services/dashboard.service.ts`
- `hooks/use-live-data-sync.ts` *(new)*
- `components/layout/dashboard-shell.tsx`
- `app/(partner)/partner/candidates/page.tsx`
- `app/(partner)/partner/jobs/page.tsx`
- `app/(admin)/admin/candidates/page.tsx`
- `app/(account-manager)/account-manager/candidates/page.tsx`

---

## Remaining issues / notes

1. Manual Airtable rows still need **Role (or Job) + Submitted By (Partner)** to appear in app lists (by design for candidates-as-submissions). Person-only rows remain invisible to the pipeline.
2. Live sync interval is 15s (not instantaneous). Focus/visibility refresh is immediate when returning to the tab.
3. Large Candidates tables: partner filter loads then scopes in memory (correctness over formula). Optimize with Airtable views later if needed — no schema change.
4. End-to-end browser smoke with live Clerk + Airtable should confirm Role status option `"Pending Review"` matches the base (mapping already includes it).

`npx tsc --noEmit` passes.
