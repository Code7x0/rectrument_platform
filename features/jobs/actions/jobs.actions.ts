"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { revalidatePath } from "next/cache";

import { requirePermission, requireRole } from "@/lib/auth";
import {
  archiveJob,
  createJob,
  deleteJob,
  updateJob,
} from "@/features/jobs/services";
import { parseSkillsInput } from "@/features/jobs/services/jobs.validation";
import { jobFormSchema } from "@/features/jobs/schemas/job.schema";
import type { JobFormValues } from "@/features/jobs/schemas/job.schema";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; message: string; errors?: string[] };

function formValuesToInput(values: JobFormValues, createdById?: string) {
  return {
    title: values.title,
    clientId: values.clientId,
    accountManagerId: values.accountManagerId ?? "",
    hiringManager: values.hiringManager || undefined,
    description: values.description || undefined,
    location: values.location || undefined,
    employmentType: values.employmentType,
    experience: values.experience || undefined,
    salary: values.salary || undefined,
    priority: values.priority,
    openPositions: values.openPositions,
    skills: parseSkillsInput(values.skills),
    status: values.status === "archived" ? "open" : values.status,
    notes: values.notes || undefined,
    createdById,
  };
}

export async function createJobAction(
  raw: JobFormValues,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("manage_jobs");
    await requireRole(["admin", "super_admin", "account_manager"]);
    const parsed = jobFormSchema.safeParse(raw);

    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => issue.message),
      };
    }

    const values = parsed.data;
    if (session.role === "account_manager") {
      const { assertAccountManagerOwnsClient, ScopeDeniedError } = await import(
        "@/lib/auth/scope"
      );
      const { resolveAccountManagerScopeId } = await import("@/lib/auth");
      const amId = resolveAccountManagerScopeId(session);
      if (!amId) {
        return { success: false, message: "Account Manager profile is missing" };
      }
      try {
        await assertAccountManagerOwnsClient(session, values.clientId);
      } catch (error) {
        if (error instanceof ScopeDeniedError) {
          return { success: false, message: error.message };
        }
        throw error;
      }
      values.accountManagerId = amId;
    }

    const job = await createJob(
      formValuesToInput(values, session.userId),
    );

    revalidatePath("/admin/jobs");
    revalidatePath("/account-manager/jobs");
    revalidatePath("/notifications");

    return { success: true, data: job };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to create job"),
    };
  }
}

export async function updateJobAction(
  jobId: string,
  raw: JobFormValues,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("manage_jobs");
    await requireRole(["admin", "super_admin", "account_manager"]);
    const parsed = jobFormSchema.safeParse(raw);

    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => issue.message),
      };
    }

    const values = parsed.data;
    if (session.role === "account_manager") {
      const { assertAccountManagerOwnsJob, assertAccountManagerOwnsClient, ScopeDeniedError } =
        await import("@/lib/auth/scope");
      const { resolveAccountManagerScopeId } = await import("@/lib/auth");
      const amId = resolveAccountManagerScopeId(session);
      try {
        await assertAccountManagerOwnsJob(session, jobId);
        await assertAccountManagerOwnsClient(session, values.clientId);
      } catch (error) {
        if (error instanceof ScopeDeniedError) {
          return { success: false, message: error.message };
        }
        throw error;
      }
      values.accountManagerId = amId ?? values.accountManagerId;
    }

    const job = await updateJob(jobId, formValuesToInput(values));

    revalidatePath("/admin/jobs");
    revalidatePath("/account-manager/jobs");
    revalidatePath("/notifications");

    return { success: true, data: job };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to update job"),
    };
  }
}

export async function archiveJobAction(jobId: string): Promise<ActionResult> {
  try {
    const session = await requirePermission("manage_jobs");
    await requireRole(["admin", "super_admin", "account_manager"]);
    if (session.role === "account_manager") {
      const { assertAccountManagerOwnsJob, ScopeDeniedError } = await import(
        "@/lib/auth/scope"
      );
      try {
        await assertAccountManagerOwnsJob(session, jobId);
      } catch (error) {
        if (error instanceof ScopeDeniedError) {
          return { success: false, message: error.message };
        }
        throw error;
      }
    }
    const job = await archiveJob(jobId);

    revalidatePath("/admin/jobs");
    revalidatePath("/account-manager/jobs");

    return { success: true, data: job };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to archive job"),
    };
  }
}

/**
 * Hard-delete a job from Airtable. Admin / Super Admin only.
 */
export async function deleteJobAction(jobId: string): Promise<ActionResult> {
  try {
    await requirePermission("manage_jobs");
    await requireRole(["admin", "super_admin"]);
    await deleteJob(jobId);

    revalidatePath("/admin/jobs");
    revalidatePath("/account-manager/jobs");
    revalidatePath("/admin/allocations");

    return { success: true, data: { id: jobId } };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to delete job"),
    };
  }
}

/** Ensures Admin/SA/AM can load the jobs page. Partners are rejected. */
export async function assertCanViewJobs() {
  const session = await requireRole([
    "super_admin",
    "admin",
    "account_manager",
  ]);
  return session;
}
