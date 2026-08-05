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

export function partnerEditLockMessage(
  submission: Pick<Submission, "status" | "airtableStatus">,
): string | null {
  if (isUnreviewedByStaff(submission)) {
    return null;
  }
  return "This profile is locked after internal review.";
}
