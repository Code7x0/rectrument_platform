import { clerkClient } from "@clerk/nextjs/server";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Ensure a Clerk user exists for an approved partner/staff email so
 * hosted Clerk sign-in and email OTP do not return "Couldn't find your account".
 * Best-effort — never blocks approval or eligibility checks.
 */
export async function ensureClerkUserForEmail(
  email: string,
  fullName?: string | null,
): Promise<{ created: boolean; clerkUserId: string | null }> {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return { created: false, clerkUserId: null };
  }

  try {
    const client = await clerkClient();
    const existing = await client.users.getUserList({
      emailAddress: [normalized],
      limit: 1,
    });
    const found = existing.data[0];
    if (found) {
      return { created: false, clerkUserId: found.id };
    }

    const created = await client.users.createUser({
      emailAddress: [normalized],
      firstName: fullName?.trim() || undefined,
      skipPasswordRequirement: true,
    });
    console.info("[clerk] provisioned user for partner login", {
      email: normalized,
      clerkUserId: created.id,
    });
    return { created: true, clerkUserId: created.id };
  } catch (error) {
    console.error("[clerk] ensure user failed (non-blocking)", {
      email: normalized,
      error: error instanceof Error ? error.message : error,
    });
    return { created: false, clerkUserId: null };
  }
}
