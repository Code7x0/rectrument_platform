import type { RegistrationStatus, User, UserStatus } from "@/types";

/**
 * Classify Partners.Status for login + registration gating.
 * Flexible by design — only explicit blocked/pending labels deny login.
 * Partner verification status is never used here.
 */
export function classifyPartnerAirtableStatus(raw: string | null | undefined): {
  status: UserStatus;
  registrationStatus: RegistrationStatus;
} {
  const normalized = (raw ?? "").trim().toLowerCase();

  if (!normalized) {
    return { status: "inactive", registrationStatus: "pending" };
  }

  if (
    normalized === "inactive" ||
    normalized === "archived" ||
    normalized.includes("reject") ||
    normalized.includes("suspend") ||
    normalized.includes("terminated") ||
    normalized.includes("blocked") ||
    normalized.includes("disabled")
  ) {
    return {
      status: "inactive",
      registrationStatus: normalized.includes("reject")
        ? "rejected"
        : "inactive",
    };
  }

  if (
    normalized === "probation" ||
    normalized === "pending" ||
    normalized === "under review" ||
    normalized.includes("probation") ||
    (normalized.includes("pending") && !normalized.includes("approved"))
  ) {
    return { status: "inactive", registrationStatus: "pending" };
  }

  // Active, Preferred, Approved, Verified, or any other ops label → login allowed.
  return { status: "active", registrationStatus: "active" };
}

/** Whether a partner identity may sign in. Ignores verification status entirely. */
export function canPartnerAuthenticate(user: User): boolean {
  if (user.role !== "partner") {
    return false;
  }
  if (
    user.registrationStatus === "rejected" ||
    user.registrationStatus === "pending" ||
    user.registrationStatus === "invitation_pending"
  ) {
    return false;
  }
  if (user.status === "active") {
    return true;
  }
  return (
    user.registrationStatus === "active" ||
    user.registrationStatus === "approved"
  );
}
