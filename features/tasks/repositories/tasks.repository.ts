import { listActiveAllocationsForPartner } from "@/features/allocations/services";
import type { Allocation } from "@/features/allocations/types";

/**
 * Tasks repository — reads active partner allocations only.
 * Delegates to Allocations service; does not touch Airtable.
 */
export async function findActiveAllocationsForPartner(
  partnerId: string,
): Promise<Allocation[]> {
  return listActiveAllocationsForPartner(partnerId);
}
