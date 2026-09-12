"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { revalidatePath } from "next/cache";

import {
  requirePermission,
  requireRole,
  resolveAccountManagerScopeId,
} from "@/lib/auth";
import {
  assertAccountManagerOwnsSubmission,
  ScopeDeniedError,
} from "@/lib/auth/scope";
import { candidateFormSchema } from "@/features/candidates/schemas/candidate.schema";
import { parseCandidateFormData } from "@/features/candidates/lib/candidate-form-data";
import {
  deleteOwnUnreviewedSubmission,
  deleteSubmission,
  getSubmissionById,
  stageResumeFile,
  submitCandidateForAllocation,
  submitCandidateForStaff,
  updatePartnerSubmissionProfile,
} from "@/features/submissions/services";
import { parseScreeningMatrixNotes } from "@/features/submissions/lib/build-screening-matrix-notes";
import { canPartnerEditSubmission } from "@/features/submissions/lib/partner-edit-eligibility";
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
      blocked?: boolean;
      existingStatus?: string | null;
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

function parseJobSelections(
  formData: FormData,
): Array<{ jobId: string; allocationId: string }> {
  const raw = String(formData.get("jobSelections") ?? "").trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      const unique = new Map<string, { jobId: string; allocationId: string }>();
      for (const row of parsed) {
        if (!row || typeof row !== "object") {
          continue;
        }
        const jobId = String(
          (row as { jobId?: unknown }).jobId ?? "",
        ).trim();
        const allocationId = String(
          (row as { allocationId?: unknown }).allocationId ?? "",
        ).trim();
        if (jobId && allocationId) {
          unique.set(jobId, { jobId, allocationId });
        }
      }
      return [...unique.values()];
    } catch {
      return [];
    }
  }

  const jobId = String(formData.get("jobId") ?? "").trim();
  const allocationId = String(formData.get("allocationId") ?? "").trim();
  if (jobId && allocationId) {
    return [{ jobId, allocationId }];
  }
  return [];
}

/**
 * Submit candidate against one or more active partner allocations.
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

    const selections = parseJobSelections(formData);
    if (selections.length === 0) {
      return {
        success: false,
        message: "Select at least one job",
      };
    }

    const existingCandidateId =
      String(formData.get("existingCandidateId") ?? "") || undefined;
    const reuseConfirmed = formData.get("reuseConfirmed") === "true";

    const resumeUpload = await parseResumeFromFormData(formData);

    const createdIds: string[] = [];
    let reusedCandidate = false;
    let primaryCandidateId: string | null = null;

    for (let index = 0; index < selections.length; index += 1) {
      const selection = selections[index]!;
      const isFirst = index === 0;
      const result = await submitCandidateForAllocation({
        jobId: selection.jobId,
        allocationId: selection.allocationId,
        partnerId: session.partnerId,
        form: parsed.data,
        existingCandidateId:
          isFirst && existingCandidateId && reuseConfirmed
            ? existingCandidateId
            : undefined,
        resumeUpload: isFirst ? resumeUpload : undefined,
        resumeRequired: isFirst && !existingCandidateId,
        allowSamePersonOtherJob: !isFirst,
      });

      if (!result.ok) {
        if (result.reason === "duplicate_blocked") {
          return {
            success: false,
            message: result.message,
            duplicates: result.duplicates,
            blocked: true,
            existingStatus: result.existingStatus,
          };
        }
        return {
          success: false,
          message:
            "A matching candidate already exists. You can reuse their profile.",
          duplicates: result.duplicates,
        };
      }

      createdIds.push(result.submission.id);
      primaryCandidateId = result.candidate.id;
      if (result.reusedCandidate) {
        reusedCandidate = true;
      }
    }

    revalidateSubmissionPaths();

    return {
      success: true,
      data: {
        submissionId: createdIds[0],
        submissionIds: createdIds,
        candidateId: primaryCandidateId,
        jobCount: createdIds.length,
        reusedCandidate,
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
    if (!canPartnerEditSubmission(submission)) {
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
          email: candidate?.email ?? submission.email ?? "",
          phone: candidate?.phone ?? submission.phone ?? "",
          currentLocation: candidate?.currentLocation ?? "",
          currentCtc: candidate?.currentCtc ?? "",
          expectedCtc: candidate?.expectedCtc ?? "",
          noticePeriod: candidate?.noticePeriod ?? "",
          linkedIn: candidate?.linkedIn ?? submission.linkedIn ?? "",
          currentCompany: candidate?.currentCompany ?? "",
          offerInHandCtc: parsedNotes.offerInHand.ctc,
          offerInHandLocation: parsedNotes.offerInHand.location,
          offerInHandDoj: parsedNotes.offerInHand.doj,
          offerInHandCompany: parsedNotes.offerInHand.company,
          offerInHandReason: parsedNotes.offerInHand.reason,
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

    const hasJobSelectionsField =
      formData.has("jobSelections") || formData.has("jobId");
    const jobSelections = parseJobSelections(formData);
    if (hasJobSelectionsField && jobSelections.length === 0) {
      return { success: false, message: "Select at least one job" };
    }

    const resumeUpload = await parseResumeFromFormData(formData);
    const removeResume =
      !resumeUpload && formData.get("removeResume") === "true";
    const updated = await updatePartnerSubmissionProfile({
      submissionId,
      partnerId: session.partnerId,
      form: parsed.data,
      resumeUpload,
      removeResume,
      jobSelections: hasJobSelectionsField ? jobSelections : undefined,
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

/** Partner: remove a mistaken upload while still unreviewed by AM. */
export async function deleteOwnUnreviewedSubmissionAction(
  submissionId: string,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("submit_candidates");
    if (session.role !== "partner" || !session.partnerId) {
      return {
        success: false,
        message: "Only partners can remove their candidates",
      };
    }

    await deleteOwnUnreviewedSubmission({
      submissionId,
      partnerId: session.partnerId,
    });
    revalidateSubmissionPaths();
    return { success: true, data: { id: submissionId } };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to remove candidate"),
    };
  }
}

