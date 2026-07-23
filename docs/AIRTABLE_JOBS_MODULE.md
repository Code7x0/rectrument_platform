# Airtable — Jobs Module Fields

Configure the **Jobs** table with these fields (Title Case names):

| Field | Type | Notes |
|---|---|---|
| Job ID | Single line / Autonumber | Display code; falls back to record id |
| Job Title | Single line text | Required |
| Client | Link → Clients | Required |
| **Assigned Account Manager** | Link → Users | **Required** — operational owner |
| Hiring Manager | Single line text | Client-side hiring contact |
| Job Description | Long text | |
| Location | Single line text | |
| Employment Type | Single select | Full-time, Part-time, Contract, Internship |
| Experience | Single line text | |
| Salary | Single line text | |
| Priority | Single select | Low, Medium, High, Urgent |
| Open Positions | Number | |
| Skills | Single line or Multiple select | Comma-separated OK |
| Status | Single select | Open, On Hold, Closed, Cancelled, Filled, **Archived** |
| Notes | Long text | |
| Department | Single line text | Optional |
| Created By | Link → Users | Optional |
| Created At | Created time | Optional |

## Ownership

Every Job has exactly one **Assigned Account Manager**. Admin assigns the AM; the AM then allocates Talent Partners.

## Soft delete

Never destroy Job records. Archive by setting **Status = Archived**.

## Lookups

Ensure **Clients**, **Talent Partners**, and **Users** tables exist for dropdown lookup services.
