"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { candidateFormSchema } from "@/features/candidates/schemas/candidate.schema";
import { findDuplicateCandidates } from "@/features/candidates/services";
import {
  stageResumeFile,
  submitCandidateForAllocation,
} from "@/features/submissions/services";
import type { Candidate } from "@/features/candidates/types";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | {
      success: false;
      message: string;
      errors?: string[];
      duplicates?: Candidate[];
    };

function revalidateSubmissionPaths() {
  revalidatePath("/partner");
  revalidatePath("/partner/candidates");
  revalidatePath("/admin/candidates");
  revalidatePath("/account-manager/candidates");
  revalidatePath("/admin/allocations");
  revalidatePath("/account-manager/allocations");
}

async function parseResumeFromFormData(
  formData: FormData,
): Promise<Awaited<ReturnType<typeof stageResumeFile>> | null> {
  const file = formData.get("resume");
  if (!file || !(file instanceof File) || file.size === 0) {
    return null;
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Resume must be 8MB or smaller");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return stageResumeFile({
    filename: file.name || "resume.pdf",
    contentType: file.type || "application/octet-stream",
    data: buffer,
    size: file.size,
  });
}

export async function lookupCandidateDuplicatesAction(
  email: string,
  phone: string,
): Promise<ActionResult<Candidate[]>> {
  try {
    await requirePermission("submit_candidates");
    const duplicates = await findDuplicateCandidates({ email, phone });
    return { success: true, data: duplicates };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to search candidates"),
    };
  }
}

/**
 * Submit candidate against an active partner allocation.
 * Accepts FormData so resume upload stays out of the UI storage layer.
 */
export async function submitCandidateAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("submit_candidates");

    if (session.role !== "partner" || !session.partnerId) {
      return {
        success: false,
        message: "Only partners can submit candidates",
      };
    }

    const raw = {
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      currentCompany: String(formData.get("currentCompany") ?? ""),
      currentLocation: String(formData.get("currentLocation") ?? ""),
      experience: String(formData.get("experience") ?? ""),
      currentCtc: String(formData.get("currentCtc") ?? ""),
      expectedCtc: String(formData.get("expectedCtc") ?? ""),
      noticePeriod: String(formData.get("noticePeriod") ?? ""),
      skills: String(formData.get("skills") ?? ""),
      remarks: String(formData.get("remarks") ?? ""),
    };

    const parsed = candidateFormSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => issue.message),
      };
    }

    const jobId = String(formData.get("jobId") ?? "");
    const allocationId = String(formData.get("allocationId") ?? "");
    const existingCandidateId =
      String(formData.get("existingCandidateId") ?? "") || undefined;
    const reuseConfirmed = formData.get("reuseConfirmed") === "true";

    if (!jobId || !allocationId) {
      return { success: false, message: "Job and allocation are required" };
    }

    const resumeUpload = await parseResumeFromFormData(formData);

    const result = await submitCandidateForAllocation({
      jobId,
      allocationId,
      partnerId: session.partnerId,
      form: parsed.data,
      existingCandidateId:
        existingCandidateId && reuseConfirmed
          ? existingCandidateId
          : undefined,
      resumeUpload,
      resumeRequired: !existingCandidateId,
    });

    if (!result.ok) {
      return {
        success: false,
        message:
          "A matching candidate already exists. You can reuse their profile.",
        duplicates: result.duplicates,
      };
    }

    revalidateSubmissionPaths();

    return {
      success: true,
      data: {
        submissionId: result.submission.id,
        candidateId: result.candidate.id,
        reusedCandidate: result.reusedCandidate,
      },
    };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to submit candidate"),
    };
  }
}
