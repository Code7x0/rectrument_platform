import type { SubmissionEntity } from "@/features/shared/entities";
import { matchesSubmissionStatusGroup } from "@/features/submissions/lib/submission-status-buckets";

/**
 * Payout UI and ledgers only surface candidates who have progressed to
 * client selection or beyond — not active interview stages.
 */
export function isPayoutVisibleRecruitment(
  submission: Pick<SubmissionEntity, "status" | "airtableStatus">,
): boolean {
  return (
    matchesSubmissionStatusGroup(submission, "selected") ||
    matchesSubmissionStatusGroup(submission, "offers") ||
    matchesSubmissionStatusGroup(submission, "joined")
  );
}
