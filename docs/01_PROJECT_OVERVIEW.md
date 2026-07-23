# Project Vision

To build a modern, secure, and scalable recruitment management platform that simplifies collaboration between Administrators, Account Managers, and Talent Partners while eliminating manual recruitment operations and reducing dependency on third-party no-code platforms.

# Recruitment Partner Management System

## Project Overview

Version: 1.0

Author: Sonu

Status: In Development

---

# 1. Introduction

The Recruitment Partner Management System (RPMS) is a custom-built internal web application designed to streamline and centralize the recruitment workflow between the organization, Account Managers, Talent Partners, and Clients.

The application replaces the previously planned Softr implementation due to platform limitations around role-based authentication, permissions, and dashboard customization. Instead, the system will be developed as a custom web application using Next.js while utilizing Airtable as the backend database.

The goal is to create a secure, scalable, and easy-to-use recruitment management platform that reduces manual work, improves visibility into the recruitment pipeline, and enables different user roles to perform their responsibilities efficiently.

---



# 2. Business Problem

The current recruitment process relies on manual tracking and multiple disconnected tools.

Current challenges include:

- Manual candidate tracking
- Lack of centralized recruitment data
- Difficulty tracking Talent Partner submissions
- Manual document verification
- Manual payout tracking
- No role-based access
- No centralized dashboard
- Limited scalability using existing no-code platforms

These challenges reduce productivity and increase operational overhead.

---



# 3. Project Objectives

The primary objectives of this project are:

- Centralize recruitment operations.
- Provide secure role-based access.
- Replace manual spreadsheets with a structured system.
- Track complete candidate lifecycle.
- Manage Talent Partners efficiently.
- Manage Partner Documents.
- Manage Client Jobs.
- Track Candidate Pipeline.
- Track Payouts.
- Build a scalable foundation for future enhancements.

---



# 4. Target Users

The system will be used internally by three primary user roles.

## Administrator

Responsible for complete system administration.

Responsibilities:

- Manage Clients
- Manage Jobs
- Manage Talent Partners
- Verify Documents
- View all Candidates
- Track Allocations
- Manage Payouts
- System Administration

---



## Account Manager

Responsible for managing assigned clients and coordinating recruitment.

Responsibilities:

- View assigned clients
- Manage assigned jobs
- Allocate Talent Partners
- Review submitted candidates
- Update candidate status
- Coordinate hiring process

---



## Talent Partner

Responsible for sourcing and submitting candidates.

Responsibilities:

- View assigned jobs
- Submit candidates
- Upload documents
- View submission status
- View payout status

---



# 5. Project Scope

The MVP (Minimum Viable Product) will include the following modules.

## Authentication

- Secure Login
- Role Based Authentication
- Role Based Dashboard Routing

---



## Dashboard

Separate dashboards for:

- Administrator
- Account Manager
- Talent Partner

---



## Client Management

- Create Client
- Update Client
- Archive Client
- Search Client

---



## Job Management

- Create Job
- Assign Account Manager
- Update Job Status
- Close Job

---



## Talent Partner Management

- Create Partner
- Manage Partner Profile
- Track Performance
- Manage Partner Documents

---



## Candidate Management

- Submit Candidate
- Prevent Duplicate Candidates
- Candidate Pipeline
- Candidate Status Tracking

---



## Allocation Management

- Allocate Jobs to Partners
- Track Allocation Status
- Track Assigned Candidates

---



## Document Management

- PAN
- Aadhaar
- Agreement
- Verification Status

---



## Payout Management

- Create Payout
- Pending Payout
- Paid Payout
- Payment History

---



# 6. Success Criteria

The MVP will be considered successful if:

- All three user roles can securely log in.
- Each role is redirected to the correct dashboard.
- Clients can be managed.
- Jobs can be managed.
- Talent Partners can submit candidates.
- Duplicate candidates are prevented.
- Candidate pipeline is tracked.
- Documents can be uploaded and verified.
- Payouts can be tracked.
- Data is stored and retrieved from Airtable.

---



# 7. Technology Stack

Frontend

- Next.js 15
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion

Authentication

- Clerk

Backend

- Airtable API

Database

- Airtable

Validation

- React Hook Form
- Zod

Data Fetching

- TanStack Query
- Axios

Hosting

- Vercel

File Storage

- Airtable Attachments (Pilot Phase)

Future Upgrade

- Cloudinary or AWS S3

---



# 8. High-Level Architecture

```

Users

      │

      ▼

Next.js Application

      │

      ▼

Clerk Authentication

      │

      ▼

Role Validation

      │

      ▼

Application Pages

      │

      ▼

Airtable API

      │

      ▼

Airtable Database

```

---



# 9. Design Principles

The application should follow these principles throughout development.

- Keep the application simple.
- Build only required features.
- Avoid unnecessary complexity.
- Reuse components whenever possible.
- Mobile responsive.
- Fast and intuitive.
- Clean and minimal UI.
- Modular architecture.
- Scalable codebase.

---



# 10. Out of Scope (MVP)

The following features will NOT be developed during the initial release.

- Email Notifications
- WhatsApp Notifications
- Resume AI Parsing
- Analytics Dashboard
- Reports
- Audit Logs
- Mobile Application
- Advanced Search Engine
- Workflow Automation
- AI Candidate Ranking

These may be considered in future versions.

---



# 11. Development Strategy

The application will be developed incrementally.

Phase 1

- Authentication
- Project Foundation
- Airtable Integration

Phase 2

- Client Module
- Job Module
- Partner Module

Phase 3

- Candidate Module
- Allocation Module
- Document Module

Phase 4

- Payout Module
- Dashboard
- Testing
- Deployment

---



# 12. Version History

| Version | Date | Description |

|----------|------|-------------|

| 1.0 | July 2026 | Initial Project Specification |