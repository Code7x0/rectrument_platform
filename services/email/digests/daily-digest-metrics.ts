import {
  matchesSubmissionStatusGroup,
  submissionExactStatusLabel,
} from "@/features/submissions/lib/submission-status-buckets";
import { SUBMISSION_STATUS_LABELS } from "@/features/shared/entities";
import type { Submission } from "@/features/submissions/types";
import type { Activity } from "@/features/workflows/types";

export const DEFAULT_SLA_HOURS = 48;

export type JobAmLookup = {
  accountManagerId: string | null;
  accountManagerIds: string[];
  title?: string | null;
  clientName?: string | null;
  priority?: string | null;
};

export function slaHoursForJob(job: JobAmLookup | undefined): number {
  const priority = (job?.priority ?? "normal").toLowerCase();
  if (priority === "urgent") {
    return 24;
  }
  if (priority === "high") {
    return 36;
  }
  return DEFAULT_SLA_HOURS;
}

export function parseDigestDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function inDigestWindow(
  value: string | null | undefined,
  windowStart: Date,
  now: Date,
): boolean {
  const parsed = parseDigestDate(value);
  return parsed != null && parsed >= windowStart && parsed <= now;
}

/** Primary job owner — avoids duplicate SLA counts when multiple AMs share an account. */
export function submissionPrimaryAmId(
  submission: { jobId: string },
  jobMap: Map<string, JobAmLookup>,
): string | null {
  const job = jobMap.get(submission.jobId);
  return job?.accountManagerId ?? null;
}

export function submissionOwnedByAm(
  submission: { jobId: string },
  jobMap: Map<string, JobAmLookup>,
  accountManagerId: string,
): boolean {
  const job = jobMap.get(submission.jobId);
  if (!job) {
    return false;
  }
  if (job.accountManagerId === accountManagerId) {
    return true;
  }
  return job.accountManagerIds.includes(accountManagerId);
}

/** AM-reviewable states only — partner-side delays outside these are not AM SLA breaches. */
export function isAmReviewSlaCandidate(
  submission: Submission,
): boolean {
  return (
    matchesSubmissionStatusGroup(submission, "pending_review") ||
    matchesSubmissionStatusGroup(submission, "internal_screening")
  );
}

function isEnteringAmReviewActivity(activity: Activity): boolean {
  if (activity.action !== "status_change" || !activity.toStatus) {
    return false;
  }
  if (activity.toStatus === "submitted") {
    return true;
  }
  if (activity.toStatus === "internal_review") {
    const note = activity.note?.trim() ?? "";
    return (
      note === "Internal Screening in Progress" ||
      note === "Internal Review" ||
      note === SUBMISSION_STATUS_LABELS.internal_review
    );
  }
  return false;
}

function isLeavingAmReviewActivity(activity: Activity): boolean {
  if (activity.action !== "status_change" || !activity.toStatus) {
    return false;
  }
  if (
    activity.toStatus === "client_review" ||
    activity.toStatus === "interview" ||
    activity.toStatus === "offer" ||
    activity.toStatus === "joined" ||
    activity.toStatus === "rejected"
  ) {
    return true;
  }
  if (activity.toStatus === "internal_review" && activity.note?.trim() === "Hold") {
    return true;
  }
  return false;
}

/** When the submission last entered an AM-reviewable queue (not partner-side delay). */
export function resolveAmSlaClockStart(
  submissionId: string,
  submissionDate: string | null | undefined,
  activities: Activity[],
): Date | null {
  const submissionActivities = activities
    .filter(
      (activity) =>
        activity.entityType === "submission" &&
        activity.entityId === submissionId &&
        activity.action === "status_change",
    )
    .sort(
      (a, b) =>
        (parseDigestDate(a.createdAt)?.getTime() ?? 0) -
        (parseDigestDate(b.createdAt)?.getTime() ?? 0),
    );

  let clockStart: Date | null = null;
  for (const activity of submissionActivities) {
    if (isEnteringAmReviewActivity(activity)) {
      clockStart = parseDigestDate(activity.createdAt) ?? clockStart;
    } else if (isLeavingAmReviewActivity(activity)) {
      clockStart = null;
    }
  }

  return clockStart ?? parseDigestDate(submissionDate ?? null);
}

