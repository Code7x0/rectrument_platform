import { NextResponse } from "next/server";

import { validateStartupConfiguration } from "@/lib/airtable/startup-validation";

/**
 * Production health + configuration diagnostics.
 * Uses Airtable Meta REST + env — never MCP.
 */
export async function GET() {
  try {
    const validation = await validateStartupConfiguration();
    return NextResponse.json(
      {
        status: validation.ok ? "ok" : "degraded",
        timestamp: validation.checkedAt,
        summary: validation.summary,
        checks: validation.items,
      },
      { status: validation.ok ? 200 : 503 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        message:
          error instanceof Error
            ? error.message
            : "Health check failed unexpectedly",
      },
      { status: 503 },
    );
  }
}
