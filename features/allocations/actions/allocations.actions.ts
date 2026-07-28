"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { revalidatePath } from "next/cache";

import {
  requirePermission,
  requireRole,
  resolveAccountManagerScopeId,
} from "@/lib/auth";
import {
  assertAccountManagerOwnsAllocation,
  assertAccountManagerOwnsJob,
  ScopeDeniedError,
} from "@/lib/auth/scope";
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
  revalidatePath("/account-manager");
  revalidatePath("/admin");
  revalidatePath("/partner/jobs");
  revalidatePath("/partner");
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
    await requireRole(["super_admin", "account_manager"]);

    const parsed = allocatePartnerFormSchema.safeParse(raw);

    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => issue.message),
      };
    }

    const data = parsed.data;
    if (session.role === "account_manager") {
      await assertAccountManagerOwnsJob(session, data.jobId);
    }

    // Super Admin must not stamp their user id as the job's AM — keep the
    // job/client Account Owner. Only AMs set accountManagerId from session.
    const allocation = await allocatePartner({
      jobId: data.jobId,
      partnerId: data.partnerId,
      expectedProfiles: data.expectedProfiles,
      assignedDate: data.assignedDate,
      notes: data.notes || undefined,
      status: data.status === "archived" ? "assigned" : data.status,
      assignedById: session.userId,
      ...(session.role === "account_manager"
        ? {
            accountManagerId:
              resolveAccountManagerScopeId(session) ?? session.userId,
          }
        : {}),
    });

    revalidateAllocationPaths();

    return { success: true, data: allocation };
  } catch (error) {
    if (error instanceof ScopeDeniedError) {
      return { success: false, message: error.message };
    }
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
    const session = await requirePermission("manage_allocations");
    await requireRole(["super_admin", "account_manager"]);
    if (session.role === "account_manager") {
      await assertAccountManagerOwnsAllocation(session, allocationId);
    }

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
    if (error instanceof ScopeDeniedError) {
      return { success: false, message: error.message };
    }
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
    const session = await requirePermission("archive_allocations");
    await requireRole(["admin", "super_admin", "account_manager"]);
    if (session.role === "account_manager") {
      await assertAccountManagerOwnsAllocation(session, allocationId);
    }
    const allocation = await archiveAllocation(allocationId);

    revalidateAllocationPaths();
    if (allocation.partnerId) {
      revalidatePath(`/admin/partners/${allocation.partnerId}`);
    }

    return { success: true, data: allocation };
  } catch (error) {
    if (error instanceof ScopeDeniedError) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: actionErrorMessage(
        error,
        "Unable to unassign talent partner",
      ),
    };
  }
}

/**
 * Active partner allocations for a single job (Admin / SA / AM).
 */
export async function listJobPartnerAllocationsAction(
  jobId: string,
): Promise<ActionResult> {
  try {
    const session = await requireRole([
      "admin",
      "super_admin",
      "account_manager",
    ]);
    if (!jobId) {
      return { success: false, message: "Job is required" };
    }
    if (session.role === "account_manager") {
      await assertAccountManagerOwnsJob(session, jobId);
    }

    const { listAllocations } = await import(
      "@/features/allocations/services"
    );
    const rows = await listAllocations({
      jobId,
      includeArchived: false,
      includePartnerIdentity:
        session.role === "admin" || session.role === "super_admin",
    });
    return { success: true, data: rows };
  } catch (error) {
    if (error instanceof ScopeDeniedError) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to load assigned partners"),
    };
  }
}

export async function assertCanViewAllocations() {
  return requireRole(["admin", "super_admin", "account_manager"]);
}