export function buildAmSlaClockStartMap(
  submissions: Submission[],
  activities: Activity[],
): Map<string, Date> {
  const map = new Map<string, Date>();
  for (const submission of submissions) {
    const start = resolveAmSlaClockStart(
      submission.id,
      submission.submissionDate,
      activities,
    );
    if (start) {
      map.set(submission.id, start);
    }
  }
  return map;
}

export function isSlaBreachedSubmission(
  submission: Submission,
  now: Date,
  jobMap?: Map<string, JobAmLookup>,
  slaClockStart?: Date | null,
): boolean {
  if (!isAmReviewSlaCandidate(submission)) {
    return false;
  }
  const submitted =
    slaClockStart ?? parseDigestDate(submission.submissionDate);
  if (!submitted) {
    return false;
  }
  const job = jobMap?.get(submission.jobId);
  const slaHours = slaHoursForJob(job);
  const cutoff = new Date(now.getTime() - slaHours * 60 * 60 * 1000);
  return submitted <= cutoff;
}

export function slaBreachDays(
  submission: Submission,
  now: Date,
  jobMap?: Map<string, JobAmLookup>,
  slaClockStart?: Date | null,
): number {
  const submitted =
    slaClockStart ?? parseDigestDate(submission.submissionDate);
  if (!submitted) {
    return 0;
  }
  const job = jobMap?.get(submission.jobId);
  const slaHours = slaHoursForJob(job);
  return Math.max(
    0,
    Math.floor((now.getTime() - submitted.getTime()) / (24 * 60 * 60 * 1000)) -
      slaHours / 24,
  );
}

export function countSlaBreachesForPrimaryAm(
  submissions: Submission[],
  jobMap: Map<string, JobAmLookup>,
  accountManagerId: string,
  now: Date,
  slaClockStarts?: Map<string, Date>,
): number {
  return submissions.filter(
    (row) =>
      submissionPrimaryAmId(row, jobMap) === accountManagerId &&
      isSlaBreachedSubmission(
        row,
        now,
        jobMap,
        slaClockStarts?.get(row.id),
      ),
  ).length;
}

export function activityMovedToPipelineStage(
  activity: Activity,
  stage:
    | "internal_screening"
    | "being_submitted"
    | "interviewing"
    | "selected",
): boolean {
  if (activity.action !== "status_change" || !activity.toStatus) {
    return false;
  }
  switch (stage) {
    case "internal_screening":
      return activity.toStatus === "internal_review";
    case "being_submitted":
      return activity.toStatus === "client_review";
    case "interviewing":
      return activity.toStatus === "interview";
    case "selected":
      return activity.toStatus === "offer" || activity.toStatus === "joined";
    default:
      return false;
  }
}

export function countActivityTransitions(
  activities: Activity[],
  submissionMap: Map<string, Submission>,
  jobMap: Map<string, JobAmLookup>,
  windowStart: Date,
  now: Date,
  stage:
    | "internal_screening"
    | "being_submitted"
    | "interviewing"
    | "selected",
  accountManagerId?: string,
): number {
  const seen = new Set<string>();
  let count = 0;

  for (const activity of activities) {
    if (activity.entityType !== "submission") {
      continue;
    }
    if (!inDigestWindow(activity.createdAt, windowStart, now)) {
      continue;
    }
    if (!activityMovedToPipelineStage(activity, stage)) {
      continue;
    }
    const submission = submissionMap.get(activity.entityId);
    if (!submission) {
      continue;
    }
    const primaryAm = submissionPrimaryAmId(submission, jobMap);
    if (!primaryAm) {
      continue;
    }
    if (accountManagerId && primaryAm !== accountManagerId) {
      continue;
    }
    const dedupeKey = `${activity.entityId}:${stage}:${activity.createdAt}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    count += 1;
  }

  return count;
}

export function formatDigestStatusLabel(submission: Submission): string {
  return submissionExactStatusLabel(submission);
}
