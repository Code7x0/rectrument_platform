import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";

import {
  getAppSession,
  redirectToRoleDashboard,
} from "@/lib/auth";
import { canUserAuthenticate, getCurrentUser } from "@/services/users.service";

/**
 * Post-login bridge:
 * Clerk auth → resolve Airtable user → bind Clerk User ID → role redirect
 */
export default async function AuthCallbackPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const clerkUser = await currentUser();
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    "";

  let session;

  try {
    session = await getAppSession();
  } catch (error) {
    console.error("[auth/callback] session build failed", error);
    redirect("/unauthorized?reason=error");
  }

  if (!session) {
    if (email) {
      try {
        const user = await getCurrentUser(userId, email);
        if (!user) {
          redirect("/unauthorized?reason=not_found");
        }
        if (!canUserAuthenticate(user)) {
          if (
            user.registrationStatus === "pending" ||
            user.registrationStatus === "invitation_pending"
          ) {
            redirect("/unauthorized?reason=pending");
          }
          if (user.registrationStatus === "rejected") {
            redirect("/unauthorized?reason=rejected");
          }
          redirect("/unauthorized?reason=inactive");
        }
      } catch (error) {
        console.error("[auth/callback] identity diagnose failed", error);
      }
    }
    redirect("/unauthorized?reason=not_found");
  }

  if (session.status !== "active") {
    redirect("/unauthorized?reason=inactive");
  }

  redirectToRoleDashboard(session.role);
}
