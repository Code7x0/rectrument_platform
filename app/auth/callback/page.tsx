import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import {
  getAppSession,
  redirectToRoleDashboard,
} from "@/lib/auth";

/**
 * Post-login bridge:
 * Clerk auth → resolve Airtable user → bind Clerk User ID → role redirect
 */
export default async function AuthCallbackPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  let session;

  try {
    session = await getAppSession();
  } catch {
    redirect("/unauthorized");
  }

  if (!session) {
    redirect("/unauthorized");
  }

  if (session.status !== "active") {
    redirect("/unauthorized");
  }

  redirectToRoleDashboard(session.role);
}
