export type {
  CreateSubmissionInput,
  SubmissionEntity as Submission,
  SubmissionStatus,
} from "@/features/shared/entities";
export {
  REVIEWABLE_SUBMISSION_STATUSES,
  SUBMISSION_STATUS_LABELS,
} from "@/features/shared/entities";

export interface SubmissionListFilters {
  partnerId?: string;
  jobId?: string;
  allocationId?: string;
  status?: import("@/features/shared/entities").SubmissionStatus | "all";
  search?: string;
}
