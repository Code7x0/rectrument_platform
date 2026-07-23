# Airtable — Candidates & Submissions

## Candidates (`AIRTABLE_CANDIDATES_TABLE`)

Person entity. Not a submission.

| Airtable field | Domain |
|----------------|--------|
| Full Name | `fullName` |
| Email | `email` |
| Phone | `phone` |
| Resume | `resumeUrl` / attachment |
| Current Company | `currentCompany` |
| Current Location | `currentLocation` |
| Experience | `experience` |
| Current CTC | `currentCtc` |
| Expected CTC | `expectedCtc` |
| Notice Period | `noticePeriod` |
| Skills | `skills` |
| Remarks | `remarks` |
| Created At | `createdAt` |

## Submissions (`AIRTABLE_SUBMISSIONS_TABLE`)

Business event linking Candidate ↔ Job.

| Airtable field | Domain |
|----------------|--------|
| Submission ID | `submissionCode` |
| Candidate (link) | `candidateId` |
| Job (link) | `jobId` |
| Allocation (link) | `allocationId` |
| Partner (link) | `partnerId` |
| Submission Date | `submissionDate` |
| Status | `status` |
| Remarks | `remarks` |

### Status single-select

- Submitted → `submitted`
- Internal Review → `internal_review`
- Client Review → `client_review` (legacy: Submitted to Client)
- Interview → `interview` (legacy: Interview L1 / L2)
- Offer → `offer`
- Joined → `joined`
- Rejected → `rejected`

Status **changes** go through Workflow Service only — never edit Status ad-hoc in app code.

## Activities (`AIRTABLE_ACTIVITIES_TABLE`)

| Airtable field | Domain |
|----------------|--------|
| Entity Type | `entityType` (`submission`) |
| Entity ID | `entityId` |
| Action | `action` (`status_change`) |
| From Status | `fromStatus` |
| To Status | `toStatus` |
| Actor (link → Users) | `actorUserId` |
| Note | `note` |
| Created At | `createdAt` |

Powers Activity Timeline + Notifications later.
