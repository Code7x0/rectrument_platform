import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import {
  getAppSession,
  getDashboardRouteForRole,
  redirectToRoleDashboard,
} from "@/lib/auth";
import { canUserAuthenticate, getCurrentUser } from "@/services/users.service";

/**
 * Collect all emails on the Clerk user — Google sometimes uses a non-primary
 * verified address that still matches Airtable Official / Personal Email.
 */
function clerkEmails(
  user: NonNullable<Awaited<ReturnType<typeof currentUser>>>,
): string[] {
  const emails = user.emailAddresses
    .map((row) => row.emailAddress?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));
  const primary = user.primaryEmailAddress?.emailAddress
    ?.trim()
    .toLowerCase();
  if (primary && !emails.includes(primary)) {
    emails.unshift(primary);
  }
  return [...new Set(emails)];
}

/**
 * Post-login bridge:
 * Clerk auth → resolve Airtable user → role redirect
 */
export default async function AuthCallbackPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const clerkUser = await currentUser();
  const emails = clerkUser ? clerkEmails(clerkUser) : [];
  const primaryEmail = emails[0] ?? "";

  let session;

  try {
    session = await getAppSession();
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("[auth/callback] session build failed", error);
    redirect("/unauthorized?reason=error");
  }

  if (!session) {
    // Diagnose + recover: try every Clerk email against Airtable identity.
    let foundUser = null as Awaited<ReturnType<typeof getCurrentUser>>;
    try {
      for (const email of emails) {
        const user = await getCurrentUser(userId, email);
        if (user) {
          foundUser = user;
          break;
        }
      }
    } catch (error) {
      if (isRedirectError(error)) {
        throw error;
      }
      console.error("[auth/callback] identity diagnose failed", error);
      redirect("/unauthorized?reason=error");
    }

    if (!foundUser) {
      console.warn("[auth/callback] no Airtable identity", {
        primaryEmail,
        emails,
      });
      redirect("/unauthorized?reason=not_found");
    }

    if (!canUserAuthenticate(foundUser)) {
      if (
        foundUser.registrationStatus === "pending" ||
        foundUser.registrationStatus === "invitation_pending"
      ) {
        redirect("/unauthorized?reason=pending");
      }
      if (foundUser.registrationStatus === "rejected") {
        redirect("/unauthorized?reason=rejected");
      }
      redirect("/unauthorized?reason=inactive");
    }

    // Eligible partner/staff — do not fall through to not_found.
    console.info("[auth/callback] recovered session via diagnose", {
      email: foundUser.email,
      role: foundUser.role,
      partnerId: foundUser.partnerId,
    });
    redirect(getDashboardRouteForRole(foundUser.role));
  }

  if (session.status !== "active") {
    redirect("/unauthorized?reason=inactive");
  }

  redirectToRoleDashboard(session.role);
}
