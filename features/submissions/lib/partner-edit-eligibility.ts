import type { Submission } from "@/features/submissions/types";

const UNREVIEWED_AIRTABLE_STATUSES = new Set(["Pending Review", "Submitted"]);

export function isUnreviewedByStaff(
  submission: Pick<Submission, "status" | "airtableStatus">,
): boolean {
  const raw = (submission.airtableStatus ?? "").trim();
  if (!raw) {
    return submission.status === "submitted";
  }
  return UNREVIEWED_AIRTABLE_STATUSES.has(raw);
}

/** Partners may update profile while pending review or during an open 2nd-level review. */
export function canPartnerEditSubmission(
  submission: Pick<
    Submission,
    "status" | "airtableStatus" | "wantsSecondLevelReview"
  >,
): boolean {
  if (isUnreviewedByStaff(submission)) {
    return true;
  }
  return (
    submission.status === "rejected" && Boolean(submission.wantsSecondLevelReview)
  );
}

export function partnerEditLockMessage(
  submission: Pick<
    Submission,
    "status" | "airtableStatus" | "wantsSecondLevelReview"
  >,
): string | null {
  if (canPartnerEditSubmission(submission)) {
    return null;
  }
  if (submission.status === "rejected" && !submission.wantsSecondLevelReview) {
    return "Request a 2nd level review to update this profile after rejection.";
  }
  return "This profile is locked after internal review.";
}
