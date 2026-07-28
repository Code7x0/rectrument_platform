import { NextResponse } from "next/server";

import { getAppSession } from "@/lib/auth";
import { validateStartupConfiguration } from "@/lib/airtable/startup-validation";

/**
 * Production health check.
 * Unauthenticated callers only receive a coarse status (no schema/env leak).
 * Admin / Super Admin receive full diagnostics.
 */
export async function GET() {
  try {
    const validation = await validateStartupConfiguration();
    const session = await getAppSession();
    const elevated =
      session?.role === "super_admin" || session?.role === "admin";

    if (!elevated) {
      return NextResponse.json(
        {
          status: validation.ok ? "ok" : "degraded",
          timestamp: validation.checkedAt,
        },
        { status: validation.ok ? 200 : 503 },
      );
    }

    return NextResponse.json(
      {
        status: validation.ok ? "ok" : "degraded",
        timestamp: validation.checkedAt,
        summary: validation.summary,
        checks: validation.items,
      },
      { status: validation.ok ? 200 : 503 },
    );
  } catch {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        message: "Health check failed",
      },
      { status: 503 },
    );
  }
}
