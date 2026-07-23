# Airtable Alignment Report — Second Pass (Schema Locked)

**Base:** Partner Relationship Manager (`appOh6IpawqSgL8OS`)  
**Schema:** LOCKED — zero tables/fields created, renamed, or deleted  
**Audit date:** 2026-07-23 (second pass)  
**Burden of proof:** A blocker remains only if no existing table/field/link/attachment/formula/lookup can support the feature.

All eight client tables were re-inspected: Partners, Clients, Jobs, Candidates, Candidates_MV, Candidate Snapshot, Role, Account Managers.

---

## Confirmed Supported Features

These work by reading/writing **existing** Airtable structures (no schema change).

| Feature | Tables / fields used |
|---------|----------------------|
| Client CRUD | Clients (Client Name, Client ID, Industry, Website, Status, Notes, Account Owner, …) |
| Job CRUD | Jobs (Job Title, Client, Status, Comments, Years of Exp, Salary Range, Location, Department, Partners, Job Description attachments, …) |
| Partner CRUD | Partners (Partner Code, Contact Name, Company Name, Official Email ID, Phone Number, Status, Specialization, Performance Notes, Location, Resume, …) |
| Allocations | Jobs.Partners multi-link |
| Candidate submit / review / offer / joined | Candidates (Candidate Name, Email, Phone Number, Job, Submitted By (Partner), Submission Status, Resume, CTC fields, Screening Matrix Notes., Submission Date, …) |
| Account Manager directory | Account Managers (Name, Email, Status, Mobile Number, Clients) |
| Authentication (AM / Partner) | Account Managers.Email + Partners.Official Email ID / Personal Email + Clerk |
| Super Admin / Admin login | `AIRTABLE_SUPER_ADMIN_EMAILS` / `AIRTABLE_ADMIN_EMAILS` (env — not Airtable columns) |
| Partner registration / approval | Partners.Status `Probation` → `Active` / `Inactive` |
| Staff invitation create + token accept | Account Managers.Comments (`invite:<token>:<expiry>`) |
| Dashboards (CRM metrics) | Clients, Jobs, Partners, Candidates (+ derived modules below) |
| Global Search (CRM segments) | Same live tables |
| Document list / verify / reject | Partners.Resume + Performance Notes markers |
| Payout list / status updates | Candidates + Jobs.Payout (%) + Partners.Communications markers |
| Activity timeline (current-state feed) | Candidates.Submission Status + Submission Date |
| Notification inbox (live feed) | Derived from recent Candidates (and partner scope) |
| Settings (read defaults) | In-app defaults when no Settings table |

---

## Derived Features

Implemented **without** new Airtable storage tables — by mapping or computing from existing data.

### 1. Users / Authentication (blocker removed)

**How:**  
- Talent Partner ↔ Partners record (email + Status).  
- Account Manager ↔ Account Managers record (email + Status).  
- Super Admin / Admin ↔ env email allow-lists.  
- Session via Clerk email → record id; `partnerId` / `accountManagerId` = record id.  
- Partner “last login” → Partners.**Last Engaged Date**.  
- Staff invite token → Account Managers.**Comments** marker `invite:<token>:<expiry>`; lookup via `FIND`.

**Tables inspected:** Partners, Account Managers, Role, Clients.Account Owner, Partners.Owner (collaborator — Airtable user, not app user).

### 2. Documents (blocker removed)

**How:**  
- Files live in Partners.**Resume** (multipleAttachments).  
- Type inferred from filename (`pan` / `aadhaar` / `agreement`).  
- Verify/reject persisted as `[RP_DOC]` markers in Partners.**Performance Notes** (existing multilineText).

**Also inspected:** Clients.Client Brief Deck, Jobs.Job Description / Sample Profiling / Skill Matrix Fitment (client/job assets — not partner KYC), Candidates.Resume (candidate CVs), Account Managers.Attachment Summary (AI text only; no Attachments field present in schema).

### 3. Payouts (blocker removed)

**How:**  
- Estimate = Jobs.**Payout** (percent) × parsed Jobs.**Salary Range**.  
- Eligibility from Candidates.**Submission Status** (`Joined` → eligible).  
- Paid / processing / completed + optional amount → `[RP_PAYOUT]` markers in Partners.**Communications**.

**Also inspected:** Partners.**Partners Revenue** (free text, not a ledger), Candidate Snapshot Joined/Offered counts (aggregates only).

### 4. Activities / Timeline (partial — current-state feed)

**How:**  
- Feed entries = Candidates rows with Submission Status + Submission Date (+ name).  
- No separate Activities table required for a usable timeline.

