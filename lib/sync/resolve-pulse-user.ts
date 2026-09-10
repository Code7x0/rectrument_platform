import { auth, currentUser } from "@clerk/nextjs/server";

import { findUserByClerkId, findUserByEmail } from "@/services/users/users.service";

/**
 * Lightweight identity for /api/sync/pulse only.
 * Avoids getAppSession (last-login writes + multi-email loops) on every poll.
 */
export async function resolvePulseUser(): Promise<{ userId: string } | null> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return null;
  }

  const byClerk = await findUserByClerkId(clerkUserId);
  if (byClerk?.status === "active") {
    return { userId: byClerk.id };
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress?.trim();
  if (!email) {
    return null;
  }

  const byEmail = await findUserByEmail(email);
  if (!byEmail || byEmail.status !== "active") {
    return null;
  }

  return { userId: byEmail.id };
}
