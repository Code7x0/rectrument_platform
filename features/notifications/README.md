# Notifications — Communication Center

## Purpose

User-facing notifications (in-app + email via abstraction). **Not** the Activity audit log.

## Structure

```
features/notifications/
  repositories/
  services/       # publish, preferences, list, events
  actions/
  components/     # Bell, Center, Preferences
  schemas/
  types/
```

## Publisher

`publishNotification()` is the extension point for a future WebSocket layer. No polling / sockets in this feature.

## Security / permissions

| Permission | Roles |
|------------|-------|
| `view_own_notifications` | All authenticated roles |
| `manage_own_notification_preferences` | All authenticated roles |

Users may only read/update **their own** notifications (`recipientUserId === session.userId`). Admins cannot read another admin’s inbox.

## Activity linkage

Optional `activityId` on a notification may reference an Activity record. Systems stay separate — Activities remain audit logs.

## Routes

- `/notifications` — full center
- `/notifications/preferences` — channel + category preferences

## Airtable

Requires `AIRTABLE_NOTIFICATIONS_TABLE` and `AIRTABLE_NOTIFICATION_PREFERENCES_TABLE`. See `docs/AIRTABLE_NOTIFICATIONS_MODULE.md`.