**Also inspected:** Partners.Created Time / Last Engaged Date; Jobs.Posted Date / Start Date; Candidate Snapshot.Snapshot Date; Candidates.Created By. **No** last-modified-time or status-history fields on any table.

### 5. Notifications (partial — ephemeral feed)

**How:**  
- Inbox generated from recent Candidates status rows scoped to partner (or global for staff).  
- Persistent unread / prefs not required for operational awareness.

### 6. Allocations & Submissions

**How:** Already mapped — Jobs.Partners; Candidates as submission events.

---

## Confirmed Blockers

Only items that remain **mathematically unsupported** after exhausting the schema. Everything else was reclassified as supported or derived.

### Blocker A — Per-user notification read / archive / channel preferences

| | |
|--|--|
| **Feature** | Persist that user X marked notification Y read; store email/in-app prefs per user |
| **Why impossible** | No record type is keyed by (viewer user × event). No checkbox/select for read state. No prefs JSON field. |
| **Tables inspected** | All 8. Closest free-text: Partners.Communications, Account Managers.Comments — these are **entity** notes, not per-viewer inbox state, and cannot store independent read flags for every admin/AM viewing the same candidate event without colliding. |
| **Fields inspected** | Communications, Comments, Performance Notes, Notes, Owner (collaborator), Created By — none are multi-user read receipts. |
| **Evidence** | Zero fields of type that encode “user U read item I”. Derived feed remains always-unread for UX; mark-read is a no-op/friendly error when no Notifications table. |

### Blocker B — Immutable from→to status audit history

| | |
|--|--|
| **Feature** | Show every past transition (e.g. Pending Review → Interviewing → Offered) with actor + timestamp |
| **Why impossible** | Candidates store only **current** `Submission Status`. Overwriting status destroys prior value. No changelog / lastModifiedTime field exists on Candidates (or any table in this base). |
| **Tables inspected** | Candidates, Candidates_MV, Candidate Snapshot, Jobs, Partners, Account Managers |
| **Fields inspected** | Submission Status, Interview Stage, Submission Date, Created By, Created Time (Partners only), Last Engaged Date, Snapshot counters — counters are aggregates, not per-candidate history. |
| **Evidence** | After status update, Airtable retains one select value; timeline can show *current* state + submission date only. |

### Blocker C — Platform settings document persistence

| | |
|--|--|
| **Feature** | Persist company/platform settings singleton across deploys |
| **Why impossible** | No Settings table; no unused singleton JSON field dedicated to app config. Using Client/Partner Notes would corrupt CRM operator text. |
| **Tables inspected** | All 8 |
| **Fields inspected** | Notes / Comments / Communications / Performance Notes — operational CRM content, not safe as exclusive app config without colliding with human edits. |
| **Evidence** | App keeps in-memory defaults; writes require a dedicated store that does not exist. |

### Blocker D — Three independent partner KYC attachment *columns*

| | |
|--|--|
| **Feature** | Separate Airtable columns for PAN vs Aadhaar vs Agreement files |
| **Why impossible as separate columns** | Partners has a single **Resume** attachment field. |
| **Mitigation already shipped** | Multiple files in Resume + filename typing + Performance Notes verification — **feature works** without three columns. |
| **Remaining gap** | Cannot enforce “exactly one PAN attachment field” at the Airtable schema layer; enforcement is application-side only. |
| **Not listed as a full module blocker** — Documents module is supported via Resume. This is a schema-fidelity caveat only. |

---

## Second-pass verdict on former blockers

| Former claim | Second-pass result |
|--------------|-------------------|
| Users / Authentication blocked | **Removed** — AM + Partners + env emails |
| Documents blocked | **Removed** — Resume + Performance Notes markers |
| Payouts blocked | **Removed** — Jobs.Payout % + Communications markers |
| Notifications blocked | **Downgraded** — live feed works; only read/prefs persistence blocked (A) |
| Activities blocked | **Downgraded** — current-state timeline works; only transition history blocked (B) |

---

## Implementation notes (repositories)

| Adapter | Location |
|---------|----------|
| Identity | `services/users/client-identity.adapter.ts` |
| Field markers | `lib/airtable/field-markers.ts` |
| Derived payouts | `features/payouts/services/payouts.derived.ts` |
| Derived documents | `features/partner-documents/services/documents.derived.ts` |
| Derived activities | `features/workflows/services/activities.derived.ts` |
| Derived notifications | `features/notifications/services/notifications.derived.ts` |

---

## Success criteria

- Schema unchanged.  
- Every former “hard blocker” re-audited against all tables/fields.  
- Only **A / B / C** remain as proven impossibilities; **D** is a column-shape caveat with a working app path.  
- CRM + auth + docs + payouts + timeline feed + notification feed operate on the locked base.
