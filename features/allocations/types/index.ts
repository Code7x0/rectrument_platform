/**
 * Allocations feature types — re-export canonical Allocation entity + DTOs.
 */

export type {
  AllocationEntity as Allocation,
  AllocationStatus,
} from "@/features/shared/entities";
export {
  ACTIVE_ALLOCATION_STATUSES,
  ALLOCATION_STATUS_LABELS,
} from "@/features/shared/entities";

import type { AllocationStatus } from "@/features/shared/entities";

export interface CreateAllocationInput {
  jobId: string;
  partnerId: string;
  accountManagerId?: string;
  assignedById?: string;
  assignedDate?: string;
  expectedProfiles: number;
  notes?: string;
  status?: AllocationStatus;
}

export type UpdateAllocationInput = Partial<{
  expectedProfiles: number;
  profilesSubmitted: number;
  status: AllocationStatus;
  notes: string;
  assignedDate: string;
}>;

export interface AllocationListFilters {
  search?: string;
  status?: AllocationStatus | "all";
  partnerId?: string | "all";
  jobId?: string | "all";
  includeArchived?: boolean;
  /** Admin-only: expose partner company/contact. Default false. */
  includePartnerIdentity?: boolean;
}
