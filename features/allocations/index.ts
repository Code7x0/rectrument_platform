/**
 * Allocation Engine — Feature 4
 *
 * Allocations always originate from a Job (Jobs → Allocate Partner).
 * Never expose a standalone “Create Allocation” entry point.
 */

export type {
  Allocation,
  AllocationListFilters,
  AllocationStatus,
  CreateAllocationInput,
  UpdateAllocationInput,
} from "./types";
export {
  ACTIVE_ALLOCATION_STATUSES,
  ALLOCATION_STATUS_LABELS,
} from "./types";

export {
  allocatePartner,
  archiveAllocation,
  getAllocationById,
  listActiveAllocationsForPartner,
  listAllocations,
  updateAllocation,
} from "./services";

export { AllocationsPageClient, AllocatePartnerDialog } from "./components";
