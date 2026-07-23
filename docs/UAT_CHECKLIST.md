# UAT Checklist — Client Readiness

**Verdict: READY FOR CLIENT UAT**

Date: 2026-07-23  
Base: Partner Relationship Manager (locked schema)  
Scope: Stability, correctness, production readiness — no new features

---

## Deployment readiness summary

| Check | Status |
|-------|--------|
| Environment variables documented (`.env.example`) | ✅ Pass |
| TypeScript (`tsc --noEmit`) | ✅ Pass |
| ESLint (`eslint . --max-warnings 0`) | ✅ Pass |
| Production build (`next build`) | ✅ Pass |
| Mock repositories | ✅ None |
| Placeholder / under-development pages | ✅ None |
| Friendly Airtable action errors | ✅ Pass |
| Home `/` redirect no longer swallows Next.js redirects | ✅ Pass |
| Super Admin included on Admin mutation roles | ✅ Pass |

---

## Accepted limitations (schema-locked — do not treat as bugs)

| ID | Limitation | Impact |
|----|------------|--------|
| A | Notification read/unread + channel prefs cannot persist | Preferences UI is best-effort / ephemeral |
| B | Historical from→to status transition audit trail | Activity shows current-state derived events only |
| C | Persistent application settings JSON | Settings soft-fail / defaults when Settings table absent |

See `docs/AIRTABLE_ALIGNMENT_REPORT.md` for evidence.

---

## 1. Role journeys

Use real Clerk + Airtable credentials for interactive sign-off. Code paths and RBAC below are verified statically; mark `[x]` during live smoke.

### Super Admin

| Step | Expected | Code/RBAC | Live |
|------|----------|-----------|------|
| Login → `/auth/callback` → `/super-admin` | Dashboard loads | ✅ | [ ] |
| Dashboard / statistics | Live Airtable-derived metrics (soft-fail empty on missing optional tables) | ✅ | [ ] |
| Create Admin (`/super-admin/users` invite) | Invitation marker + email flow | ✅ | [ ] |
| Manage Admins / roles | Role changes gated to super_admin | ✅ | [ ] |
| Settings alias `/super-admin/settings` | Redirects to `/settings` | ✅ | [ ] |
| Logout | Clerk sign-out | ✅ | [ ] |

### Admin

| Step | Expected | Code/RBAC | Live |
|------|----------|-----------|------|
| Login → `/admin` | Dashboard | ✅ | [ ] |
| Create / edit Client | Writes Clients table | ✅ | [ ] |
| Create / edit Job + Account Owner | Writes Jobs (+ AM link) | ✅ | [ ] |
| Manage Talent Partners | Partners CRUD + workspace | ✅ | [ ] |
| Approvals / verification | Partner approve + document verify | ✅ | [ ] |
| Review candidates (read-only list) | Candidates / submissions view | ✅ | [ ] |
| Payouts | Derived payouts + status updates | ✅ | [ ] |
| Logout | Clerk sign-out | ✅ | [ ] |

### Account Manager

| Step | Expected | Code/RBAC | Live |
|------|----------|-----------|------|
| Login → `/account-manager` | Dashboard (scoped jobs) | ✅ | [ ] |
| Assigned jobs | AM-owned jobs only | ✅ | [ ] |
| Allocate Talent Partners | Jobs.Partners multi-link update | ✅ | [ ] |
| Review queue — status change | Workflow transitions → Candidates.Status | ✅ | [ ] |
| Client workspace tabs | Jobs / partners / candidates / activity live | ✅ | [ ] |
| `/account-manager/documents` | Redirect `/forbidden` (privacy by design) | ✅ | [ ] |
| Settings | Redirect `/notifications/preferences` | ✅ | [ ] |
| Logout | Clerk sign-out | ✅ | [ ] |

### Talent Partner

