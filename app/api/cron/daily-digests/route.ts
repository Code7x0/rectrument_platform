import { after } from "next/server";
import { NextResponse } from "next/server";

import {
  cronAuthFailureResponse,
  isAuthorizedCronRequest,
} from "@/lib/api/cron-auth";
import { sendDailyDigests } from "@/services/email/digests/daily-digest.service";

/** Partner + AM fan-out can exceed default 10–60s on busy days. */
export const maxDuration = 300;

/**
 * Vercel Cron — daily digest emails at 7:00 AM IST (01:30 UTC).
 * Schedule in vercel.json. Protect with CRON_SECRET.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    const failure = cronAuthFailureResponse();
    if (failure.status === 503) {
      console.error("[cron] CRON_SECRET is not configured");
    }
    return NextResponse.json(failure.body, { status: failure.status });
  }

  const startedAt = new Date().toISOString();
  console.info("[cron] daily-digests started", { startedAt });

  after(async () => {
    try {
      const result = await sendDailyDigests();
      console.info("[cron] daily-digests finished", result);
    } catch (error) {
      console.error("[cron] daily-digests failed", error);
    }
  });

  return NextResponse.json({
    ok: true,
    status: "started",
    startedAt,
    message:
      "Daily digest job queued; emails send in the background (check Vercel logs for attempted/sent).",
  });
}
