export type {
  CreateSubmissionInput,
  SubmissionEntity as Submission,
  SubmissionStatus,
} from "@/features/shared/entities";
export {
  REVIEWABLE_SUBMISSION_STATUSES,
  SUBMISSION_STATUS_LABELS,
  submissionStatusDisplayLabel,
} from "@/features/shared/entities";

export interface SubmissionListFilters {
  partnerId?: string;
  jobId?: string;
  allocationId?: string;
  status?: import("@/features/shared/entities").SubmissionStatus | "all";
  /** Case-insensitive match against enriched job title. */
  jobTitle?: string;
  search?: string;
  /** Admin/SA only — AM/partner paths must leave this false. */
  includePartnerIdentity?: boolean;
  /** When false, skip job/partner name enrichment (counts / dashboards). */
  enrich?: boolean;
}
