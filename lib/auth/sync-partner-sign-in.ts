import { ensureClerkUserForEmail } from "@/lib/clerk/provision-clerk-user";
import { resolveSignInEligibility } from "@/lib/auth/sign-in-eligibility";
import type { SignInEligibilityResult } from "@/lib/auth/sign-in-eligibility";
import { isClientIdentityMode } from "@/lib/airtable/identity-mode";
import { clientSyncPartnerOfficialEmail } from "@/services/users/client-identity.adapter";
import { findUserByEmail } from "@/services/users/users.service";
import type { User } from "@/types";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type PreparePartnerSignInResult = SignInEligibilityResult & {
  user?: User | null;
};

/**
 * Resolve an Airtable identity (including manually added Partners rows),
 * sync login email onto the partner record when needed, and provision Clerk
 * so hosted sign-in / email OTP work without app registration.
 */
export async function preparePartnerSignIn(
  email: string,
): Promise<PreparePartnerSignInResult> {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return {
      ok: false,
      code: "not_found",
      message: "Enter a valid email address.",
      user: null,
    };
  }

  const user = await findUserByEmail(normalized);
  const eligibility = resolveSignInEligibility(user);
  if (!eligibility.ok) {
    return { ...eligibility, user };
  }

  if (user?.role === "partner" && user.partnerId && isClientIdentityMode()) {
    try {
      await clientSyncPartnerOfficialEmail(user.partnerId, normalized);
    } catch (error) {
      console.error("[auth] partner email sync failed (non-blocking)", {
        partnerId: user.partnerId,
        email: normalized,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  await ensureClerkUserForEmail(normalized, user?.fullName);
  return { ...eligibility, user };
}
