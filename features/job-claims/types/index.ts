import type { JobPriority, JobStatus } from "@/features/jobs/types";
import type { JobDocument } from "@/features/shared/entities";

/** Application-side claim lifecycle (not Airtable). */
export type JobClaimStatus = "pending" | "approved" | "rejected";

/** Partner-facing claim UI state for an available job. */
export type PartnerJobClaimUiState =
  | "available"
  | "pending"
  | "approved"
  | "rejected";

export interface JobClaim {
  id: string;
  partnerId: string;
  jobId: string;
  /** Primary AM to review (from job / client owner). */
  accountManagerId: string | null;
  status: JobClaimStatus;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  rejectionReason: string | null;
  /** Set when approval creates an Airtable allocation. */
  allocationId: string | null;
}

export interface JobClaimsStoreFile {
  version: 1;
  claims: JobClaim[];
}

/**
 * Sanitized job payload for Partners before allocation approval.
 * Never includes client identity fields.
 */
export interface PartnerAvailableJob {
  id: string;
  jobCode: string | null;
  title: string;
  location: string | null;
  experience: string | null;
  workMode: string | null;
  daysOfWorking: string | null;
  salary: string | null;
  possiblePayout: string | null;
  priority: JobPriority | null;
  status: JobStatus;
  description: string | null;
  interviewProcess: string | null;
  documents: JobDocument[];
  claimState: PartnerJobClaimUiState;
  claimId: string | null;
  claimRequestedAt: string | null;
  claimRejectionReason: string | null;
}

export interface JobClaimReviewItem {
  claim: JobClaim;
  jobTitle: string;
  jobCode: string | null;
  partnerCode: string;
  partnerName: string | null;
  specialization: string | null;
  skills: string | null;
  experience: string | null;
}
