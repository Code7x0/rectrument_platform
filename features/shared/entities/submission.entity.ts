import type { JobPriority } from "./job.entity";

/**
 * Canonical Submission entity — a business event linking Candidate ↔ Job.
 * Never conflate with Candidate (person).
 *
 * Status transitions MUST go through features/workflows — never patch status elsewhere.
 */

export type SubmissionStatus =
  | "submitted"
  | "internal_review"
  | "client_review"
  | "interview"
  | "offer"
  | "joined"
  | "rejected";

export interface SubmissionEntity {
  id: string;
  submissionCode: string | null;
  candidateId: string;
  candidateName: string | null;
  jobId: string;
  jobTitle: string | null;
  /** Job priority for review queue sorting (enriched). */
  jobPriority: JobPriority | null;
  allocationId: string;
  partnerId: string;
  partnerName: string | null;
  submissionDate: string | null;
  status: SubmissionStatus;
  remarks: string | null;
}

export interface CreateSubmissionInput {
  candidateId: string;
  jobId: string;
  allocationId: string;
  partnerId: string;
  submissionDate?: string;
  status?: SubmissionStatus;
  remarks?: string;
}

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  submitted: "Submitted",
  internal_review: "Internal Review",
  client_review: "Client Review",
  interview: "Interview",
  offer: "Offer",
  joined: "Joined",
  rejected: "Rejected",
};

/** Queue: open pipeline (not joined / rejected). */
export const REVIEWABLE_SUBMISSION_STATUSES: SubmissionStatus[] = [
  "submitted",
  "internal_review",
  "client_review",
  "interview",
  "offer",
];
