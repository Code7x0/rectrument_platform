/**
 * Persist read/dismissed state for derived notifications when the
 * Notifications Airtable table is not configured.
 */

import { cookies } from "next/headers";

export const NOTIFICATION_READ_COOKIE = "rp_notif_read";
export const NOTIFICATION_READ_ALL_COOKIE = "rp_notif_read_all";
const MAX_IDS = 500;

export function isDerivedNotificationId(id: string): boolean {
  const trimmed = id.trim();
  if (!trimmed) {
    return false;
  }
  return (
    trimmed.startsWith("derived_notif_") ||
    trimmed.startsWith("derived_claim_") ||
    trimmed.startsWith("partner_notif_") ||
    trimmed.startsWith("ephemeral_notif_") ||
    !trimmed.startsWith("rec")
  );
}

export interface NotificationReadContext {
  dismissed: Set<string>;
  readAllBefore: Date | null;
}

export async function getNotificationReadContext(): Promise<NotificationReadContext> {
  const store = await cookies();
  const dismissed = new Set(
    (store.get(NOTIFICATION_READ_COOKIE)?.value ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  );
  const readAllRaw = store.get(NOTIFICATION_READ_ALL_COOKIE)?.value?.trim();
  let readAllBefore: Date | null = null;
  if (readAllRaw) {
    const parsed = Date.parse(readAllRaw);
    if (!Number.isNaN(parsed)) {
      readAllBefore = new Date(parsed);
    }
  }
  return { dismissed, readAllBefore };
}

export async function getDismissedNotificationIds(): Promise<Set<string>> {
  const { dismissed } = await getNotificationReadContext();
  return dismissed;
}

export async function getNotificationReadAllBefore(): Promise<Date | null> {
  const { readAllBefore } = await getNotificationReadContext();
  return readAllBefore;
}

export function resolveDerivedReadStatus(
  id: string,
  createdAt: string | null | undefined,
  context: NotificationReadContext,
): "read" | "unread" {
  if (context.dismissed.has(id)) {
    return "read";
  }
  if (context.readAllBefore && createdAt?.trim()) {
    const at = Date.parse(createdAt);
    if (!Number.isNaN(at) && at <= context.readAllBefore.getTime()) {
      return "read";
    }
  }
  return "unread";
}

export async function setNotificationReadAllBefore(
  when: Date = new Date(),
): Promise<void> {
  const store = await cookies();
  store.set(NOTIFICATION_READ_ALL_COOKIE, when.toISOString(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function dismissNotificationIds(
  ids: string[],
): Promise<Set<string>> {
  const next = await getDismissedNotificationIds();
  for (const id of ids) {
    if (id.trim()) {
      next.add(id.trim());
    }
  }
  const ordered = [...next].slice(-MAX_IDS);
  const store = await cookies();
  store.set(NOTIFICATION_READ_COOKIE, ordered.join(","), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return new Set(ordered);
}
