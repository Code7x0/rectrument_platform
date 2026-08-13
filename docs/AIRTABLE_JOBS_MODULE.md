# Airtable — Jobs Module Fields (live client base)

Configure / map against the **live** Jobs table. Do **not** invent fields that are
absent on the locked client base.

| Field | Type | Notes |
|---|---|---|
| Job ID | Single line text | Business job code; prefer this over Comments markers |
| Job Title | Single line text | Required |
| Client | Link → Clients | Required |
| Hiring Manager | Single line text | Client-side hiring contact |
| Job Description | Attachments | File JD; text description lives in Comments in client mode |
| Sample Profiling | Attachments | Sample profile / resume |
| Skill Matrix Fitment | Attachments | Optional |
| Location | Single line text | |
| Work Mode | Single select / text | WFO / WFH / Hybrid |
| Years of Exp | Single line text | |
| Salary Range | Single line text | |
| Priority | Single select | **Super High**, High, Medium, Low (app `urgent` ↔ Super High) |
| Status | Single select | **Active**, **Inactive**, **Hold by us**, **Hold by Client**, **Closed by us**, **Closed Alternatively** |
| Comments | Long text | Text JD + system markers (`[RP_JOBID]`, `[RP_AM]`) |
| Department | Single line text | Optional |
| Partners | Link → Partners | Allocation source in `job_partners` mode |
| Candidates | Link → Candidates | |
| Seniority Level | Single line / select | Optional |
| Submission Deadline | Date | Optional |
| Start Date | Date | Optional |
| Posted Date | Date | Chronology / open date |
| Payout | Number / text | Possible payout for partners |
| Interview Process , R1 - KYC | Long text | Interview process |

## Fields that do **not** exist on the live Jobs table

Do **not** create these, and do **not** send them in Airtable create/update payloads:

- Open Positions
- Skills
- Employment Type
- Assigned Account Manager
- Created By

## Status mapping (app ↔ Airtable)

Exact live choices are preserved (no subtype collapse):

| App (domain) | Airtable |
|---|---|
| Active (`open`) | Active |
| Inactive (`cancelled`) | Inactive |
| Hold by us (`hold_by_us`) | Hold by us |
| Hold by Client (`hold_by_client`) | Hold by Client |
| Closed by us (`closed_by_us`) | Closed by us |
| Closed Alternatively (`closed_alternatively`) | Closed Alternatively |

Never write legacy labels (`Open`, `On Hold`, bare `Closed`, `Filled`, `Archived`) to Airtable.

## Priority mapping

| App | Airtable |
|---|---|
| Urgent (`urgent`) | Super High |
| High | High |
| Medium | Medium |
| Low | Low |

## Days of Working

Comes from **Clients.`Work Days/Week`** (not a Jobs field). Partner surfaces show e.g. `5 days` when the value is `5`.

## Soft delete

Prefer setting Status to a Closed Airtable choice (`Closed by us`). There is no separate Archived choice on the live base.

## Lookups

Ensure **Clients**, **Partners**, and identity tables exist for dropdown lookup services.
