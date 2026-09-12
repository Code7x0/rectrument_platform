"use server";

import { preparePartnerSignIn } from "@/lib/auth/sync-partner-sign-in";

export type {
  SignInEligibilityCode,
  SignInEligibilityResult,
} from "@/lib/auth/sign-in-eligibility";

/**
 * Gate sign-in to identities that exist in Airtable (including manually added
 * Partners rows) and are allowed to log in. Provisions Clerk + syncs email.
 */
export async function checkSignInEligibilityAction(email: string) {
  const { user: _user, ...eligibility } = await preparePartnerSignIn(email);
  return eligibility;
}