/** Slim job list for partner submit/edit multi-select. */
export async function listPartnerSubmitJobsAction(): Promise<
  ActionResult<
    Array<{
      id: string;
      allocationId: string;
      jobId: string;
      jobTitle: string;
      jobCode: string | null;
      clientName: string | null;
      location: string | null;
      remainingProfiles: number;
      submittedProfiles: number;
    }>
  >
> {
  try {
    const session = await requirePermission("submit_candidates");
    if (session.role !== "partner" || !session.partnerId) {
      return { success: false, message: "Only partners can list jobs" };
    }

    const { listPartnerWorkTasks } = await import(
      "@/features/tasks/services"
    );
    const tasks = await listPartnerWorkTasks(session.partnerId);
    return {
      success: true,
      data: tasks.map((task) => ({
        id: task.id,
        allocationId: task.allocationId,
        jobId: task.jobId,
        jobTitle: task.jobTitle,
        jobCode: task.jobCode,
        clientName: task.clientName,
        location: task.location,
        remainingProfiles: task.remainingProfiles,
        submittedProfiles: task.submittedProfiles,
      })),
    };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to load jobs"),
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

export type StaffSubmitJobOption = {
  jobId: string;
  jobTitle: string;
  jobCode: string | null;
  allocations: Array<{
    allocationId: string;
    partnerId: string;
    partnerLabel: string;
  }>;
};

export async function listStaffSubmitJobsAction(): Promise<
  ActionResult<StaffSubmitJobOption[]>
> {
  try {
    const session = await requirePermission("review_candidates");
    await requireRole(["account_manager", "admin", "super_admin"]);

    const { listAllocations } = await import(
      "@/features/allocations/services"
    );
    const { listJobs } = await import("@/features/jobs/services");
    const { ACTIVE_ALLOCATION_STATUSES } = await import(
      "@/features/shared/entities"
    );

    const amId =
      session.role === "account_manager"
        ? resolveAccountManagerScopeId(session)
        : null;
    if (session.role === "account_manager" && !amId) {
      return { success: false, message: "Account Manager scope missing" };
    }

    const [allocations, jobs] = await Promise.all([
      listAllocations({
        includePartnerIdentity: session.role !== "account_manager",
      }),
      amId
        ? listJobs({
            accountManagerId: amId,
            includeArchived: false,
          })
        : listJobs({ includeArchived: false }),
    ]);

    const jobById = new Map(jobs.map((job) => [job.id, job]));
    const grouped = new Map<string, StaffSubmitJobOption>();

    if (session.role === "admin" || session.role === "super_admin") {
      for (const job of jobs) {
        grouped.set(job.id, {
          jobId: job.id,
          jobTitle: job.title,
          jobCode: job.jobCode,
          allocations: [],
        });
      }
    }

    for (const row of allocations) {
      if (!ACTIVE_ALLOCATION_STATUSES.includes(row.status)) {
        continue;
      }
      const job = jobById.get(row.jobId);
      if (!job) {
        continue;
      }
      const existing = grouped.get(row.jobId) ?? {
        jobId: job.id,
        jobTitle: job.title,
        jobCode: job.jobCode,
        allocations: [],
      };
      existing.allocations.push({
        allocationId: row.id,
        partnerId: row.partnerId,
        partnerLabel:
          row.partnerCode?.trim() ||
          row.partnerName?.trim() ||
          "Talent Partner",
      });
      grouped.set(row.jobId, existing);
    }

    return {
      success: true,
      data: [...grouped.values()].sort((a, b) =>
        a.jobTitle.localeCompare(b.jobTitle),
      ),
    };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to load jobs"),
    };
  }
}

export async function staffSubmitCandidateAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("review_candidates");
    await requireRole(["account_manager", "admin", "super_admin"]);

    const parsed = candidateFormSchema.safeParse(
      parseCandidateFormData(formData),
    );
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => issue.message),
      };
    }

    const jobId = String(formData.get("jobId") ?? "").trim();
    const allocationId = String(formData.get("allocationId") ?? "").trim();
    if (!jobId) {
      return { success: false, message: "Select a job" };
    }

    const { isInternalSourceSelection } = await import(
      "@/features/submissions/lib/internal-sourcing"
    );
    const internalSource = isInternalSourceSelection(allocationId);

    if (
      internalSource &&
      session.role !== "admin" &&
      session.role !== "super_admin"
    ) {
      return {
        success: false,
        message: "Select an allocated Talent Partner for this job",
      };
    }

    const resumeUpload = await parseResumeFromFormData(formData);
    if (!resumeUpload) {
      return { success: false, message: "Resume is required" };
    }

    if (internalSource) {
      const result = await submitCandidateForStaff({
        jobId,
        form: parsed.data,
        resumeUpload,
      });
      if (!result.ok) {
        if (result.reason === "duplicate_blocked") {
          return {
            success: false,
            message: result.message,
            duplicates: result.duplicates,
            blocked: true,
            existingStatus: result.existingStatus,
          };
        }
        return {
          success: false,
          message:
            "A matching candidate already exists. Review the existing profile instead of creating a duplicate.",
          duplicates: result.duplicates,
        };
      }
      revalidateSubmissionPaths();
      return {
        success: true,
        data: {
          submissionId: result.submission.id,
          candidateId: result.candidate.id,
        },
      };
    }

    if (!allocationId) {
      return {
        success: false,
        message: "Select an allocated Talent Partner",
      };
    }

    const { getAllocationById } = await import(
      "@/features/allocations/services"
    );
    const allocation = await getAllocationById(allocationId);
    if (!allocation || allocation.jobId !== jobId) {
      return { success: false, message: "Allocation not found for this job" };
    }

    if (session.role === "account_manager") {
      const { assertAccountManagerOwnsJob } = await import("@/lib/auth/scope");
      await assertAccountManagerOwnsJob(session, jobId);
    }

    const result = await submitCandidateForAllocation({
      jobId,
      allocationId,
      partnerId: allocation.partnerId,
      form: parsed.data,
      resumeUpload,
      resumeRequired: true,
    });

    if (!result.ok) {
      if (result.reason === "duplicate_blocked") {
        return {
          success: false,
          message: result.message,
          duplicates: result.duplicates,
          blocked: true,
          existingStatus: result.existingStatus,
        };
      }
      return {
        success: false,
        message:
          "A matching candidate already exists. Review the existing profile instead of creating a duplicate.",
        duplicates: result.duplicates,
      };
    }

    revalidateSubmissionPaths();
    return {
      success: true,
      data: {
        submissionId: result.submission.id,
        candidateId: result.candidate.id,
      },
    };
  } catch (error) {
    if (error instanceof ScopeDeniedError) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to add candidate"),
    };
  }
}
