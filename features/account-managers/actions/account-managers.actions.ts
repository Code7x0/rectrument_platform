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
  revalidatePath("/account-manager/jobs");
  revalidatePath("/admin/jobs");
  revalidatePath("/super-admin");
  revalidatePath("/admin");
  revalidatePath("/notifications");
  if (clientId) {
    revalidatePath(`/admin/clients/${clientId}`);
    revalidatePath(`/account-manager/clients/${clientId}`);
  }
}

export async function assignAccountManagerToClientAction(input: {
  clientId: string;
  accountManagerId?: string | null;
  accountManagerIds?: string[];
  /** When true with accountManagerId, add to existing owners instead of replacing. */
  merge?: boolean;
}): Promise<ActionResult> {
  try {
    await requireRole(["admin", "super_admin"]);
    if (!input.clientId) {
      return { success: false, message: "Client is required" };
    }

    let accountManagerIds: string[];
    if (input.merge && input.accountManagerId?.trim()) {
      const { getClientById } = await import("@/features/clients/services");
      const existing = await getClientById(input.clientId);
      accountManagerIds = Array.from(
        new Set([
          ...(existing?.accountManagerIds ?? []),
          input.accountManagerId.trim(),
        ]),
      );
    } else if (input.accountManagerIds !== undefined) {
      accountManagerIds = input.accountManagerIds;
    } else if (input.accountManagerId) {
      accountManagerIds = [input.accountManagerId];
    } else {
      accountManagerIds = [];
    }

    await assignAccountManagerToClient({
      clientId: input.clientId,
      accountManagerIds,
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
 * Assign AM(s) to a single job only. Admin + Super Admin.
 * Does not change Clients.Account Owner (that would expose every job on the client).
 */
export async function assignAccountManagerToJobAction(input: {
  jobId: string;
  accountManagerId?: string | null;
  accountManagerIds?: string[];
}): Promise<ActionResult> {
  try {
    await requireRole(["admin", "super_admin"]);
    if (!input.jobId) {
      return { success: false, message: "Job is required" };
    }

    const { getJobById, updateJob } = await import(
      "@/features/jobs/services"
    );
    const job = await getJobById(input.jobId);
    if (!job) {
      return { success: false, message: "Job not found" };
    }
    if (job.status === "archived") {
      return {
        success: false,
        message: "Cannot change AM on an archived job",
      };
    }

    const accountManagerIds = Array.from(
      new Set(
        (input.accountManagerIds !== undefined
          ? input.accountManagerIds
          : input.accountManagerId
            ? [input.accountManagerId]
            : []
        )
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    );

    await updateJob(input.jobId, {
      accountManagerId: accountManagerIds[0] ?? "",
      accountManagerIds,
    });

    revalidateAmPaths(job.clientId ?? undefined);
    revalidatePath("/admin/jobs");
    revalidatePath("/account-manager/jobs");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to update Account Manager"),
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
