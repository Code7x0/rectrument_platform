# Final Business Rules — User Onboarding & Identity

Version: 1.0

Authoritative for Feature 12. Where this conflicts with earlier docs, this document wins.

---

## User Hierarchy

```
Super Admin
  ↓
Admin
  ↓
Account Manager
  ↓
Talent Partner
```

- Only **Super Admin** may create Admins and Account Managers.
- Super Admin **cannot** create another Super Admin.
- Admins **cannot** create Admins or Account Managers.
- Talent Partners are the **only** public registration path.

---

## Talent Partner Registration

Landing → Become a Talent Partner → Form + Documents + Agreement → Submit → **Pending Approval**.

- Clerk account must **not** be activated until approval.
- Pending / Rejected users **cannot** authenticate.
- Approved users receive activation instructions, then may log in.

### Registration fields

First Name, Last Name, Email, Phone, City, State, Skills, Experience, Resume, PAN, Aadhaar, Bank Details (optional), Agreement, Identity Visibility (PUBLIC | PRIVATE).

---

## Identity Visibility

Every Talent Partner has `identityVisibility`: **PUBLIC** | **PRIVATE**.

| Viewer | PUBLIC | PRIVATE |
|--------|--------|---------|
| Super Admin / Admin | Full identity | Full identity |
| Account Manager | Name | Partner ID only |

Only Super Admin or Admin may change this flag.

---

## Approval Queue

Admin reviews pending Talent Partners: Approve (activate + email + activity) or Reject (reason + email + inactive).

---

## Staff invitations

Admins and Account Managers are created only by Super Admin via invitation (email → accept → set password). No public registration.

---

## Registration Status (User)

Pending | Approved | Rejected | Invitation Pending | Active | Inactive

---

## Role management

Super Admin: view, promote, demote, deactivate, audit via activity. Cannot create Super Admin.
