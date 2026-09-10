import { NextResponse } from "next/server";

import { getSyncFingerprint } from "@/features/notifications/services/notifications.service";
import { resolvePulseUser } from "@/lib/sync/resolve-pulse-user";

/**
 * Lightweight sync fingerprint for soft real-time UI.
 * Clients poll this and only call router.refresh() when it changes.
 */
export async function GET() {
  const pulseUser = await resolvePulseUser();
  if (!pulseUser) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  try {
    const { fingerprint, unread } = await getSyncFingerprint(pulseUser.userId);
    return NextResponse.json(
      {
        success: true,
        fingerprint,
        unread,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("[sync/pulse] failed", error);
    return NextResponse.json(
      { success: false, fingerprint: `err-${Date.now()}` },
      { status: 200 },
    );
  }
}
