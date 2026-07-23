# CRUD Smoke Report — Live Client Airtable

**Verdict: ALL PASSED**

| | |
|--|--|
| **Base** | `appOh6IpawqSgL8OS` (Partner Relationship Manager) |
| **Runtime** | Official Airtable JS SDK (`airtable` npm) — same path as `lib/airtable/client.ts` |
| **Started** | 2026-07-23T05:33:55.497Z |
| **Finished** | 2026-07-23T05:34:06.417Z |
| **Prefix** | `[TEST]` |
| **Existing client records modified** | **None** |

---

## Summary

| Entity | Create | Read | Update | Verify | Delete | Result |
|--------|--------|------|--------|--------|--------|--------|
| Clients | ✅ | ✅ | ✅ | ✅ | ✅ `destroy` | **PASS** |
| Partners | ✅ | ✅ | ✅ | ✅ | ✅ `destroy` | **PASS** |
| Jobs (+ allocate Partner) | ✅ | ✅ | ✅ | ✅ | ✅ `destroy` | **PASS** |
| Candidates | ✅ | ✅ | ✅ | ✅ | ✅ `destroy` | **PASS** |

Failed operations: **0**

---

## Clients

| Step | OK | Record ID | Detail |
|------|----|-----------|--------|
| create | ✅ | `reclBn7FgI3KuKnb4` | Name: `[TEST] Smoke Client 1784784835497`, Status: `Prospect` |
| read | ✅ | `reclBn7FgI3KuKnb4` | Name matched |
| update | ✅ | `reclBn7FgI3KuKnb4` | Notes + Industry → Finance |
| verify-update | ✅ | `reclBn7FgI3KuKnb4` | Notes=`[TEST] CRUD smoke updated`, Industry=`Finance` |
| delete | ✅ | `reclBn7FgI3KuKnb4` | Hard delete via `destroy` |

---

## Partners

| Step | OK | Record ID | Detail |
|------|----|-----------|--------|
| create | ✅ | `recy8IOHSVC1q0Yor` | Company: `[TEST] Smoke Partner Co 1784784835497`, Status: `Probation` |
| read | ✅ | `recy8IOHSVC1q0Yor` | Company name matched |
| update | ✅ | `recy8IOHSVC1q0Yor` | Performance Notes + Contact Name |
| verify-update | ✅ | `recy8IOHSVC1q0Yor` | Notes=`[TEST] updated`, Contact=`[TEST] Contact Updated` |
| delete | ✅ | `recy8IOHSVC1q0Yor` | Hard delete via `destroy` |

---

## Jobs

Linked only to the temporary `[TEST]` Client and Partner (no existing client rows touched).

| Step | OK | Record ID | Detail |
|------|----|-----------|--------|
| create | ✅ | `recnSbYI854RnOENy` | Title: `[TEST] Smoke Job 1784784835497`, Status: `Open` |
| allocate-partner | ✅ | `recnSbYI854RnOENy` | `Partners` → `[recy8IOHSVC1q0Yor]` |
| read | ✅ | `recnSbYI854RnOENy` | Title + Partners link verified |
| update | ✅ | `recnSbYI854RnOENy` | Comments + Location → Hybrid |
| verify-update | ✅ | `recnSbYI854RnOENy` | Comments=`[TEST] updated`, Location=`Hybrid` |
| delete | ✅ | `recnSbYI854RnOENy` | Hard delete via `destroy` |

---

## Candidates

| Step | OK | Record ID | Detail |
|------|----|-----------|--------|
| create | ✅ | `recO0tWqbopTEjmAU` | Name: `[TEST] Smoke Candidate 1784784835497`, Status: `Pending Review` |
| read | ✅ | `recO0tWqbopTEjmAU` | Name + status verified |
| update | ✅ | `recO0tWqbopTEjmAU` | Status → `Interviewing`, notes updated |
| verify-update | ✅ | `recO0tWqbopTEjmAU` | Status=`Interviewing`, Notes=`[TEST] updated` |
| delete | ✅ | `recO0tWqbopTEjmAU` | Hard delete via `destroy` |

---

## Cleanup

All four temporary records were **hard-deleted** (`table.destroy`). No `[TEST]` leftovers expected in the base.

Order: Candidates → Jobs → Partners → Clients.

---

## Notes

- Writes used the official Airtable SDK against the live base (not MCP).
- Job allocation exercised `Jobs.Partners` multi-link (client `job_partners` mode).
- Candidate write exercised Candidates as submission events (`candidates` mode).
- No pre-existing Clients / Jobs / Partners / Candidates rows were updated.

---

## Conclusion

Live CRUD against the client Airtable is **fully operational** for Clients, Partners, Jobs (including partner allocation), and Candidates.
