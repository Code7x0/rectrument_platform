# Airtable — Payouts Module

## Table

Env: `AIRTABLE_PAYOUTS_TABLE`

## Fields

| Airtable field | Domain |
|----------------|--------|
| Payout ID | `payoutCode` |
| Submission (link) | `submissionId` — **one per submission** |
| Partner (link) | `partnerId` |
| Job (link) | `jobId` |
| Candidate (link) | `candidateId` |
| Amount | `amount` |
| Currency | `currency` (default INR) |
| Eligible Date | `eligibleDate` |
| Paid Date | `paidDate` |
| Payout Status | `payoutStatus` |
| Notes | `notes` |
| Last Updated | `lastUpdated` |

## Payout Status single-select

- Not Eligible → `not_eligible`
- Eligible → `eligible`
- Processing → `processing`
- Paid → `paid`
- Completed → `completed`

## Rules

- Created automatically when a Submission is created
- Recruitment status stays on Submissions table — do not duplicate
- Rejected submissions cannot become eligible