| Step | Expected | Code/RBAC | Live |
|------|----------|-----------|------|
| Public signup `/register` | Creates Partners (pending) | ✅ | [ ] |
| Admin approve → login | Active partner can sign in | ✅ | [ ] |
| Update profile `/partner/profile` | Patches Partners contact fields | ✅ | [ ] |
| Upload verification `/partner/documents` | Resume / document markers | ✅ | [ ] |
| Assigned jobs `/partner/jobs` | Work queue from allocations | ✅ | [ ] |
| Submit candidate | Writes/patches Candidates | ✅ | [ ] |
| Track status `/partner/candidates` | Live status + payouts when joined | ✅ | [ ] |
| Logout | Clerk sign-out | ✅ | [ ] |

### End-to-end workflow (live)

Partner signup → Admin approve → Partner login → Admin client → Admin job → AM allocate partner → Partner submit → AM status → Joined → Payout → Dashboards / search / notifications

| Gate | Live |
|------|------|
| Full path completes without crash | [ ] |
| Each write visible in Airtable | [ ] |
| Dashboards refresh after actions | [ ] |

---

## 2. Routes inventory

All `app/**/page.tsx` routes compile in production build. Intentional redirects are not defects.

### Public / auth

| Route | Notes | Status |
|-------|-------|--------|
| `/` | Landing; signed-in users redirect to role dashboard | ✅ |
| `/sign-in` | Clerk | ✅ |
| `/sign-up` | Redirects to sign-in | ✅ |
| `/register` | Partner registration | ✅ |
| `/register/success` | Confirmation | ✅ |
| `/invite/[token]` | Staff invite accept | ✅ |
| `/auth/callback` | Post-login role router | ✅ |
| `/unauthorized` | Inactive / unlinked identity | ✅ |
| `/forbidden` | Wrong role | ✅ |

### Super Admin

| Route | Status |
|-------|--------|
| `/super-admin` | ✅ |
| `/super-admin/users` | ✅ |
| `/super-admin/settings` → `/settings` | ✅ |

### Admin

| Route | Status |
|-------|--------|
| `/admin` | ✅ |
| `/admin/approvals` | ✅ |
| `/admin/clients`, `/admin/clients/[clientId]` | ✅ |
| `/admin/jobs` | ✅ |
| `/admin/partners`, `/admin/partners/[partnerId]` | ✅ |
| `/admin/allocations` | ✅ |
| `/admin/candidates` | ✅ |
| `/admin/documents` | ✅ |
| `/admin/payouts` | ✅ |
| `/admin/settings` → `/settings` | ✅ |

### Account Manager

| Route | Status |
|-------|--------|
| `/account-manager` | ✅ |
| `/account-manager/clients`, `/[clientId]` | ✅ |
| `/account-manager/jobs` | ✅ |
| `/account-manager/allocations` | ✅ |
| `/account-manager/candidates` | ✅ |
| `/account-manager/payouts` | ✅ |
| `/account-manager/documents` → `/forbidden` | ✅ (by design) |
| `/account-manager/settings` → `/notifications/preferences` | ✅ |

### Talent Partner

| Route | Status |
|-------|--------|
| `/partner` | ✅ |
| `/partner/jobs` | ✅ |
| `/partner/candidates` | ✅ |
| `/partner/documents` | ✅ |
| `/partner/payments` | ✅ |
| `/partner/profile` | ✅ |

### Shared (authenticated)

| Route | Status |
|-------|--------|
| `/activities` | ✅ |
| `/notifications`, `/notifications/preferences` | ✅ |
| `/search` | ✅ |
| `/settings` (+ company, users, recruitment, payouts, notifications, security, integrations, system) | ✅ Admin / Super Admin |

### API

| Route | Status |
|-------|--------|
| `/api/health` | ✅ |
| `/api/auth/me` | ✅ |
| `/api/lookups/*` | ✅ |

---

## 3. Forms

