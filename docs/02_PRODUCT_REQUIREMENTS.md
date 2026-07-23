# Recruitment Partner Management System

# Product Requirements Document (PRD)

Version: 1.0

Status: In Development

---

# 1. Purpose

This document defines all functional and non-functional requirements for the Recruitment Partner Management System.

The purpose of this document is to ensure every feature, module, workflow and business rule is clearly defined before implementation begins.

This document serves as the primary reference for development.

---

# 2. Product Goal

Develop a secure internal recruitment management platform that enables Administrators, Account Managers and Talent Partners to collaborate efficiently using a centralized Airtable database.

The application should simplify recruitment workflows, reduce manual work, improve visibility across the hiring pipeline and support future scalability.

---



# 3. User Roles

The system contains three user roles.

## Administrator

Full system access.

Responsibilities

- Manage users
- Manage clients
- Manage jobs
- Manage partners
- Manage allocations
- Manage candidates
- Verify partner documents
- Manage payouts
- View reports

---



## Account Manager

Limited operational access.

Responsibilities

- Manage assigned clients
- Manage assigned jobs
- Allocate partners
- Review candidates
- Update candidate status

---



## Talent Partner

Limited recruitment access.

Responsibilities

- View assigned jobs
- Submit candidates
- Upload required documents
- Track candidate status
- View payout history

---



# 4. Functional Requirements

---



## FR-001 Authentication

Priority: High

Description

The system shall provide secure authentication for all users.

Acceptance Criteria

- Email & Password login
- Session management
- Protected routes
- Secure logout

---



## FR-002 Role Based Access

Priority: High

The system shall identify user roles after login.

Roles

- Admin
- Account Manager
- Talent Partner

Acceptance Criteria

Each role must only access authorized pages.

---



## FR-003 Dashboard Routing

Priority: High

After successful login

Admin

→ /admin

Account Manager

→ /account-manager

Talent Partner

→ /partner

---



## FR-004 Client Management

Priority: High

Administrator can

- Create Client
- Update Client
- Archive Client
- Search Client

Fields

- Client ID
- Client Name
- Industry
- Website
- Status
- Assigned Account Manager

---



## FR-005 Job Management

Priority: High

Administrator can

- Create Job
- Edit Job
- Close Job

Job contains

- Job ID
- Client
- Hiring Manager
- Experience
- Skills
- Positions
- Status

---



## FR-006 Partner Management

Priority: High

Administrator can

- Add Partner
- Edit Partner
- View Partner Profile
- Track Performance

Partner contains

- Partner ID
- Name
- Company
- Email
- Phone
- Status

---



## FR-007 Allocation Management

Priority: High

Account Manager can allocate jobs to Talent Partners.

Allocation contains

- Job
- Partner
- Assigned Date
- Assigned By
- Status

---



## FR-008 Candidate Submission

Priority: High

Talent Partner can submit candidates.

Candidate contains

- Name
- Email
- Phone
- Resume
- LinkedIn
- Current Company
- Experience
- Notice Period
- Current CTC
- Expected CTC

---



## FR-009 Duplicate Candidate Prevention

Priority: High

Before creating a candidate

The system shall check

- Email
- Mobile Number

If duplicate exists

Display appropriate message.

Do not create duplicate record.

---



## FR-010 Candidate Pipeline

Priority: High

Candidate statuses

- Submitted
- Internal Review
- Submitted to Client
- Interview L1
- Interview L2
- Offer
- Joined
- Rejected

Status updates shall be visible to authorized users.

---



## FR-011 Partner Documents

Priority: Medium

Partner uploads

- PAN
- Aadhaar
- Agreement

Administrator verifies documents.

Verification Status

- Pending
- Verified
- Rejected

---



## FR-012 Payout Management

Priority: Medium

Administrator manages payouts.

Fields

- Candidate
- Partner
- Amount
- Status
- Payment Date

Partner can only view their own payouts.

---



## FR-013 Search & Filtering

Priority: Medium

Users shall search by

- Candidate
- Client
- Job
- Partner

Filtering

- Status
- Date
- Account Manager

---



## FR-014 Responsive Design

Priority: High

Application shall support

Desktop

Laptop

Tablet

Mobile

---



## FR-015 Session Management

Priority: High

Authenticated users shall remain logged in until session expires.

Unauthenticated users shall be redirected to Sign In.

---



# 5. Non Functional Requirements

Performance

- Fast page loading
- Optimized API calls

Security

- Protected routes
- Authentication required
- Authorization enforced

Scalability

- Modular architecture
- Reusable components
- Service layer

Maintainability

- Clean code
- TypeScript
- Documentation

---



# 6. Business Rules

BR-001

Every Client has a unique Client ID.

---

BR-002

Every Partner has a unique Partner ID.

---

BR-003

Every Job belongs to one Client.

---

BR-004

One Job can be allocated to multiple Talent Partners.

---

BR-005

One Talent Partner can submit multiple candidates.

---

BR-006

Duplicate candidates are not allowed.

---

BR-007

Partner documents require Admin verification.

---

BR-008

Only Admin can approve payouts.

---

BR-009

Account Managers can only manage assigned Clients and Jobs.

---

BR-010

Talent Partners can only access their own data.

---



# 7. Success Criteria

The MVP is complete when

✓ Authentication works

✓ Role based routing works

✓ Airtable integration works

✓ Clients module works

✓ Jobs module works

✓ Partners module works

✓ Candidate module works

✓ Allocation module works

✓ Documents module works

✓ Payout module works

✓ Dashboard works

✓ Application is deployed

---



# 8. Future Scope

The following features are excluded from MVP.

- Email Notifications
- WhatsApp Notifications
- Resume Parsing
- AI Candidate Ranking
- Reports
- Analytics
- Audit Logs
- Mobile App
- Workflow Automation
- Multi Organization Support

---



# Version History

| Version | Date | Description |

|----------|------|-------------|

| 1.0 | July 2026 | Initial Product Requirements |

# 9. Definition of Done

A feature is considered complete only if:

- Business requirements are implemented.
- UI matches the specification.
- Validation is implemented.
- Airtable integration is complete.
- Error handling is implemented.
- Loading and empty states are handled.
- Responsive design is verified.
- TypeScript has no errors.
- No use of `any`.
- Code follows project architecture.
- Feature has been manually tested.

