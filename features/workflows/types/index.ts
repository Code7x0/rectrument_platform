import type { SubmissionStatus } from "@/features/shared/entities";

export type ActivityEntityType =
  | "submission"
  | "partner_document"
  | "payout"
  | "user";

export type ActivityAction =
  | "status_change"
  | "document_verification"
  | "payout_status_change"
  | "registration_submitted"
  | "partner_approved"
  | "partner_rejected"
  | "invitation_sent"
  | "invitation_accepted"
  | "role_changed"
  | "identity_visibility_changed";

/**
 * Activity record — foundation for Activity Timeline (UI later).
 * Notifications can subscribe to the same write path.
 * Status fields are domain labels (submission or document verification).
 */
export interface Activity {
  id: string;
  entityType: ActivityEntityType;
  entityId: string;
  action: ActivityAction;
  fromStatus: string | null;
  toStatus: string | null;
  actorUserId: string | null;
  note: string | null;
  createdAt: string | null;
}

export interface CreateActivityInput {
  entityType: ActivityEntityType;
  entityId: string;
  action: ActivityAction;
  fromStatus?: string | null;
  toStatus?: string | null;
  actorUserId?: string | null;
  note?: string | null;
}

export interface TransitionSubmissionInput {
  submissionId: string;
  toStatus: SubmissionStatus;
  actorUserId: string;
  note?: string;
}

/**
 * Valid submission status graph.
 * All transitions outside this map are rejected.
 */
export const SUBMISSION_TRANSITION_MAP: Record<
  SubmissionStatus,
  readonly SubmissionStatus[]
> = {
  submitted: ["internal_review", "rejected"],
  internal_review: ["client_review", "rejected"],
  client_review: ["interview", "rejected"],
  interview: ["offer", "rejected"],
  offer: ["joined", "rejected"],
  joined: [],
  rejected: [],
};

export function getAllowedTransitions(
  from: SubmissionStatus,
): SubmissionStatus[] {
  return [...SUBMISSION_TRANSITION_MAP[from]];
}

export function isValidTransition(
  from: SubmissionStatus,
  to: SubmissionStatus,
): boolean {
  return SUBMISSION_TRANSITION_MAP[from].includes(to);
}

export const TRANSITION_ACTION_LABELS: Partial<
  Record<SubmissionStatus, string>
> = {
  internal_review: "Move to Internal Review",
  client_review: "Move to Client Review",
  interview: "Move to Interview",
  offer: "Move to Offer",
  joined: "Mark Joined",
  rejected: "Reject",
};
