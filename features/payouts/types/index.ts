/**
 * Payout — financial outcome tied to a Submission (not Candidate).
 */

import type { SubmissionStatus } from "@/features/shared/entities";

export type PayoutStatus =
  | "not_eligible"
  | "eligible"
  | "processing"
  | "paid"
  | "completed";

export interface Payout {
  id: string;
  payoutCode: string | null;
  submissionId: string;
  partnerId: string;
  partnerCode: string | null;
  /** Admin-only identity label; null for Account Managers. */
  partnerName: string | null;
  jobId: string;
  jobTitle: string | null;
  candidateId: string;
  candidateName: string | null;
  accountManagerId: string | null;
  accountManagerName: string | null;
  recruitmentStatus: SubmissionStatus | null;
  amount: number | null;
  currency: string;
  eligibleDate: string | null;
  paidDate: string | null;
  payoutStatus: PayoutStatus;
  notes: string | null;
  lastUpdated: string | null;
}

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  not_eligible: "Not Eligible",
  eligible: "Eligible",
  processing: "Processing",
  paid: "Paid",
  completed: "Completed",
};

/** Account Manager operational transitions. */
export const AM_PAYOUT_TRANSITIONS: Record<
  PayoutStatus,
  readonly PayoutStatus[]
> = {
  not_eligible: ["eligible"],
  eligible: ["processing", "not_eligible"],
  processing: ["eligible"],
  paid: [],
  completed: [],
};

/** Admin full transitions including payment completion. */
export const ADMIN_PAYOUT_TRANSITIONS: Record<
  PayoutStatus,
  readonly PayoutStatus[]
> = {
  not_eligible: ["eligible"],
  eligible: ["processing", "not_eligible"],
  processing: ["paid", "eligible"],
  paid: ["completed"],
  completed: [],
};

export interface CreatePayoutInput {
  submissionId: string;
  partnerId: string;
  jobId: string;
  candidateId: string;
  amount?: number | null;
  currency?: string;
  payoutStatus?: PayoutStatus;
  notes?: string;
}

export interface UpdatePayoutInput {
  amount?: number | null;
  currency?: string;
  payoutStatus?: PayoutStatus;
  eligibleDate?: string | null;
  paidDate?: string | null;
  notes?: string | null;
  lastUpdated?: string;
}

export interface PayoutListFilters {
  partnerId?: string;
  accountManagerId?: string;
  payoutStatus?: PayoutStatus | "all";
  search?: string;
  includePartnerIdentity?: boolean;
}

export interface PartnerEarningsSummary {
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  currency: string;
}

export interface PayoutWithSubmission extends Payout {
  submissionCode: string | null;
  submissionDate: string | null;
}
