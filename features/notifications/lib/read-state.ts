/**
 * Persist read/dismissed state for derived notifications when the
 * Notifications Airtable table is not configured.
 */

import { cookies } from "next/headers";

export const NOTIFICATION_READ_COOKIE = "rp_notif_read";
const MAX_IDS = 120;

export function isDerivedNotificationId(id: string): boolean {
  return (
    id.startsWith("derived_notif_") ||
    id.startsWith("derived_claim_") ||
    id.startsWith("ephemeral_notif_")
  );
}

export async function getDismissedNotificationIds(): Promise<Set<string>> {
  const store = await cookies();
  const raw = store.get(NOTIFICATION_READ_COOKIE)?.value ?? "";
  if (!raw.trim()) {
    return new Set();
  }
  return new Set(
    raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  );
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
