import {
  SUBMISSION_STATUS_LABELS,
  type SubmissionEntity,
} from "@/features/shared/entities";
import { resolveAirtableSubmissionStatusOption } from "@/lib/airtable/fields";

/**
 * Dashboard / queue status groups keyed to exact Airtable Submission Status
 * labels. Counts and click-through filters must use these — domain buckets
 * alone conflate Hold with Internal Screening (both map to internal_review).
 */
export const SUBMISSION_STATUS_GROUPS = {
  pending_review: ["Pending Review", "Submitted"],
  hold: ["Hold"],
  internal_screening: [
    "Internal Screening in Progress",
    "Internal Review",
  ],
  being_submitted: [
    "Being Submitted to Client ",
    "Being Submitted to Client",
    "Submitted to Client",
    "Client Review",
  ],
  interviewing: [
    "Interviewing",
    "Interview",
    "Interview L1",
    "Interview L2",
  ],
  offers: ["Offered", "Selected", "Offer"],
  joined: ["Joined"],
} as const;

export type SubmissionStatusGroupId = keyof typeof SUBMISSION_STATUS_GROUPS;

export function submissionExactStatusLabel(
  submission: Pick<SubmissionEntity, "status" | "airtableStatus">,
): string {
  const resolved = resolveAirtableSubmissionStatusOption(
    submission.airtableStatus,
  );
  if (resolved?.trim()) {
    return resolved.trim();
  }
  return SUBMISSION_STATUS_LABELS[submission.status] ?? "";
}

function labelMatchesAny(
  label: string,
  options: readonly string[],
): boolean {
  const normalized = label.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return options.some((option) => option.trim().toLowerCase() === normalized);
}

export function matchesSubmissionStatusGroup(
  submission: Pick<SubmissionEntity, "status" | "airtableStatus">,
  groupId: SubmissionStatusGroupId,
): boolean {
  return labelMatchesAny(
    submissionExactStatusLabel(submission),
    SUBMISSION_STATUS_GROUPS[groupId],
  );
}

export function matchesExactSubmissionStatuses(
  submission: Pick<SubmissionEntity, "status" | "airtableStatus">,
  statuses: readonly string[],
): boolean {
  return labelMatchesAny(submissionExactStatusLabel(submission), statuses);
}

/** Build candidates list URL with optional exact status or status group filter. */
export function candidatesListHref(
  basePath: string,
  options: {
    status?: string | readonly string[];
    statusGroup?: SubmissionStatusGroupId;
    submissionId?: string;
    jobId?: string;
  } = {},
): string {
  const params = new URLSearchParams();
  if (options.statusGroup) {
    params.set("statusGroup", options.statusGroup);
  } else if (options.status !== undefined) {
    const list = Array.isArray(options.status)
      ? options.status
      : [options.status];
    const cleaned = list.map((s) => s.trim()).filter(Boolean);
    if (cleaned.length === 1) {
      params.set("status", cleaned[0]!);
    } else if (cleaned.length > 1) {
      params.set("status", cleaned.join("|"));
    }
  }
  if (options.submissionId?.trim()) {
    params.set("submissionId", options.submissionId.trim());
  }
  if (options.jobId?.trim()) {
    params.set("jobId", options.jobId.trim());
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function parseStatusFilterParam(
  value: string | null | undefined,
): string[] {
  if (!value?.trim()) {
    return [];
  }
  return value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function isSubmissionStatusGroupId(
  value: string | null | undefined,
): value is SubmissionStatusGroupId {
  return Boolean(
    value &&
      Object.prototype.hasOwnProperty.call(SUBMISSION_STATUS_GROUPS, value),
  );
}