| Expectation | Status |
|-------------|--------|
| Zod / react-hook-form validation on CRUD forms | ✅ |
| Submitting shows disabled / loading labels | ✅ |
| Success toasts (`sonner`) on completed actions | ✅ |
| Failures return `{ success: false, message }` via `actionErrorMessage` | ✅ |
| Next.js `redirect()` inside actions is not swallowed | ✅ |
| No silent catch-all that hides failures | ✅ |

---

## 4. Airtable CRUD

| Domain | Read | Write / Update | Archive / soft-delete | UI refresh |
|--------|------|----------------|------------------------|------------|
| Clients | ✅ | ✅ | ✅ archive | `revalidatePath` |
| Jobs | ✅ | ✅ | ✅ archive | ✅ |
| Partners | ✅ | ✅ | ✅ archive | ✅ |
| Allocations (Jobs.Partners) | ✅ | ✅ allocate | ✅ archive | ✅ |
| Candidates / submissions | ✅ | ✅ submit + status | N/A hard delete | ✅ |
| Documents (derived) | ✅ | ✅ upload / verify | ✅ archive marker | ✅ |
| Payouts (derived) | ✅ | ✅ status / notes | N/A | ✅ |
| Notifications / Activities / Settings tables | Soft-fail empty when unset | Soft-fail | — | ✅ |

---

## 5. Permissions

| Attempt | Expected | Status |
|---------|----------|--------|
| Unauthenticated → protected route | Clerk → `/sign-in` | ✅ middleware |
| Partner → `/admin/*` | `/forbidden` | ✅ RoleLayout |
| Admin → `/partner/*` | `/forbidden` | ✅ |
| Admin → `/super-admin/*` | `/forbidden` | ✅ |
| AM → `/settings` | `/forbidden` | ✅ |
| AM → partner documents | `/forbidden` | ✅ |
| Super Admin client/partner/document/payout mutations | Allowed (`admin` + `super_admin`) | ✅ |

---

## 6. Debug / dead code cleanup

| Item | Status |
|------|--------|
| `console.log` in app source | ✅ None |
| Placeholder modules | ✅ Removed |
| Mock repositories | ✅ None |
| Server `console.error` on soft-fail paths | Kept (ops logging only; not UI) |
| `EMAIL_PROVIDER=console` → `console.info` | Intentional email sink |

---

## 7. Error handling

| Item | Status |
|------|--------|
| Airtable API errors wrapped (`AirtableOperationError`) | ✅ |
| UI messages via `toUserFacingAirtableMessage` / `actionErrorMessage` | ✅ |
| Missing optional tables soft-fail (empty lists / friendly writes) | ✅ |
| No raw stack traces to clients | ✅ |

---

## 8. Performance notes

| Item | Status |
|------|--------|
| `getAppSession` memoized with React `cache` | ✅ |
| Client workspace loads allocations/submissions per job (scoped filters) | ✅ |
| Dashboard sources use settled / soft-fail (no hard crash on optional tables) | ✅ |
| Search segments isolate failures | ✅ |

---

## 9. Known issues (non-blocking for UAT start)

1. **Notification preferences / read state** — accepted limitation A; UI may not persist across sessions.
2. **Activity “from→to” history** — accepted limitation B.
3. **Platform settings persistence** — accepted limitation C when Settings table blank.
4. **Partner without `partnerId` on session** — redirected to `/unauthorized` until identity linked (expected).
5. **Interactive multi-role browser UAT** — requires client credentials; checklist Live columns above.

---

## 10. Sign-off

| Role | Prepared for UAT |
|------|------------------|
| Engineering (build / types / lint / RBAC / error paths) | ✅ Complete |
| Client UAT (live journeys with production Airtable) | Ready to begin |

**READY FOR CLIENT UAT** — application is stable for client testing against the locked Airtable schema. Use the Live checkboxes in §1 during the client session; treat only Confirmed Blockers A–C as known non-defects.
