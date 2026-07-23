import { cache } from "react";

import {
  DOMAIN_NOTIFICATION_READ_TO_AIRTABLE,
  NOTIFICATIONS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import { sendEmail } from "@/services/email";
import { getUserById, listUsers } from "@/services/users/users.service";
import type { User, UserRole } from "@/types";
import {
  findNotificationById,
  findNotifications,
  findPreferencesByUserId,
  insertNotification,
  insertPreferences,
  isNotificationsStorageAvailable,
  patchNotification,
  patchPreferences,
} from "@/features/notifications/repositories/notifications.repository";
import { deriveNotificationsForViewer } from "@/features/notifications/services/notifications.derived";
import {
  buildNotificationsFilterFormula,
  toAirtableNotificationFields,
  toAirtablePreferencesFields,
} from "@/features/notifications/services/notifications.mapper";
import type {
  CreateNotificationInput,
  Notification,
  NotificationCategory,
  NotificationChannel,
  NotificationListFilters,
  NotificationListResult,
  NotificationPreferences,
  UpdateNotificationPreferencesInput,
} from "@/features/notifications/types";
import { DEFAULT_CATEGORY_CHANNELS } from "@/features/notifications/types";

/**
 * Extensible publisher boundary — future WebSocket can wrap publish().
 * No polling; no sockets in this feature.
 */
export interface NotificationPublisher {
  publish(input: CreateNotificationInput): Promise<Notification | null>;
}

function channelAllowsInApp(channel: NotificationChannel): boolean {
  return channel === "in_app" || channel === "both";
}

function channelAllowsEmail(channel: NotificationChannel): boolean {
  return channel === "email" || channel === "both";
}

function resolveCategoryChannel(
  preferences: NotificationPreferences | null,
  category: NotificationCategory,
): NotificationChannel {
  if (!preferences) {
    return DEFAULT_CATEGORY_CHANNELS[category];
  }
  return preferences.categories[category] ?? preferences.defaultChannel;
}

/**
 * Non-blocking notification write. Failures are logged, never throw to callers.
 */
export async function publishNotification(
  input: CreateNotificationInput,
): Promise<Notification | null> {
  try {
    const preferences = await getOrCreatePreferences(input.recipientUserId);
    const channel = resolveCategoryChannel(preferences, input.category);

    let created: Notification | null = null;

    if (channelAllowsInApp(channel)) {
      created = await insertNotification(toAirtableNotificationFields(input));
    }

    if (
      input.sendEmail &&
      channelAllowsEmail(channel) &&
      input.emailTemplate
    ) {
      const user = await getUserById(input.recipientUserId);
      if (user?.email) {
        await sendEmail({
          to: user.email,
          template: input.emailTemplate,
          data: {
            name: user.fullName,
            ...(input.emailData ?? {}),
          },
        });
      }
    }

    return created;
  } catch (error) {
    console.error("[notifications] publish failed", error);
    return null;
  }
}

export const defaultNotificationPublisher: NotificationPublisher = {
  publish: publishNotification,
};

export async function getOrCreatePreferences(
  userId: string,
): Promise<NotificationPreferences> {
  try {
    const existing = await findPreferencesByUserId(userId);
    if (existing) {
      return existing;
    }

    const created = await insertPreferences(
      toAirtablePreferencesFields(userId, {
        defaultChannel: "both",
        categories: DEFAULT_CATEGORY_CHANNELS,
      }),
    );
    if (created) {
      return created;
    }
  } catch (error) {
    console.error("[notifications] preferences create failed", error);
  }

  return {
    id: "virtual",
    userId,
    defaultChannel: "both",
    categories: { ...DEFAULT_CATEGORY_CHANNELS },
    updatedAt: null,
  };
}

export async function updatePreferences(
  userId: string,
  input: UpdateNotificationPreferencesInput,
): Promise<NotificationPreferences> {
  const existing = await getOrCreatePreferences(userId);
  if (existing.id === "virtual") {
    const created = await insertPreferences(
      toAirtablePreferencesFields(userId, input),
    );
    if (!created) {
      throw new Error(
        "Notification preferences cannot be saved — storage is not configured on this Airtable base.",
      );
    }
    return created;
  }
  return patchPreferences(
    existing.id,
    toAirtablePreferencesFields(userId, input, existing),
  );
}

export async function listNotificationsForUser(
  filters: NotificationListFilters,
): Promise<NotificationListResult> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  try {
    if (!isNotificationsStorageAvailable()) {
      const user = await getUserById(filters.recipientUserId);
      let rows = await deriveNotificationsForViewer({
        recipientUserId: filters.recipientUserId,
        partnerId: user?.partnerId,
        accountManagerId: user?.accountManagerId,
      });
      if (filters.readStatus && filters.readStatus !== "all") {
        rows = rows.filter((row) => row.readStatus === filters.readStatus);
      }
      if (filters.archived === true) {
        rows = rows.filter((row) => row.archived);
      } else if (filters.archived === false) {
        rows = rows.filter((row) => !row.archived);
      }
      if (filters.search?.trim()) {
        const q = filters.search.trim().toLowerCase();
        rows = rows.filter(
          (row) =>
            row.title.toLowerCase().includes(q) ||
            (row.description?.toLowerCase().includes(q) ?? false),
        );
      }
      const total = rows.length;
      const start = (page - 1) * pageSize;
      return {
        items: rows.slice(start, start + pageSize),
        total,
        page,
        pageSize,
        hasMore: start + pageSize < total,
        unreadCount: rows.filter((row) => row.readStatus === "unread").length,
      };
    }

    const formula = buildNotificationsFilterFormula({
      recipientUserId: filters.recipientUserId,
      readStatus: filters.readStatus,
      archived: filters.archived,
      type: filters.type,
      category: filters.category,
      priority: filters.priority,
    });

    const rows = await findNotifications({
      filterByFormula: formula,
      sort: [
        { field: NOTIFICATIONS_TABLE_FIELDS.createdAt, direction: "desc" },
      ],
    });

    let items = [...rows].sort((a, b) => {
      const aPin =
        a.priority === "critical" && a.readStatus === "unread" ? 0 : 1;
      const bPin =
        b.priority === "critical" && b.readStatus === "unread" ? 0 : 1;
      if (aPin !== bPin) {
        return aPin - bPin;
      }
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });

    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      items = items.filter(
        (row) =>
          row.title.toLowerCase().includes(q) ||
          (row.description?.toLowerCase().includes(q) ?? false),
      );
    }

    const total = items.length;
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);
    const unreadCount = rows.filter(
      (row) => row.readStatus === "unread" && !row.archived,
    ).length;

    return {
      items: pageItems,
      total,
      page,
      pageSize,
      hasMore: start + pageSize < total,
      unreadCount,
    };
  } catch (error) {
    console.error("[notifications] list failed", error);
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
      unreadCount: 0,
    };
  }
}

