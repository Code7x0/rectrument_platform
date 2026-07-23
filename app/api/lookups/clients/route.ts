import { NextResponse } from "next/server";

import { getAppSession } from "@/lib/auth";
import { listClientOptions } from "@/services/lookups";

export async function GET() {
  const session = await getAppSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthenticated" },
      { status: 401 },
    );
  }

  try {
    const data = await listClientOptions();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to load clients" },
      { status: 500 },
    );
  }
}
