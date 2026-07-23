"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import {
  archiveNotification,
  deleteNotification,
  getOrCreatePreferences,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
  updatePreferences,
} from "@/features/notifications/services/notifications.service";
import { updatePreferencesSchema } from "@/features/notifications/schemas/notifications.schema";
import type {
  Notification,
  NotificationPreferences,
} from "@/features/notifications/types";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; message: string };

function revalidateNotificationPaths() {
  revalidatePath("/notifications");
  revalidatePath("/notifications/preferences");
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<ActionResult<Notification>> {
  try {
    const session = await requirePermission("view_own_notifications");
    const row = await markNotificationRead(notificationId, session.userId);
    revalidateNotificationPaths();
    return { success: true, data: row };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to mark read"),
    };
  }
}

export async function markAllNotificationsReadAction(): Promise<
  ActionResult<{ count: number }>
> {
  try {
    const session = await requirePermission("view_own_notifications");
    const count = await markAllNotificationsRead(session.userId);
    revalidateNotificationPaths();
    return { success: true, data: { count } };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to mark all read"),
    };
  }
}

export async function archiveNotificationAction(
  notificationId: string,
): Promise<ActionResult<Notification>> {
  try {
    const session = await requirePermission("view_own_notifications");
    const row = await archiveNotification(notificationId, session.userId);
    revalidateNotificationPaths();
    return { success: true, data: row };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to archive"),
    };
  }
}

export async function deleteNotificationAction(
  notificationId: string,
): Promise<ActionResult<{ ok: true }>> {
  try {
    const session = await requirePermission("view_own_notifications");
    await deleteNotification(notificationId, session.userId);
    revalidateNotificationPaths();
    return { success: true, data: { ok: true } };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to delete"),
    };
  }
}

export async function updateNotificationPreferencesAction(
  input: unknown,
): Promise<ActionResult<NotificationPreferences>> {
  try {
    const session = await requirePermission(
      "manage_own_notification_preferences",
    );
    const parsed = updatePreferencesSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Invalid preferences" };
    }
    const prefs = await updatePreferences(session.userId, parsed.data);
    revalidateNotificationPaths();
    return { success: true, data: prefs };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to save preferences"),
    };
  }
}

export async function listNotificationsPageAction(input: {
  page: number;
  pageSize?: number;
  archived?: boolean | "all";
}): Promise<
  ActionResult<{
    items: Notification[];
    page: number;
    hasMore: boolean;
    total: number;
    unreadCount: number;
  }>
> {
  try {
    const session = await requirePermission("view_own_notifications");
    const page = Math.max(1, input.page);
    const pageSize = input.pageSize ?? 40;
    const result = await listNotificationsForUser({
      recipientUserId: session.userId,
      archived: input.archived ?? "all",
      page,
      pageSize,
    });
    return {
      success: true,
      data: {
        items: result.items,
        page: result.page,
        hasMore: result.hasMore,
        total: result.total,
        unreadCount: result.unreadCount,
      },
    };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to load notifications"),
    };
  }
}

export async function ensureNotificationPreferencesAction(): Promise<
  ActionResult<NotificationPreferences>
> {
  try {
    const session = await requirePermission(
      "manage_own_notification_preferences",
    );
    const prefs = await getOrCreatePreferences(session.userId);
    return { success: true, data: prefs };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to load preferences"),
    };
  }
}
