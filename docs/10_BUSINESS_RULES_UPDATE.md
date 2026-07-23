# Business Rules Update

Version: 1.0

Project:

Recruitment Partner Management System

Purpose:

This document supersedes earlier workflow assumptions where necessary.

It captures revised business rules agreed with the client after reviewing the MVP architecture.

If any previous documentation conflicts with this document, this document takes precedence.

---

# Updated Business Hierarchy

The platform has three operational roles.

Admin

↓

Account Manager

↓

Talent Partner

Each role has clearly separated responsibilities.

---

# 1. Admin Responsibilities

The Admin owns and manages the platform.

Admin responsibilities include:

• Create and manage Clients

• Create and manage Jobs

• Assign Jobs to Account Managers

• Manage Account Managers

• Manage Talent Partners

• Review and verify Partner Documents

• Manage system configuration

• Full reporting and visibility

The Admin is responsible for business administration.

The Admin is NOT responsible for day-to-day recruitment operations.

The Admin does NOT allocate Talent Partners to Jobs.

---



# 2. Account Manager Responsibilities

The Account Manager is responsible for recruitment operations.

Responsibilities include:

• Receive Jobs assigned by Admin

• Allocate one or more Talent Partners to Jobs

• Review Candidate Submissions

• Update Candidate Status

• Manage assigned Clients

• Track recruitment progress

The Account Manager is the operational owner of recruitment.

---



# 3. Talent Partner Responsibilities

Talent Partners are external recruiters.

Responsibilities include:

• Receive allocated Jobs

• Source Candidates

• Submit Candidates

• Upload required KYC Documents

• Track Candidate Status

Talent Partners cannot manage Jobs or Clients.

---



# Updated Recruitment Workflow

Admin

↓

Create Client

↓

Create Job

↓

Assign Job to Account Manager

↓

Account Manager

↓

Allocate Job to one or more Talent Partners

↓

Talent Partners

↓

Submit Candidates

↓

Account Manager

↓

Review Candidates

↓

Client Review

↓

Interview

↓

Offer

↓

Joined

↓

Payout

---



# Multi-Partner Recruitment

One Job

↓

One Account Manager

↓

Many Talent Partners

The same Job can be allocated to multiple Talent Partners.

This encourages competition and allows the client to receive the best candidates.

This is a core business rule.

---



# Partner Privacy

Protecting Talent Partner identity is a core requirement.

Account Managers must NOT have access to Talent Partner personal information.

---



# Admin Visibility

Admin can view

Partner Name

Company

Phone

Email

PAN

Aadhaar

Bank Details

Documents

Verification Status

Performance

Everything.

---



# Account Manager Visibility

Account Managers must NOT view

Partner Name

Phone

Email

PAN

Aadhaar

Bank Details

Personal Documents

Instead they work only with

Partner ID

Example

TP-0042

Visible information

Partner ID

Specialization

Performance

Current Jobs

Verification Status

Rating

Status

---



# Talent Partner Visibility

Partners may only view

Their own profile

Their own documents

Their own submissions

Their own jobs

Their own status

Never another Partner's information.

---



# Job Ownership

Every Job belongs to exactly one Account Manager.

Fields

Assigned Account Manager

↓

Many Partner Allocations

The Account Manager becomes responsible for operational execution.

---



# Allocation Ownership

Allocations are created ONLY by

Account Managers

The Admin never allocates Partners.

Allocation Fields

Allocation ID

Job

Assigned Account Manager

Partner ID

Expected Profiles

Submitted Profiles

Assigned Date

Status

Notes

---



# Partner ID

Every Talent Partner receives a unique Partner ID.

Example

TP-0001

TP-0002

TP-0042

This ID is used throughout recruitment operations.

Account Managers always work using Partner IDs.

---



# Workspace Visibility

Admin Workspace

Displays

Partner Name

Contact Details

Documents

Verification

Bank Details

Performance

---

Account Manager Workspace

Displays

Partner ID

Specialization

Performance

Active Jobs

Verification Status

Submission Metrics

Personal information is hidden.

---



# Permission Matrix

| Feature | Admin | Account Manager | Talent Partner |

|----------|:-----:|:---------------:|:--------------:|

| Manage Clients | ✅ | ✅ | ❌ |

| Manage Jobs | ✅ | ✅ (assigned) | ❌ |

| Assign Job to Account Manager | ✅ | ❌ | ❌ |

| Allocate Partners | ❌ | ✅ | ❌ |

| View Partner Identity | ✅ | ❌ | Own Only |

