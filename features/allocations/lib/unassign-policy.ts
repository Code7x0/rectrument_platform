import type { Allocation } from "@/features/allocations/types";
import type { UserRole } from "@/types";

/**
 * Admin / Super Admin may unassign any partner.
 * Account Managers may only unassign allocations they personally created.
 */
export function canUnassignAllocation(input: {
  role: UserRole;
  viewerUserId: string;
  allocation: Pick<Allocation, "assignedById">;
}): boolean {
  if (input.role === "admin" || input.role === "super_admin") {
    return true;
  }
  if (input.role !== "account_manager") {
    return false;
  }
  const assignedBy = input.allocation.assignedById?.trim();
  return Boolean(assignedBy && assignedBy === input.viewerUserId);
}
