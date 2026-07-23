/**
 * Canonical Allocation entity — independent of Airtable field names.
 */

export type AllocationStatus =
  | "assigned"
  | "working"
  | "completed"
  | "cancelled"
  | "archived";

export interface AllocationEntity {
  id: string;
  allocationCode: string | null;
  jobId: string;
  jobTitle: string | null;
  jobCode: string | null;
  partnerId: string;
  /** Partner ID code (e.g. TP-0042) — always safe for Account Managers. */
  partnerCode: string | null;
  /**
   * Partner company/contact — Admin only.
   * Account Managers receive null (privacy).
   */
  partnerName: string | null;
  /** Account Manager who owns the job / created the allocation. */
  accountManagerId: string | null;
  assignedById: string | null;
  assignedDate: string | null;
  status: AllocationStatus;
  expectedProfiles: number;
  profilesSubmitted: number;
  notes: string | null;
}

export const ALLOCATION_STATUS_LABELS: Record<AllocationStatus, string> = {
  assigned: "Assigned",
  working: "Working",
  completed: "Completed",
  cancelled: "Cancelled",
  archived: "Archived",
};

export const ACTIVE_ALLOCATION_STATUSES: AllocationStatus[] = [
  "assigned",
  "working",
];
