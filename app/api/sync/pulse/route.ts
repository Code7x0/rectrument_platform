import { NextResponse } from "next/server";

import { getSyncFingerprint } from "@/features/notifications/services/notifications.service";
import { getPartnerWorkFingerprint } from "@/lib/sync/partner-work-fingerprint";
import { resolvePulseUser } from "@/lib/sync/resolve-pulse-user";
import { getUserById } from "@/services/users/users.service";

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
    const [{ fingerprint, unread }, user] = await Promise.all([
      getSyncFingerprint(pulseUser.userId),
      getUserById(pulseUser.userId),
    ]);

    let combinedFingerprint = fingerprint;
    if (user?.role === "partner" && user.partnerId) {
      const workFingerprint = await getPartnerWorkFingerprint(user.partnerId);
      combinedFingerprint = `${fingerprint}|pw:${workFingerprint}`;
    }

    return NextResponse.json(
      {
        success: true,
        fingerprint: combinedFingerprint,
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
