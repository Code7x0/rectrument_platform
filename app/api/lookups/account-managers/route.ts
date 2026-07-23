import { NextResponse } from "next/server";

import { getAppSession } from "@/lib/auth";
import { listAccountManagerOptions } from "@/services/lookups";

export async function GET() {
  const session = await getAppSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthenticated" },
      { status: 401 },
    );
  }

  try {
    const data = await listAccountManagerOptions();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to load account managers" },
      { status: 500 },
    );
  }
}
