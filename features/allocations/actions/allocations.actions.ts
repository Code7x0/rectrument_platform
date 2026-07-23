"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { revalidatePath } from "next/cache";

import { requirePermission, requireRole } from "@/lib/auth";
import {
  allocatePartner,
  archiveAllocation,
  updateAllocation,
} from "@/features/allocations/services";
import {
  allocatePartnerFormSchema,
  updateAllocationFormSchema,
  type AllocatePartnerFormValues,
  type UpdateAllocationFormValues,
} from "@/features/allocations/schemas/allocation.schema";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; message: string; errors?: string[] };

function revalidateAllocationPaths() {
  revalidatePath("/admin/allocations");
  revalidatePath("/account-manager/allocations");
  revalidatePath("/admin/jobs");
  revalidatePath("/account-manager/jobs");
}

/**
 * Create allocation from a Job.
 * Account Managers only — Admin never allocates talent partners.
 */
export async function allocatePartnerAction(
  raw: AllocatePartnerFormValues,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("manage_allocations");
    await requireRole(["admin", "super_admin", "account_manager"]);

    const parsed = allocatePartnerFormSchema.safeParse(raw);

    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => issue.message),
      };
    }

    const data = parsed.data;
    const allocation = await allocatePartner({
      jobId: data.jobId,
      partnerId: data.partnerId,
      expectedProfiles: data.expectedProfiles,
      assignedDate: data.assignedDate,
      notes: data.notes || undefined,
      status: data.status === "archived" ? "assigned" : data.status,
      assignedById: session.userId,
      accountManagerId: session.userId,
    });

    revalidateAllocationPaths();

    return { success: true, data: allocation };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to allocate talent partner"),
    };
  }
}

export async function updateAllocationAction(
  allocationId: string,
  raw: UpdateAllocationFormValues,
): Promise<ActionResult> {
  try {
    await requirePermission("manage_allocations");
    await requireRole(["admin", "super_admin", "account_manager"]);
    const parsed = updateAllocationFormSchema.safeParse(raw);

    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => issue.message),
      };
    }

    const data = parsed.data;
    if (data.status === "archived") {
      return {
        success: false,
        message: "Use archive to set Archived status",
      };
    }

    const allocation = await updateAllocation(allocationId, {
      expectedProfiles: data.expectedProfiles,
      notes: data.notes || "",
      status: data.status,
      assignedDate: data.assignedDate,
    });

    revalidateAllocationPaths();

    return { success: true, data: allocation };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to update allocation"),
    };
  }
}

export async function archiveAllocationAction(
  allocationId: string,
): Promise<ActionResult> {
  try {
    await requirePermission("archive_allocations");
    await requireRole(["admin", "super_admin", "account_manager"]);
    const allocation = await archiveAllocation(allocationId);

    revalidateAllocationPaths();

    return { success: true, data: allocation };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to archive allocation"),
    };
  }
}

export async function assertCanViewAllocations() {
  return requireRole(["admin", "super_admin", "account_manager"]);
}
