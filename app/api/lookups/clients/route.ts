import { NextResponse } from "next/server";

import {
  getAppSession,
  resolveAccountManagerScopeId,
} from "@/lib/auth";
import { listClientOptions } from "@/services/lookups";

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
    let data = await listClientOptions();

    if (session.role === "account_manager") {
      const accountManagerId = resolveAccountManagerScopeId(session);
      if (!accountManagerId) {
        return NextResponse.json(
          { success: false, message: "Forbidden" },
          { status: 403 },
        );
      }
      data = data.filter(
        (client) => client.accountManagerId === accountManagerId,
      );
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to load clients" },
      { status: 500 },
    );
  }
}
