# Business IDs & Super Admin Candidates — UAT Change Report

**Date:** 2026-07-24  
**Base:** Locked client Airtable (`AIRTABLE_COMPAT_MODE=client`)

---

## 1. What changed

### Super Admin Candidates
- Added **Candidates** (and **Allocations**) to Super Admin sidebar (`lib/navigation`).
- Super Admin continues to use `/admin/candidates` (layout already allows `super_admin`).
- Candidates table now shows **Job ID** and **Partner Code** columns; detail drawer includes the same.
- Breadcrumbs adapt to Super Admin vs Admin.

### Business IDs (UI + generation)
| Entity | Display | Generation |
|--------|---------|------------|
| **Client** | Existing Airtable **Client ID** (AB, IBM, EXP…) | Not generated — preserved as-is |
| **Talent Partner** | **Partner Code** (`HN_254`, duplicates `HN_254_2`) | On approval / create; migration for missing/invalid |
| **Job** | **Job ID** (`AB_001` per client sequence) | On create; migration for existing jobs |
| **Candidate** | No business code | Unchanged — person name + status; Airtable autoNumber unused as product code |

Removed synthetic UI fallbacks (`CLI-…`, `PRT-…`, `TP-…`, `JOB-…`, `SUB-…` from record ids).

### Search
Global search matches **Client Code**, **Partner Code**, and **Job ID** (plus names/titles). Submission search prefers Job ID / Partner Code over invented codes.

---

## 2. Airtable fields used

| Purpose | Table | Field | Notes |
|---------|-------|-------|-------|
| Client Code | Clients | **Client ID** | Existing; untouched by migration |
| Partner Code | Partners | **Partner Code** | Written when missing/invalid or on approval |
| Job ID (storage) | Jobs | **Comments** | Marker `[RP_JOBID] AB_001` — **Jobs has no Job ID column** on locked base |
| Job ID (optional) | Jobs | **Job ID** | Written only when not in client compat mode (normalized app bases) |
| Candidate | Candidates | **Candidate ID** | Existing autoNumber — not treated as a product business ID |

**Record IDs (`rec…`) and all link relationships are unchanged.**

---

## 3. Schema changes

| Change | Status |
|--------|--------|
| New Airtable tables | **None** |
| New “Job ID” column via API | **Blocked** (403) — PAT cannot create fields |
| Workaround | Job business IDs stored as `[RP_JOBID] …` in **Jobs.Comments** (same pattern as other locked-schema markers) |

**Recommendation for client:** Optionally add a single-line **Job ID** field on Jobs later; the app already prefers `{Job ID}` when present, then falls back to the Comments marker.

---

## 4. Migration results (executed live)

Script: `npm run migrate:business-ids` (`scripts/migrate-business-ids.mjs`)

| Item | Count |
|------|-------|
| Partners updated (missing/invalid codes) | **1** → `SK_989` |
| Partners left with valid codes | **16** |
| Jobs assigned Job IDs | **29** (e.g. `AB_001`, `BCE_001`…`BCE_008`, `EXP_001`…) |
| Jobs skipped (already valid) | **0** |
| Clients modified | **0** |
| Relationships broken | **None** |

Re-run is idempotent (skips valid Partner Codes and existing `[RP_JOBID]` markers).

---

## 5. Validation checklist

- [x] Partner Codes unique; suffix `_2`, `_3` on collision  
- [x] Job sequences increment per Client Code  
- [x] Valid Client IDs preserved  
- [x] Airtable links (Client ↔ Job ↔ Partner ↔ Candidates) untouched  
- [x] Search supports Client Code / Partner Code / Job ID  
- [x] Typecheck passes  

---

## 6. Key code paths

- `lib/business-ids/` — format / uniqueness helpers  
- `features/shared/services/business-ids.service.ts` — allocate against live data  
- `features/jobs/services/jobs.service.ts` — assign Job ID on create; preserve marker on update  
- `features/users/services/users.service.ts` — Partner Code on approval  
- `scripts/migrate-business-ids.mjs` — one-time backfill  
