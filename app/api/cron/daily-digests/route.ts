import { NextResponse } from "next/server";

import { getOptionalEnv } from "@/lib/api/env";
import { sendDailyDigests } from "@/services/email/digests/daily-digest.service";

/**
 * Vercel Cron — daily digest emails (Section 9 of requirements doc).
 * Schedule in vercel.json. Protect with CRON_SECRET.
 */
export async function GET(request: Request) {
  const secret = getOptionalEnv("CRON_SECRET")?.trim();
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
