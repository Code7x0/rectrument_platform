# Airtable — Notifications Module

## Tables

| Env | Purpose |
|-----|---------|
| `AIRTABLE_NOTIFICATIONS_TABLE` | In-app notification records |
| `AIRTABLE_NOTIFICATION_PREFERENCES_TABLE` | Per-user channel preferences |

## Notifications fields

| Airtable field | Domain |
|----------------|--------|
| Notification ID | `notificationCode` (optional formula/autonumber) |
| Recipient User | `recipientUserId` (link → Users) |
| Title | `title` |
| Description | `description` (long text) |
| Type | `type` (single select) |
| Priority | `priority` (single select) |
| Category | `category` (single select) |
| Entity Type | `entityType` (single select / text) |
| Entity ID | `entityId` (text) |
| Action URL | `actionUrl` (text / URL) |
| Read Status | `readStatus` (Unread / Read) |
| Created At | `createdAt` (date/time) |
| Read At | `readAt` (date/time) |
| Archived | `archived` (checkbox) |
| Metadata | `metadata` (long text JSON) |
| Activity ID | `activityId` (optional text / link) |

## Type single-select

Registration, Approval, Invitation, Job, Allocation, Candidate, Interview, Offer, Joined, Rejected, Documents, Payout, System, Role, Settings, Security

## Priority single-select

Low, Medium, High, Critical

## Category single-select

Jobs, Candidates, Payouts, Documents, System, Security, Role Changes

## Read Status single-select

Unread, Read

## Notification Preferences fields

| Airtable field | Domain |
|----------------|--------|
| User | `userId` (link → Users) |
| Default Channel | `defaultChannel` |
| Category Channels | `categories` (long text JSON map) |
| Updated At | `updatedAt` |

## Channel single-select

In-App, Email, Both, None

## Notes

- Notifications are **not** Activities. Optional `Activity ID` is a reference only.
- Soft delete = set `Archived` = true.
- Critical + Unread items are pinned in the UI until read.
- Email delivery uses the Feature 12 provider abstraction (console by default). Do not wire Resend/SES/SendGrid here.
