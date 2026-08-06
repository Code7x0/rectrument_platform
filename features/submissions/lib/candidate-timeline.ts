import type { Activity } from "@/features/workflows/types";
import type { Submission } from "@/features/submissions/types";
import { DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE } from "@/lib/airtable/fields";

export type CandidateTimelineTone =
  | "done"
  | "current"
  | "pending"
  | "attention";

export interface CandidateTimelineStep {
  id: string;
  label: string;
  detail: string | null;
  at: string | null;
  tone: CandidateTimelineTone;
}

function exactSubmissionStatusLabel(submission: Submission): string {
  const raw = submission.airtableStatus?.trim();
  if (raw) {
    return raw;
  }
  return (
    DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE[submission.status]?.trim() ||
    submission.status
  );
}

function activityStatusLabel(
  row: Activity,
  submission: Submission,
): string | null {
  const note = row.note?.trim() ?? "";
  if (
    note &&
    note !== "interview_stage_updated" &&
    note !== "review_fields_updated" &&
    note !== "Want 2nd level Review of Profile"
  ) {
    // Activity note stores the exact Airtable Submission Status when available.
    return note;
  }

  const to = row.toStatus?.trim() ?? "";
  if (!to || to === "second_level_review") {
    return null;
  }

  // Prefer live Airtable label when this activity matches current domain bucket.
  if (to === submission.status) {
    return exactSubmissionStatusLabel(submission);
  }

  // Domain → default Airtable catalog label (never "Internal Review" / bare "Rejected").
  const mapped =
    DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE[
      to as keyof typeof DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE
    ];
  if (mapped) {
    return mapped.trim();
  }

  // Already an Airtable-looking label (no underscores).
  if (!to.includes("_")) {
    return to;
  }

  return null;
}

/**
 * Partner-facing journey from Submission Status + Interview Stage (independent).
 * Labels always prefer exact Airtable values — never coarse domain badges.
 */
export function buildCandidateTimeline(
  submission: Submission,
  activities: Activity[] = [],
): CandidateTimelineStep[] {
  const steps: CandidateTimelineStep[] = [];

  steps.push({
    id: "submitted",
    label: "Submitted",
    detail: submission.jobTitle
      ? `For ${submission.jobTitle}`
      : "Profile submitted by Talent Partner",
    at: submission.submissionDate,
    tone: "done",
  });

  const statusChanges = activities
    .filter(
      (row) =>
        row.action === "status_change" &&
        row.note !== "review_fields_updated" &&
        row.note !== "interview_stage_updated" &&
        row.toStatus &&
        row.toStatus !== "second_level_review",
    )
    .slice()
    .sort((a, b) =>
      (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
    );

  if (statusChanges.length > 0) {
    for (const row of statusChanges) {
      const label = activityStatusLabel(row, submission);
      if (!label) {
        continue;
      }
      steps.push({
        id: `activity-${row.id}`,
        label,
        detail: null,
        at: row.createdAt,
        tone: "done",
      });
    }
  } else if (
    submission.airtableStatus?.trim() ||
    submission.status !== "submitted"
  ) {
    steps.push({
      id: `status-${submission.id}`,
      label: exactSubmissionStatusLabel(submission),
      detail: "Submission status",
      at: null,
      tone: submission.status === "rejected" ? "attention" : "done",
    });
  }

  // Interview Stage is a separate Airtable field — never folded into submission status.
  if (submission.interviewStage?.trim()) {
    steps.push({
      id: "interview-stage",
      label: submission.interviewStage.trim(),
      detail: "Interview stage",
      at: null,
      tone:
        submission.status === "joined" || submission.status === "rejected"
          ? "done"
          : "current",
    });
  }

  if (submission.wantsSecondLevelReview) {
    steps.push({
      id: "second-review",
      label: "Second Level Review Requested",
      detail: submission.secondLevelReviewLabel,
      at: null,
      tone: "attention",
    });
  }

  const terminal =
    submission.status === "joined" || submission.status === "rejected";
  if (!terminal || submission.wantsSecondLevelReview) {
    steps.push({
      id: "awaiting",
      label: submission.wantsSecondLevelReview
        ? "Awaiting 2nd Level Review"
        : "Awaiting Review",
      detail: null,
      at: null,
      tone: "pending",
    });
  }

  return steps;
}
