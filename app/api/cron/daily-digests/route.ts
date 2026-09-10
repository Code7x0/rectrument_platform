import { NextResponse } from "next/server";

import { getOptionalEnv } from "@/lib/api/env";
import { sendDailyDigests } from "@/services/email/digests/daily-digest.service";

/**
 * Vercel Cron — daily digest emails at 7:00 AM IST (01:30 UTC).
 * Schedule in vercel.json. Protect with CRON_SECRET.
 */
export async function GET(request: Request) {
  const secret = getOptionalEnv("CRON_SECRET")?.trim();
  if (!secret) {
    console.error("[cron] CRON_SECRET is not configured");
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendDailyDigests();
    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron] daily-digests failed", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Digest failed",
      },
      { status: 500 },
    );
  }
}
