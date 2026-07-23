import { NextResponse } from "next/server";

import { getAppSession } from "@/lib/auth";
import { listPartnerOptions } from "@/services/lookups";

export async function GET() {
  const session = await getAppSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthenticated" },
      { status: 401 },
    );
  }

  if (session.role === "partner") {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 },
    );
  }

  try {
    const mode =
      session.role === "admin" ? "identity" : "operational";
    const data = await listPartnerOptions(mode);
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to load talent partners" },
      { status: 500 },
    );
  }
}
