import { getOptionalEnv } from "@/lib/api/env";

/**
 * Vercel Cron sends Authorization: Bearer CRON_SECRET when CRON_SECRET is set.
 * Also accepts x-vercel-cron: 1 (set only on Vercel-scheduled invocations).
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = getOptionalEnv("CRON_SECRET")?.trim();
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth === `Bearer ${secret}`) {
      return true;
    }
  }

  // Vercel injects this only on scheduled cron invocations (not spoofable off-platform).
  if (
    getOptionalEnv("VERCEL") === "1" &&
    request.headers.get("x-vercel-cron") === "1"
  ) {
    return true;
  }

  return false;
}

export function cronAuthFailureResponse(): {
  status: number;
  body: { error: string };
} {
  const secret = getOptionalEnv("CRON_SECRET")?.trim();
  if (!secret) {
    return {
      status: 503,
      body: { error: "Cron not configured — set CRON_SECRET on Vercel" },
    };
  }
  return { status: 401, body: { error: "Unauthorized" } };
}
