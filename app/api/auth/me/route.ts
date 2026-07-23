import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

import { getAppSession } from "@/lib/auth";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Unauthenticated" },
      { status: 401 },
    );
  }

  const clerkUser = await currentUser();
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress;

  if (!email) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Your account has not been configured. Please contact the Administrator.",
      },
      { status: 401 },
    );
  }

  try {
    const session = await getAppSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your account has not been configured. Please contact the Administrator.",
        },
        { status: 401 },
      );
    }

    if (session.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          message: "Your account is not active. Please contact the Administrator.",
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to resolve user session" },
      { status: 500 },
    );
  }
}
