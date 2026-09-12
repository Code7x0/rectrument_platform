"use server";

import { canUserAuthenticate } from "@/services/users";
import { findUserByEmail } from "@/services/users/users.service";

export type SignInEligibilityCode =
  | "pending"
  | "rejected"
  | "inactive"
  | "not_found";

export type SignInEligibilityResult =
  | { ok: true }
  | { ok: false; code: SignInEligibilityCode; message: string };

/**
 * Gate first-time Clerk sign-up (email OTP) to identities that already exist
 * and are allowed to log in in Airtable.
 */
export async function checkSignInEligibilityAction(
  email: string,
): Promise<SignInEligibilityResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return {
      ok: false,
      code: "not_found",
      message: "Enter a valid email address.",
    };
  }

  const user = await findUserByEmail(normalized);
  if (!user) {
    return {
      ok: false,
      code: "not_found",
      message:
        "No account found for this email. Talent Partners must register first, then sign in after Admin approval using the same Official Email ID.",
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
