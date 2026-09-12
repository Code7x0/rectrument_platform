import type { User } from "@/types";

import { canUserAuthenticate } from "@/services/users";

export type SignInEligibilityCode =
  | "pending"
  | "rejected"
  | "inactive"
  | "not_found";

export type SignInEligibilityResult =
  | { ok: true }
  | { ok: false; code: SignInEligibilityCode; message: string };

/**
 * Pure eligibility check for first-time Clerk sign-up (email OTP).
 * Caller must resolve the Airtable identity first.
 */
export function resolveSignInEligibility(
  user: User | null,
): SignInEligibilityResult {
  if (!user) {
    return {
      ok: false,
      code: "not_found",
      message:
        "No account found for this email. Ask an Admin to add you in Airtable (Partners → Official Email ID or Personal Email, Status = Active), register at OVATO, or use the same email you applied with.",
    };
  }

  if (user.registrationStatus === "pending") {
    return {
      ok: false,
      code: "pending",
      message:
        "Your Talent Partner application is still pending approval. Sign in will work once an Admin activates your account.",
    };
  }

  if (user.registrationStatus === "invitation_pending") {
    return {
      ok: false,
      code: "pending",
      message:
        "Your account invitation is still pending. Open the invitation email from your Administrator and complete setup first.",
    };
  }

  if (user.registrationStatus === "rejected") {
    return {
      ok: false,
      code: "rejected",
      message:
        "Your Talent Partner application was rejected. Contact the Administrator if you believe this is a mistake.",
    };
  }

  if (!canUserAuthenticate(user)) {
    return {
      ok: false,
      code: "inactive",
      message:
        "Your account is not active yet. Ask an Admin to set Partners → Status = Active, then try again.",
    };
  }

  return { ok: true };
}
