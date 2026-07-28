"use server";

import { revalidatePath } from "next/cache";

import { actionErrorMessage } from "@/lib/actions/errors";
import { requireRole } from "@/lib/auth";
import {
  assignAccountManagerToClient,
  setAccountManagerStatus,
  type AccountManagerDirectoryStatus,
} from "@/features/account-managers/services/account-managers.service";

export type ActionResult =
  | { success: true }
  | { success: false; message: string };

function revalidateAmPaths(clientId?: string) {
  revalidatePath("/admin/account-managers");
  revalidatePath("/admin/clients");
  revalidatePath("/account-manager/clients");
  revalidatePath("/admin/jobs");
  revalidatePath("/super-admin");
  revalidatePath("/admin");
  if (clientId) {
    revalidatePath(`/admin/clients/${clientId}`);
  }
}

export async function assignAccountManagerToClientAction(input: {
  clientId: string;
  accountManagerId: string | null;
}): Promise<ActionResult> {
  try {
    await requireRole(["admin", "super_admin"]);
    if (!input.clientId) {
      return { success: false, message: "Client is required" };
    }
    await assignAccountManagerToClient({
      clientId: input.clientId,
      accountManagerId: input.accountManagerId,
    });
    revalidateAmPaths(input.clientId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to assign Account Manager"),
    };
  }
}

/**
 * Assign AM to a job (and its client Account Owner). Admin + Super Admin only.
 */
export async function assignAccountManagerToJobAction(input: {
  jobId: string;
  accountManagerId: string;
}): Promise<ActionResult> {
  try {
    await requireRole(["admin", "super_admin"]);
    if (!input.jobId) {
      return { success: false, message: "Job is required" };
    }
    if (!input.accountManagerId) {
      return { success: false, message: "Account Manager is required" };
    }

    const { getJobById, updateJob } = await import(
      "@/features/jobs/services"
    );
    const job = await getJobById(input.jobId);
    if (!job) {
      return { success: false, message: "Job not found" };
    }
    if (job.status === "archived") {
      return { success: false, message: "Cannot assign AM to an archived job" };
    }

    await updateJob(input.jobId, {
      accountManagerId: input.accountManagerId,
    });

    revalidateAmPaths(job.clientId ?? undefined);
    revalidatePath("/admin/jobs");
    revalidatePath("/account-manager/jobs");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to assign Account Manager"),
    };
  }
}

export async function setAccountManagerStatusAction(input: {
  accountManagerId: string;
  status: AccountManagerDirectoryStatus;
}): Promise<ActionResult> {
  try {
    await requireRole(["admin", "super_admin"]);
    await setAccountManagerStatus(input);
    revalidateAmPaths();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to update status"),
    };
  }
}
