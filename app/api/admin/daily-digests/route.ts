import { NextResponse } from "next/server";

import { getAppSession } from "@/lib/auth";
import { sendDailyDigests } from "@/services/email/digests/daily-digest.service";

export const maxDuration = 300;

/**
 * Super Admin manual digest send — runs to completion (unlike fire-and-forget cron).
 */
export async function POST() {
  const session = await getAppSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await sendDailyDigests();
    console.info("[admin] daily-digests finished", {
      by: session.email,
      ...result,
    });
    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[admin] daily-digests failed", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Digest failed",
      },
      { status: 500 },
    );
  }
}
