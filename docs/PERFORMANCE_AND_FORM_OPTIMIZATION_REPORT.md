# Performance + Candidate Form Optimization Report

**Date:** 2026-07-29  
**Constraint:** Airtable schema unchanged

---

## Bottlenecks identified

| # | Bottleneck | Impact |
|---|------------|--------|
| 1 | Global `router.refresh()` every **15s** on all authenticated pages | Dominated perceived lag — full layout + Airtable storms |
| 2 | `listSubmissions` partner filter re-scanned full table **per call** with no request dedupe | Partner dashboard / jobs / candidates each paid full scan |
| 3 | Submissions enrichment N+1 `getCandidateById` even in candidates mode (name already on row) | Hundreds of Airtable finds |
| 4 | Allocations enrichment called fully enriched `listSubmissions()` for counts | Double full pipeline |
| 5 | Admin dashboard fetched review queue **and** all submissions separately | 2× submissions + 2× enrichment |
| 6 | AM dashboard same double-fetch pattern | Same |
| 7 | Partner candidates/payments ran `ensurePayoutForSubmission` per row on every load | Write amplification on read paths |
| 8 | Submit dialog did `push` + `refresh` (+ parent refresh) | Triple reload after submit |
| 9 | Candidate form had unused recruiter fields | Slower submit UX |

---

## Optimizations made

### Performance
- Live sync: **60s** interval + **25s** debounce (focus/visibility)
- `React.cache` full submissions scan (`loadAllSubmissionsCached`) — one scan per RSC request
- `cache(getJobById)` / `cache(getCandidateById)` request dedupe
- Candidates-mode enrichment **skips** candidate N+1 finds
- `listSubmissions({ enrich: false })` for allocation count maps
- Admin/AM dashboards: **one** submissions fetch; derive review metrics in memory
- Removed page-load payout ensure loops (create-on-submit only)
- Narrower submit `revalidatePath` set
- Review queue: optimistic local status update before soft refresh
- Submit dialog: single navigation (no double refresh)

### Candidate form (recruiter-minimal)
Required: Name, Email, Phone, Resume, Current Location, Notice Period  
Optional: Current CTC, Expected CTC, LinkedIn (last)  
Removed from UI: Current Company, Skills, Remarks, Experience  
Backend still compatible — unused Airtable fields left empty; LinkedIn mapped when provided

### Form UX
- Blur validation, clear required markers  
- Submit disabled while uploading; lock against double-submit  
- Resume filename feedback  
- Meaningful toasts; modal closes on success  

---

## Files modified

- `hooks/use-live-data-sync.ts`
- `components/layout/dashboard-shell.tsx`
- `features/submissions/services/submissions.service.ts`
- `features/submissions/services/submissions.mapper.ts`
- `features/submissions/types/index.ts`
- `features/submissions/actions/submissions.actions.ts`
- `features/submissions/components/submit-candidate-dialog.tsx`
- `features/allocations/services/allocations.service.ts`
- `features/dashboard/services/dashboard.service.ts`
- `features/jobs/services/jobs.service.ts`
- `features/candidates/services/candidates.service.ts`
- `features/candidates/services/candidates.mapper.ts`
- `features/candidates/schemas/candidate.schema.ts`
- `features/candidates/components/candidate-form.tsx`
- `features/shared/entities/candidate.entity.ts`
- `features/tasks/components/review-queue-page-client.tsx`
- `app/(partner)/partner/candidates/page.tsx`
- `app/(partner)/partner/payments/page.tsx`

---

## Estimated improvements

| Area | Estimate |
|------|----------|
| Background refresh load | ~75% fewer full-app refreshes (15s → 60s + debounce) |
| Partner page RSC (same request reuse) | Often **1** submissions scan instead of 3–5 |
| Candidates-mode list enrichment | Eliminate N candidate finds (often 50–200+ calls) |
| Admin dashboard | ~50% fewer submissions pipeline runs |
| Partner candidates/payments load | Remove N payout ensure writes/reads |
| Submit flow | One navigation instead of refresh storms |

Exact wall-clock gains depend on Airtable latency and table size.

---

## Remaining risks

1. First load of a page that needs all submissions still downloads the full Candidates table once (schema-locked; no ID-based linked filter). Pagination/views would help later without schema change if using Airtable views.
2. Live sync is soft (≤60s), not websocket push — tab focus refreshes sooner.
3. Search and some workspace loaders can still over-fetch (next pass).
4. Large N+1 patterns remain in payouts/documents enrichment paths.

`npx tsc --noEmit` passes.
