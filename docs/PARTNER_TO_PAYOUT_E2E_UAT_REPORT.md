# Talent Partner → Payout E2E UAT Report

**Date:** 2026-07-29  
**Scope:** Partner lifecycle from Job assignment through Payout  
**Airtable:** Schema locked (app-only fixes)

---

## Payout eligibility (confirm with client)

**Implemented rule (from `docs/10_BUSINESS_RULES_UPDATE.md` + code):**

> **Joined → Eligible for Payout → Processing → Paid → Completed**  
> Rejected candidates never become payout eligible.

| Stage | App behavior |
|-------|----------------|
| Candidate submitted | Payout row created as **Not Eligible** (when Payouts table exists) |
| Screening → Interview → Offer | Status notifications; payout stays not eligible |
| **Joined** | Payout auto-promoted to **Eligible** + partner notified |
| Manual Mark Eligible | Allowed only if submission status is **Joined** |

If the client’s real rule is different (e.g. 90-day guarantee after Joined, or Shortlisted), say so and we will adjust `markPayoutEligibleOnJoined` / validation.

---

## Issues found & fixed

| # | Issue | Root cause | Fix |
|---|--------|------------|-----|
| 1 | Joined did not create/update payout eligibility | Workflow never touched payouts | `markPayoutEligibleOnJoined` on Joined transition |
| 2 | AM could mark Eligible before Joined | Business rules not enforced | Block `eligible` unless submission is `joined` |
| 3 | Unassign sent no partner notice | `archiveAllocation` had no notify | `notifyJobUnassigned` (in-app + email) |
| 4 | Archived allocation still counted as “owns job” | `assertPartnerOwnsJob` used `includeArchived: true` | Active statuses only |
| 5 | Re-assign blocked after soft archive | Duplicate check treated any non-archived/completed row | Duplicate = active (`assigned`/`working`) only |
| 6 | Weak resume validation | Size/type only partially checked | Client + server PDF/DOC/DOCX + 8MB |
| 7 | Status/payout pages stale after Joined | Narrow revalidate set | Revalidate payouts + partner payments |

**Kept by product request:** Admin may assign Talent Partners to jobs (`manage_allocations`).

---

## Step validation (code-path)

| Step | Result |
|------|--------|
| 1 Assign job | `allocatePartner` → `notifyJobAssigned` + AM notify; `revalidatePath` `/partner`, `/partner/jobs`; duplicate blocked for active only |
| 2 Partner login | Dashboard/work queue from `listPartnerWorkTasks` / `listPartnerSubmissions` |
| 3 Open job | Shared `JobDrawer`: ID, client, title, description, skills, exp, location, salary, employment, seniority, interview process, docs |
| 4 Submit | Simplified form + resume validation; meaningful errors |
| 5 After submit | Atomic Role+Partner create; resume bind; payout `not_eligible` ensure |
| 6 Real-time | Mutation revalidate + live sync (60s / focus); allocate/submit UI refreshes on complete |
| 7 AM | Scoped candidates by owned jobs; notify on submit |
| 8–9 Admin/SA | Shared candidates list + dashboards from `listSubmissions` |
| 10 Status pipeline | Graph: submitted→…→joined/rejected; AM-only transitions; partner notified per stage |
| 11 Payout | Created on submit; **Eligible on Joined**; visible partner/AM/admin |
| 12 Unassign | Archive/remove link; partner notified; job drops from active queue; submit blocked |
| 13 Reassign | Allowed after unassign (active-only duplicate rule) |
| 14 Airtable direct edits | Soft sync via poll/focus (not instantaneous push) |
| 15 Full chain | Gaps above closed in app layer |

---

## Synchronization strategy

1. **Writes:** `revalidatePath` on allocate / unassign / submit / status / payout  
2. **RSC:** `noStore()` on dashboards & candidate pages  
3. **Client:** `useLiveDataSync` (60s + focus debounce) for Airtable-direct changes  
4. **Optimistic:** Review queue status updates locally before soft refresh  

---

## RBAC verification

| Role | Assign TP | Review status | Payout update | See only own scope |
|------|-----------|---------------|---------------|--------------------|
| Super Admin | Yes | No (view) | Yes (manage) | Global |
| Admin | Yes | No (view) | Yes (manage) | Global |
| Account Manager | Yes (owned jobs) | Yes | Yes (owned) | Owned clients/jobs |
| Partner | No | No | Read own earnings | Own allocations/submissions |

---

## Files modified

- `features/workflows/services/workflow.service.ts`
- `features/workflows/actions/workflows.actions.ts`
- `features/payouts/services/payouts.service.ts`
- `features/payouts/services/index.ts`
- `features/allocations/services/allocations.service.ts`
- `features/notifications/services/notification-events.ts`
- `features/notifications/types/index.ts`
- `features/submissions/actions/submissions.actions.ts`
- `features/candidates/components/candidate-form.tsx`
- `lib/auth/scope.ts`
- `services/email/types.ts`
- `services/email/templates.ts`

---

## Remaining issues / risks

1. **Live browser UAT** with four Clerk roles + Resend not executed in this pass — recommend staging smoke of Assign → Submit → Joined → Eligible → Unassign.  
2. Soft real-time is **≤60s** (or on focus), not websocket push.  
3. If Payouts table is absent on the client base, payout steps soft-skip (logged); recruitment flow still works.  
4. Confirm with client whether Eligible should wait for a **guarantee period** after Joined.

`npx tsc --noEmit` passes.
