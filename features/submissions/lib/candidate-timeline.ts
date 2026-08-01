import type { Activity } from "@/features/workflows/types";
import type { Submission } from "@/features/submissions/types";
import { SUBMISSION_STATUS_LABELS } from "@/features/shared/entities";

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

/**
 * Derive a partner-facing recruitment journey from current fields + activities.
 * No Airtable schema changes — uses Submission Status, Interview Stage,
 * 2nd-level review flag, Submission Date, and status_change activities when present.
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
        row.toStatus &&
        row.toStatus !== "second_level_review",
    )
    .slice()
    .sort((a, b) =>
      (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
    );

  if (statusChanges.length > 0) {
    for (const row of statusChanges) {
      const to = row.toStatus ?? "";
      const label =
        SUBMISSION_STATUS_LABELS[to as keyof typeof SUBMISSION_STATUS_LABELS] ??
        to.replace(/_/g, " ");
      steps.push({
        id: `activity-${row.id}`,
        label,
        detail: row.note && row.note !== "Want 2nd level Review of Profile"
          ? row.note
          : null,
        at: row.createdAt,
        tone: "done",
      });
    }
  } else if (submission.status !== "submitted") {
    steps.push({
      id: `status-${submission.status}`,
      label: SUBMISSION_STATUS_LABELS[submission.status],
      detail: null,
      at: null,
      tone: submission.status === "rejected" ? "attention" : "done",
    });
  }

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
