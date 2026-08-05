"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { revalidatePath } from "next/cache";

import { requirePermission, requireRole } from "@/lib/auth";
import {
  assertAccountManagerOwnsSubmission,
  ScopeDeniedError,
} from "@/lib/auth/scope";
import { candidateFormSchema } from "@/features/candidates/schemas/candidate.schema";
import { parseCandidateFormData } from "@/features/candidates/lib/candidate-form-data";
import {
  deleteSubmission,
  getSubmissionById,
  stageResumeFile,
  submitCandidateForAllocation,
  updatePartnerSubmissionProfile,
} from "@/features/submissions/services";
import { parseScreeningMatrixNotes } from "@/features/submissions/lib/build-screening-matrix-notes";
import { isUnreviewedByStaff } from "@/features/submissions/lib/partner-edit-eligibility";
import type { Candidate } from "@/features/candidates/types";
import type { Submission } from "@/features/submissions/types";
import type { CandidateFormValues } from "@/features/candidates/schemas/candidate.schema";

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
  revalidatePath("/partner/jobs");
  revalidatePath("/partner/payments");
  revalidatePath("/admin/candidates");
  revalidatePath("/admin");
  revalidatePath("/admin/payouts");
  revalidatePath("/super-admin");
  revalidatePath("/account-manager/candidates");
  revalidatePath("/account-manager");
  revalidatePath("/account-manager/payouts");
}

async function parseResumeFromFormData(
  formData: FormData,
): Promise<Awaited<ReturnType<typeof stageResumeFile>> | null> {
  const file = formData.get("resume");
  if (!file || !(file instanceof File) || file.size === 0) {
    return null;
  }

  const { normalizeUploadContentType, validateResumeFileMeta } = await import(
    "@/lib/files/document-types"
  );

  const metaError = validateResumeFileMeta({
    filename: file.name || "resume.pdf",
    contentType: file.type,
    size: file.size,
  });
  if (metaError) {
    throw new Error(metaError);
  }

  const contentType = normalizeUploadContentType(file.name || "resume.pdf", file.type);
  const buffer = Buffer.from(await file.arrayBuffer());
  return stageResumeFile({
    filename: file.name || "resume.pdf",
    contentType,
    data: buffer,
    size: file.size,
  });
}

export async function lookupCandidateDuplicatesAction(
  email: string,
  phone: string,
): Promise<ActionResult<Candidate[]>> {
  try {
    const session = await requirePermission("submit_candidates");
    if (session.role !== "partner" || !session.partnerId) {
      return { success: false, message: "Only partners can search candidates" };
    }

    const { findDuplicateCandidates } = await import(
      "@/features/candidates/services"
    );
    const { listSubmissions } = await import(
      "@/features/submissions/services"
    );

    const [duplicates, prior] = await Promise.all([
      findDuplicateCandidates({ email, phone }),
      listSubmissions({ partnerId: session.partnerId }),
    ]);
    const ownedIds = new Set(prior.map((row) => row.candidateId));
    const owned = duplicates.filter((row) => ownedIds.has(row.id));

    return { success: true, data: owned };
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

    const raw = parseCandidateFormData(formData);

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
    console.error("[submitCandidateAction] failed", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : undefined,
      cause:
        error && typeof error === "object" && "cause" in error
          ? error.cause
          : undefined,
    });
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to submit candidate"),
    };
  }
}

export async function getOwnSubmissionForEditAction(
  submissionId: string,
): Promise<
  ActionResult<{
    submission: Submission;
    form: CandidateFormValues;
    resumeUrl: string | null;
    resumeFilename: string | null;
  }>
> {
  try {
    const session = await requirePermission("submit_candidates");
    if (session.role !== "partner" || !session.partnerId) {
      return { success: false, message: "Only partners can edit candidates" };
    }

    const submission = await getSubmissionById(submissionId);
    if (!submission || submission.partnerId !== session.partnerId) {
      return { success: false, message: "Candidate not found" };
    }
    if (!isUnreviewedByStaff(submission)) {
      return {
        success: false,
        message: "This profile is locked after internal review",
      };
    }

    const { getCandidateById } = await import("@/features/candidates/services");
    const candidate = await getCandidateById(submission.candidateId);
    const parsedNotes = parseScreeningMatrixNotes(
      submission.remarks ?? candidate?.remarks ?? "",
    );

    return {
      success: true,
      data: {
        submission,
        resumeUrl: candidate?.resumeUrl ?? submission.resumeUrl ?? null,
        resumeFilename:
          candidate?.resumeFilename ?? submission.resumeFilename ?? null,
        form: {
          fullName: candidate?.fullName ?? submission.candidateName ?? "",
          email: candidate?.email ?? "",
          phone: candidate?.phone ?? "",
          currentLocation: candidate?.currentLocation ?? "",
          currentCtc: candidate?.currentCtc ?? "",
          expectedCtc: candidate?.expectedCtc ?? "",
          noticePeriod: candidate?.noticePeriod ?? "",
          linkedIn: candidate?.linkedIn ?? submission.linkedIn ?? "",
          currentCompany: candidate?.currentCompany ?? "",
          experience: parsedNotes.experience || candidate?.experience || "",
          skillScreens: parsedNotes.skillScreens,
          remarks: parsedNotes.remarks,
          skills: candidate?.skills.join(", ") ?? "",
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to load candidate for edit"),
    };
  }
}

export async function updateOwnCandidateAction(
  formData: FormData,
): Promise<ActionResult<Submission>> {
  try {
    const session = await requirePermission("submit_candidates");
    if (session.role !== "partner" || !session.partnerId) {
      return { success: false, message: "Only partners can edit candidates" };
    }

    const submissionId = String(formData.get("submissionId") ?? "");
    if (!submissionId) {
      return { success: false, message: "Submission is required" };
    }

    const parsed = candidateFormSchema.safeParse(parseCandidateFormData(formData));
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => issue.message),
      };
    }

    const resumeUpload = await parseResumeFromFormData(formData);
    const updated = await updatePartnerSubmissionProfile({
      submissionId,
      partnerId: session.partnerId,
      form: parsed.data,
      resumeUpload,
    });

    revalidateSubmissionPaths();
    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to update candidate"),
    };
  }
}

/**
 * Permanently delete a candidate submission.
 * Admin / Super Admin: any. Account Manager: owned jobs only.
 */
export async function deleteSubmissionAction(
  submissionId: string,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("delete_candidates");
    await requireRole(["account_manager", "admin", "super_admin"]);
    await assertAccountManagerOwnsSubmission(session, submissionId);

    await deleteSubmission(submissionId);
    revalidateSubmissionPaths();

    return { success: true, data: { id: submissionId } };
  } catch (error) {
    if (error instanceof ScopeDeniedError) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to delete candidate"),
    };
  }
}
