import {
  matchesSubmissionStatusGroup,
  submissionExactStatusLabel,
} from "@/features/submissions/lib/submission-status-buckets";
import type { Submission } from "@/features/submissions/types";

/** Statuses that trigger AM alert + hard block (no Partner credit). */
const DUP_ALERT_EXACT_LABELS = new Set(
  [
    "Hold",
    "Candidate Backed Out",
    "Client Duplicate",
    "Internal Duplicate",
    "Rejected - Internal Screening - TS",
    "Rejected Resume Review-TS",
    "Rejected Resume Review-Client",
    "Rejected Interview Process",
    "Rejected by client",
    "Not Responding",
    "Not Moved,Role Closed",
  ].map((label) => label.trim().toLowerCase()),
);

export type DuplicatePolicyOutcome =
  | { action: "allow" }
  | {
      action: "block_alert_am";
      message: string;
      existingStatus: string;
    }
  | {
      action: "block_show_status";
      message: string;
      existingStatus: string;
    };

/**
 * Decide how to handle a mobile/email match against an existing candidate's
 * latest submission. Does not mutate candidate records.
 */
export function evaluateDuplicateCandidatePolicy(
  existingSubmissions: Submission[],
): DuplicatePolicyOutcome {
  if (existingSubmissions.length === 0) {
    return { action: "allow" };
  }

  const latest = [...existingSubmissions].sort((a, b) =>
    (b.submissionDate ?? "").localeCompare(a.submissionDate ?? ""),
  )[0]!;
  const label = submissionExactStatusLabel(latest).trim();
  const normalized = label.toLowerCase();

  if (DUP_ALERT_EXACT_LABELS.has(normalized)) {
    return {
      action: "block_alert_am",
      existingStatus: label || "Rejected",
      message:
        "This candidate mobile number already exists in a closed or held process. Your submission was not created. An Account Manager has been notified.",
    };
  }

  const inActivePipeline =
    matchesSubmissionStatusGroup(latest, "pending_review") ||
    matchesSubmissionStatusGroup(latest, "internal_screening") ||
    matchesSubmissionStatusGroup(latest, "being_submitted") ||
    matchesSubmissionStatusGroup(latest, "interviewing") ||
    matchesSubmissionStatusGroup(latest, "selected") ||
    matchesSubmissionStatusGroup(latest, "offers") ||
    matchesSubmissionStatusGroup(latest, "joined");

  if (inActivePipeline) {
    return {
      action: "block_show_status",
      existingStatus: label || "In process",
      message: `This candidate is already in the pipeline (status: ${label || "In process"}). A duplicate submission was not created.`,
    };
  }

  // Unknown / other rejected variants — still block + alert AM.
  if (latest.status === "rejected" || normalized.includes("reject")) {
    return {
      action: "block_alert_am",
      existingStatus: label || "Rejected",
      message:
        "This candidate mobile number already exists. Your submission was not created. An Account Manager has been notified.",
    };
  }

  return {
    action: "block_show_status",
    existingStatus: label || "Existing",
    message: `A matching candidate already exists (status: ${label || "Existing"}). A duplicate was not created.`,
  };
}
