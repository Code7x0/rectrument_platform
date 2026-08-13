"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { revalidatePath } from "next/cache";

import { requirePermission, requireRole } from "@/lib/auth";
import {
  archiveJob,
  createJob,
  deleteJob,
  removeJobAttachment,
  updateJob,
} from "@/features/jobs/services";
import { parseSkillsInput } from "@/features/jobs/services/jobs.validation";
import { jobFormSchema } from "@/features/jobs/schemas/job.schema";
import type { JobFormValues } from "@/features/jobs/schemas/job.schema";
import { getUploadService, type UploadedFile } from "@/services/uploads";
import type { Job } from "@/features/jobs/types";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; message: string; errors?: string[] };

function formValuesToInput(values: JobFormValues, createdById?: string) {
  const accountManagerIds = Array.from(
    new Set(
      (values.accountManagerIds?.length
        ? values.accountManagerIds
        : values.accountManagerId
          ? [values.accountManagerId]
          : []
      )
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  );
  return {
    title: values.title,
    clientId: values.clientId,
    accountManagerId: accountManagerIds[0] ?? "",
    accountManagerIds,
    hiringManager: values.hiringManager || undefined,
    description: values.description || undefined,
    location: values.location || undefined,
    workMode: values.workMode || undefined,
    employmentType: values.employmentType,
    experience: values.experience || undefined,
    salary: values.salary || undefined,
    priority: values.priority,
    ...(values.openPositions != null
      ? { openPositions: values.openPositions }
      : {}),
    skills: parseSkillsInput(values.skills),
    status: values.status === "archived" ? "open" : values.status,
    notes: values.notes || undefined,
    createdById,
  };
}

async function parseJobAttachmentFromFormData(
  formData: FormData,
  fieldKey: string,
  fallbackFilename: string,
): Promise<UploadedFile | null> {
  const file = formData.get(fieldKey);
  if (!file || !(file instanceof File) || file.size === 0) {
    return null;
  }

  const {
    normalizeUploadContentType,
    validateDocumentUploadMeta,
  } = await import("@/lib/files/document-types");

  const metaError = validateDocumentUploadMeta({
    filename: file.name || fallbackFilename,
    contentType: file.type,
    size: file.size,
  });
  if (metaError) {
    throw new Error(metaError);
  }

  const contentType = normalizeUploadContentType(
    file.name || fallbackFilename,
    file.type,
  );
  const buffer = Buffer.from(await file.arrayBuffer());
  return getUploadService().upload({
    filename: file.name || fallbackFilename,
    contentType,
    data: buffer,
    size: file.size,
  });
}

function parseJobFormPayload(formData: FormData): JobFormValues {
  const raw = String(formData.get("payload") ?? "");
  let parsedJson: unknown = {};
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new Error("Invalid job form payload");
  }
  const parsed = jobFormSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw Object.assign(new Error("Validation failed"), {
      issues: parsed.error.issues.map((issue) => issue.message),
    });
  }
  return parsed.data;
}

export async function createJobAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("manage_jobs");
    await requireRole(["admin", "super_admin", "account_manager"]);

    let values: JobFormValues;
    try {
      values = parseJobFormPayload(formData);
    } catch (error) {
      if (
        error instanceof Error &&
        "issues" in error &&
        Array.isArray((error as { issues?: string[] }).issues)
      ) {
        return {
          success: false,
          message: "Validation failed",
          errors: (error as { issues: string[] }).issues,
        };
      }
      return {
        success: false,
        message: error instanceof Error ? error.message : "Invalid job form",
      };
    }

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
      values.accountManagerIds = [amId];
    }

    const jdUpload = await parseJobAttachmentFromFormData(
      formData,
      "jd",
      "job-description.pdf",
    );
    const sampleResumeUpload = await parseJobAttachmentFromFormData(
      formData,
      "sampleResume",
      "sample-resume.pdf",
    );
    const commentAttachmentUpload = await parseJobAttachmentFromFormData(
      formData,
      "commentAttachment",
      "client-update.png",
    );

    const job = await createJob(formValuesToInput(values, session.userId), {
      jdUpload,
      sampleResumeUpload,
      commentAttachmentUpload,
    });

    revalidatePath("/admin/jobs");
    revalidatePath("/account-manager/jobs");
    revalidatePath("/notifications");

    return { success: true, data: job };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to create job"),
    };
  }
}

export async function updateJobAction(
  jobId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("manage_jobs");
    await requireRole(["admin", "super_admin", "account_manager"]);

    let values: JobFormValues;
    try {
      values = parseJobFormPayload(formData);
    } catch (error) {
      if (
        error instanceof Error &&
        "issues" in error &&
        Array.isArray((error as { issues?: string[] }).issues)
      ) {
        return {
          success: false,
          message: "Validation failed",
          errors: (error as { issues: string[] }).issues,
        };
      }
      return {
        success: false,
        message: error instanceof Error ? error.message : "Invalid job form",
      };
    }

    if (session.role === "account_manager") {
      const {
        assertAccountManagerOwnsJob,
        assertAccountManagerOwnsClient,
        ScopeDeniedError,
      } = await import("@/lib/auth/scope");
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
      if (amId) {
        values.accountManagerIds = [amId];
      }
    }

    const jdUpload = await parseJobAttachmentFromFormData(
      formData,
      "jd",
      "job-description.pdf",
    );
    const sampleResumeUpload = await parseJobAttachmentFromFormData(
      formData,
      "sampleResume",
      "sample-resume.pdf",
    );
    const commentAttachmentUpload = await parseJobAttachmentFromFormData(
      formData,
      "commentAttachment",
      "client-update.png",
    );
    const job = await updateJob(jobId, formValuesToInput(values), {
      jdUpload,
      sampleResumeUpload,
      commentAttachmentUpload,
    });

    revalidatePath("/admin/jobs");
    revalidatePath("/account-manager/jobs");
    revalidatePath("/notifications");

    return { success: true, data: job };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to update job"),
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
      message: actionErrorMessage(error, "Unable to archive job"),
    };
  }
}

export async function removeJobAttachmentAction(input: {
  jobId: string;
  field: "Job Description" | "Sample Profiling";
  attachmentId?: string | null;
  url: string;
}): Promise<ActionResult<Job>> {
  try {
    const session = await requirePermission("manage_jobs");
    await requireRole(["admin", "super_admin", "account_manager"]);
    if (session.role === "account_manager") {
      const { assertAccountManagerOwnsJob, ScopeDeniedError } = await import(
        "@/lib/auth/scope"
      );
      try {
        await assertAccountManagerOwnsJob(session, input.jobId);
      } catch (error) {
        if (error instanceof ScopeDeniedError) {
          return { success: false, message: error.message };
        }
        throw error;
      }
    }

    const job = await removeJobAttachment(input);
    revalidatePath("/admin/jobs");
    revalidatePath("/account-manager/jobs");
    return { success: true, data: job };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to remove attachment"),
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