/**
 * Request-scoped unread badge count.
 */
export const getUnreadNotificationCount = cache(
  async (userId: string): Promise<number> => {
    try {
      const formula = buildNotificationsFilterFormula({
        recipientUserId: userId,
        readStatus: "unread",
        archived: false,
      });
      const rows = await findNotifications({
        filterByFormula: formula,
        maxRecords: 100,
      });
      return rows.length;
    } catch (error) {
      console.error("[notifications] unread count failed", error);
      return 0;
    }
  },
);

export async function getNotificationForUser(
  notificationId: string,
  userId: string,
): Promise<Notification | null> {
  const row = await findNotificationById(notificationId);
  if (!row || row.recipientUserId !== userId) {
    return null;
  }
  return row;
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
): Promise<Notification> {
  const row = await getNotificationForUser(notificationId, userId);
  if (!row) {
    throw new Error("Notification not found");
  }
  if (row.readStatus === "read") {
    return row;
  }
  const updated = await patchNotification(notificationId, {
    [NOTIFICATIONS_TABLE_FIELDS.readStatus]:
      DOMAIN_NOTIFICATION_READ_TO_AIRTABLE.read,
    [NOTIFICATIONS_TABLE_FIELDS.readAt]: new Date().toISOString(),
  });
  if (!updated) {
    throw new Error(
      "Notifications storage is not configured on this Airtable base.",
    );
  }
  return updated;
}

export async function markAllNotificationsRead(
  userId: string,
): Promise<number> {
  const formula = buildNotificationsFilterFormula({
    recipientUserId: userId,
    readStatus: "unread",
    archived: false,
  });
  const rows = await findNotifications({ filterByFormula: formula });
  await Promise.all(
    rows.map((row) =>
      patchNotification(row.id, {
        [NOTIFICATIONS_TABLE_FIELDS.readStatus]:
          DOMAIN_NOTIFICATION_READ_TO_AIRTABLE.read,
        [NOTIFICATIONS_TABLE_FIELDS.readAt]: new Date().toISOString(),
      }),
    ),
  );
  return rows.length;
}

export async function archiveNotification(
  notificationId: string,
  userId: string,
): Promise<Notification> {
  const row = await getNotificationForUser(notificationId, userId);
  if (!row) {
    throw new Error("Notification not found");
  }
  const updated = await patchNotification(notificationId, {
    [NOTIFICATIONS_TABLE_FIELDS.archived]: true,
  });
  if (!updated) {
    throw new Error(
      "Notifications storage is not configured on this Airtable base.",
    );
  }
  return updated;
}

export async function deleteNotification(
  notificationId: string,
  userId: string,
): Promise<void> {
  await archiveNotification(notificationId, userId);
}

async function listUsersByRole(role: UserRole): Promise<User[]> {
  const users = await listUsers({ role, status: "active" });
  return users.filter(
    (u) =>
      u.registrationStatus === "active" || u.registrationStatus === "approved",
  );
}

export async function findPartnerUserId(
  partnerId: string,
): Promise<string | null> {
  const users = await listUsers({ role: "partner" });
  return users.find((u) => u.partnerId === partnerId)?.id ?? null;
}

export async function notifyRole(
  role: UserRole,
  input: Omit<CreateNotificationInput, "recipientUserId">,
): Promise<void> {
  const users = await listUsersByRole(role);
  await Promise.all(
    users.map((user) =>
      publishNotification({ ...input, recipientUserId: user.id }),
    ),
  );
}
