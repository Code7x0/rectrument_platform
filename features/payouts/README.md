# Payouts Module

## Purpose

Financial outcome per **Submission** — never attached directly to Candidate.

One submission → one payout record → independent recruitment and payout status.

## Lifecycle

```
Submission created → Payout (Not Eligible)
  → Eligible → Processing → Paid → Completed
```

Rejected submissions remain **Not Eligible**.

## Permissions

| Role | Capabilities |
|------|----------------|
| Admin | View all, update status, Mark Paid, Mark Completed |
| Account Manager | View assigned jobs, Eligible/Processing/Notes |
| Talent Partner | Read-only My Earnings |

## Activity

Every payout status change writes `payout_status_change` activity (`entityType: payout`).

## Structure

```
features/payouts/
  repositories/
  services/
  actions/
  components/
  schemas/
  types/
```

## Integration

- Auto-create payout on candidate submit (`ensurePayoutForSubmission`)
- Partner My Candidates + My Earnings show recruitment + payout status
- Future Dashboard widgets can aggregate `summarizePartnerEarnings`
