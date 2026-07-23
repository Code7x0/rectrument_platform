import {
  applySubmissionStatusChange,
  getSubmissionById,
} from "@/features/submissions/services";
import type { Submission } from "@/features/submissions/types";
import { recordActivity } from "@/features/workflows/services/activity.service";
import {
  getAllowedTransitions,
  isValidTransition,
  type TransitionSubmissionInput,
} from "@/features/workflows/types";
import type { SubmissionStatus } from "@/features/shared/entities";
import { SUBMISSION_STATUS_LABELS } from "@/features/shared/entities";

export class InvalidTransitionError extends Error {
  constructor(from: SubmissionStatus, to: SubmissionStatus) {
    super(
      `Invalid transition: ${SUBMISSION_STATUS_LABELS[from]} → ${SUBMISSION_STATUS_LABELS[to]}`,
    );
    this.name = "InvalidTransitionError";
  }
}

/**
 * Sole entry point for submission status changes.
 * Records an activity for Activity Timeline / Notifications later.
 */
export async function transitionSubmissionStatus(
  input: TransitionSubmissionInput,
): Promise<Submission> {
  const current = await getSubmissionById(input.submissionId);
  if (!current) {
    throw new Error("Submission not found");
  }

  if (!isValidTransition(current.status, input.toStatus)) {
    throw new InvalidTransitionError(current.status, input.toStatus);
  }

  const fromStatus = current.status;
  const updated = await applySubmissionStatusChange(
    input.submissionId,
    input.toStatus,
  );

  try {
    await recordActivity({
      entityType: "submission",
      entityId: input.submissionId,
      action: "status_change",
      fromStatus,
      toStatus: input.toStatus,
      actorUserId: input.actorUserId,
      note: input.note ?? null,
    });
  } catch (error) {
    // Transition succeeded; activity persistence should not roll it back.
    // Timeline feature will surface gaps / retries later.
    console.error("Failed to record workflow activity", error);
  }

  try {
    const { notifySubmissionStatusChanged } = await import(
      "@/features/notifications/services/notification-events"
    );
    await notifySubmissionStatusChanged({
      partnerId: updated.partnerId,
      candidateName: updated.candidateName ?? "Candidate",
      jobTitle: updated.jobTitle ?? "Job",
      submissionId: updated.id,
      toStatus: input.toStatus,
    });
  } catch (error) {
    console.error("Failed to publish submission notification", error);
  }

  return updated;
}

export function listNextStatuses(
  status: SubmissionStatus,
): SubmissionStatus[] {
  return getAllowedTransitions(status);
}
