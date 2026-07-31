# Product Stabilization Report

Date: 2026-07-31  
Scope: Performance, live UI freshness, notifications, communications — **no** Airtable schema / business-workflow changes.

---

## 1. Performance improvements made

| Area | Change |
|------|--------|
| Submissions enrichment | Replaced N× `getJobById` / N× `getCandidateById` with request-scoped `listJobs` + one Candidates table scan (`cache`) |
| Payouts enrichment | Parallel `listSubmissions({ enrich: false })` + `listJobs` + `findCandidates` instead of per-row job/candidate finds |
| Partner work queue | Parallel allocations + submissions + `listJobs` (no N× job finds) |
| AM dashboard | `listSubmissions({ enrich: false })` + in-memory job title map from already-loaded jobs |
| AM Candidates page | Same enrich:false + jobs map pattern |
| Admin / SA dashboards | Submissions loaded without secondary enrichment; titles joined from jobs already fetched |
| Layout tax | Role / search / settings / notifications / activities layouts use **one** notifications list query (unread from same result) instead of unread + list |
| Live sync cost | Safety-net full RSC refresh **45s → 90s**; pulse **8s → 6s** with richer fingerprint so fewer wasteful full reloads |

---

## 2. Root causes of slow loading (~10s)

1. **N+1 Airtable finds** during enrichment (`getJobById` / `getCandidateById` per row) on submissions, payouts, and partner tasks.
2. **Full table scans + enrichment** stacked on dashboards (submissions enriched even when jobs were already in memory).
3. **Duplicate notification queries** on every authenticated layout (unread count + recent list).
4. **Aggressive 45s `router.refresh()`** re-running expensive RSC trees even when nothing changed.
5. Pulse fingerprint that **ignored CRM changes** still forced reliance on full refresh intervals.

---

## 3. Root causes of stale UI (manual refresh)

1. **`getSyncFingerprint` only watched notifications** — candidate/job/status changes did not move the pulse unless a notification row was written for that user.
2. **Error fingerprint used `Date.now()`** — pulse errors caused continuous full refreshes or chaotic refresh behavior.
3. **Cross-user freshness** depended on the slow safety-net interval when the actor’s tab signaled locally but other users had no CRM pulse.
4. Some mutation UIs refreshed locally but **did not broadcast** `signalLiveDataChange` (documents, unassign dialog, client jobs tab, notification mark-read).

### Fixes

- Fingerprint now includes **latest CRM submission head** (id + date + status) plus notification head/unread.
- Stable `err-stable` fingerprint on pulse failures.
- `signalLiveDataChange` wired on document verify/upload, job partner unassign, client jobs mutations, notification mark-all / mark-read.
- Faster pulse interval so other open sessions pick up CRM/notification changes within ~6s without a browser refresh.

---

## 4. Notification fixes

| Issue | Fix |
|-------|-----|
| Candidate submitted → Admin only | Also notifies **`super_admin`** |
| Duplicate burst inserts | Short-TTL **dedupe** in `publishNotification` (recipient + type + entity + title) |
| Derived-mode unread badge always 0 | `getUnreadNotificationCount` falls back to **derived** feed when notifications storage is unavailable |
| Stale badge / other tabs | Mark read / mark all call `signalLiveDataChange` |
| Layout double-fetch | Single `listNotificationsForUser` supplies badge + dropdown |

Existing events retained: registration → SA/Admin; approval → partner; assign/unassign jobs; status changes → partner; documents; payouts.

---

## 5. Communication audit results

| Trigger | In-app | Email | Production note |
|---------|--------|-------|-----------------|
| Partner registration | SA + Admin | `partner_registration_submitted` (where wired) | Ready |
| Partner approval | Partner | Welcome/`approval` via onboarding | Ready |
| Job assign / unassign | Partner (+ AM variants) | `job_*` / `manager_job_*` | Ready |
| Candidate submitted | AM + Admin + SA | `candidate_submitted` (AM) | Ready |
| Status change | Partner | `candidate_status_changed` / `candidate_joined` | Ready |
| Documents / payouts | Partner / staff | `document_*` / `payout_*` | Ready |

**Email provider:** `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` + `EMAIL_FROM` (+ `NEXT_PUBLIC_APP_URL`). Without keys, console provider logs sends; triggers do not hard-fail. Email send path already has burst dedupe.

---

## 6. Remaining production risks

1. **Airtable is still the bottleneck** — large bases will remain multi-second on cold full-table reads; further gains need pagination/indexes or an edge cache (schema/workflow unchanged).
2. **Cross-user sync is soft real-time (~6s pulse)**, not WebSocket push; actor sees immediate refresh via `signalLiveDataChange`.
3. **Derived notifications** (no Notifications table) cannot persist read state — badges stay “unread” until storage is configured.
4. **AM user-id mapping** still depends on Users ↔ Account Managers links/email; mislinked AMs silently miss in-app/email on submit.
5. **No automated E2E** of the full partner→hire simulation was run in this environment against live Airtable credentials.

---

## Verification checklist (manual)

- [ ] Dashboard loads noticeably faster than ~10s baseline  
- [ ] Submit candidate → AM/Admin/SA notification + lists update without F5  
- [ ] Status change → partner notification + dashboards refresh via pulse  
- [ ] Unassign partner → partner loses job access on next pulse / local signal  
- [ ] With Resend keys unset, console still logs email attempts for key events  
