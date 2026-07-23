"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { revalidatePath } from "next/cache";

import { requirePermission, requireRole } from "@/lib/auth";
import {
  archiveJob,
  createJob,
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
    accountManagerId: values.accountManagerId,
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
    department: values.department || undefined,
    createdById,
  };
}

export async function createJobAction(
  raw: JobFormValues,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("manage_jobs");
    const parsed = jobFormSchema.safeParse(raw);

    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => issue.message),
      };
    }

    const job = await createJob(
      formValuesToInput(parsed.data, session.userId),
    );

    revalidatePath("/admin/jobs");
    revalidatePath("/account-manager/jobs");

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
    await requirePermission("manage_jobs");
    const parsed = jobFormSchema.safeParse(raw);

    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => issue.message),
      };
    }

    const job = await updateJob(jobId, formValuesToInput(parsed.data));

    revalidatePath("/admin/jobs");
    revalidatePath("/account-manager/jobs");

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
    await requirePermission("manage_jobs");
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

/** Ensures AM/Admin can load the jobs page. Partners are rejected. */
export async function assertCanViewJobs() {
  const session = await requireRole(["admin", "account_manager"]);
  return session;
}
