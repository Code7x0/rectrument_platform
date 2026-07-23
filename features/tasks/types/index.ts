import type { AllocationStatus } from "@/features/allocations/types";
import type { Job, JobPriority } from "@/features/jobs/types";

/**
 * Task audiences — Partner is implemented now;
 * AM / Admin queues reuse the same module later.
 */
export type TaskAudience = "partner" | "account_manager" | "admin";

/**
 * Concrete task kinds. Only partner_allocation ships in Feature 5.
 */
export type TaskKind = "partner_allocation";

/**
 * Partner work-queue item: one active allocation + job context.
 * Answers: “What jobs do I need to work on today?”
 */
export interface PartnerWorkTask {
  id: string;
  kind: "partner_allocation";
  audience: "partner";
  allocationId: string;
  allocationStatus: AllocationStatus;
  jobId: string;
  jobTitle: string;
  jobCode: string | null;
  clientName: string | null;
  location: string | null;
  experience: string | null;
  priority: JobPriority | null;
  expectedProfiles: number;
  submittedProfiles: number;
  remainingProfiles: number;
  assignedDate: string | null;
  /** Full job for Open Job drawer / future Submit Candidate. */
  job: Job;
}

export type WorkTask = PartnerWorkTask;

export const PRIORITY_SORT_ORDER: Record<JobPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};