| Verify Partner Documents | ✅ | ❌ | ❌ |

| Review Candidate | Read | ✅ | ❌ |

| Submit Candidate | ❌ | ❌ | ✅ |

| Upload Documents | ❌ | ❌ | ✅ |

---



# Security Principles

Identity protection of Talent Partners is mandatory.

Operational users should work using Partner IDs.

Sensitive personal information must never be exposed outside Admin.

Permission checks must always be enforced on the server.

Never trust frontend visibility alone.

---



# Development Notes

This document supersedes earlier assumptions where Admin performed Partner allocations.

Future modules must follow this workflow.  
  
  
  
  
  
# Candidate Status Transparency

Talent Partners must always be able to track the progress of candidates they have submitted.

The system should provide real-time visibility of the recruitment status.

Talent Partners should never need to contact an Account Manager simply to ask for candidate updates.

---

# Candidate Status Lifecycle

Every submitted candidate moves through the following recruitment pipeline.

Submitted

↓

Internal Review

↓

Client Review

↓

Interview

↓

Offer

↓

Joined

Alternative flow

Rejected

The current status must always be visible to the Talent Partner.

The status is maintained and updated by the Account Manager.

---

# Candidate Status Ownership

Only the Account Manager is responsible for updating candidate recruitment status.

Partners cannot edit candidate status.

Admin has full visibility but normally does not perform operational updates.

---

# Partner Candidate Tracking

Every Talent Partner should have a dedicated "My Candidates" section.

For every submitted candidate display

Candidate Name

Job

Submission Date

Current Recruitment Status

Current Payout Status

Last Updated

The list should update automatically whenever the Account Manager changes the status.

---

# Payout Workflow

Payouts are linked to successful recruitment outcomes.

The payout process begins after recruitment reaches the required business milestone.

Example

Joined

↓

Eligible for Payout

↓

Payment Processing

↓

Paid

↓

Completed

Rejected candidates never become payout eligible.

---

# Payout Status

Each submission should expose a payout status.

Suggested values

Not Eligible

Eligible

Processing

Paid

Completed

The payout status is visible to the Talent Partner.

---

# Payout Status Ownership

Only the Account Manager can update payout status during recruitment operations.

The Admin has full visibility and can override when necessary.

Talent Partners have read-only access.

---

# Partner Transparency

Talent Partners should always know

• Candidate Recruitment Status

• Payout Eligibility

• Payout Status

The objective is complete transparency.

Talent Partners should never need to contact the recruitment team simply to ask

"Has my candidate been reviewed?"

or

"When will I get paid?"

The system itself should answer these questions.  
  
  
  
### 12. Candidate & Payout Transparency

Implement full transparency for Talent Partners.

Partners must be able to view, in real time:

- Current Candidate Recruitment Status

- Current Payout Status

The data should always reflect the latest status maintained by the Account Manager.

Do not duplicate status fields.

Reuse the existing Submission and Workflow infrastructure.

---

### Candidate Status

The following recruitment statuses should be supported.

Submitted

↓

Internal Review

↓

Client Review

↓

Interview

↓

Offer

↓

Joined

Alternative

Rejected

Only the Account Manager can change recruitment status.

Partners have read-only visibility.

---

### Payout Status

Add payout status to the Submission domain.

Suggested statuses

Not Eligible

Eligible

Processing

Paid

Completed

Rejected candidates remain Not Eligible.

The payout status is managed by the Account Manager.

Admin has full visibility and override capability.

Partners have read-only access.

---

### Partner Portal

Extend the Partner portal.

Create a "My Candidates" page (or extend the existing one).

Display

- Candidate Name

- Job

- Recruitment Status

- Payout Status

- Submission Date

- Last Updated

Status updates should automatically reflect the latest workflow changes.

Do not allow Talent Partners to edit either recruitment status or payout status.

---

### Documentation

Update all affected documentation so that Candidate Status and Payout Status become official business rules of the platform.  




## One recommendation

I would make **Payout** part of the **Submission** entity, **not** the Candidate.

The relationship should be:

```

```

```
Candidate (Person)
        │
        ▼
Submission (Business Event)
        │
        ├── Recruitment Status
        ├── Payout Status
        ├── Partner
        ├── Job
        └── Allocation
```

This is important because **the same candidate could be submitted for different jobs at different times**, and each submission can have a different recruitment outcome and payout status. Keeping payout and recruitment status on the **Submission** entity avoids inconsistencies and matches the business process much more accurately.  
