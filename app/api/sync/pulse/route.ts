import { NextResponse } from "next/server";

import { getAppSession } from "@/lib/auth";
import { getSyncFingerprint } from "@/features/notifications/services/notifications.service";

/**
 * Lightweight sync fingerprint for soft real-time UI.
 * Clients poll this and only call router.refresh() when it changes.
 */
export async function GET() {
  const session = await getAppSession();
  if (!session) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  try {
    const { fingerprint, unread } = await getSyncFingerprint(session.userId);
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
