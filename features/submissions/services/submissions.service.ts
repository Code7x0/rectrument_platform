import { cache } from "react";

import {
  getAllocationById,
  updateAllocation,
} from "@/features/allocations/services";
import {
  attachResumeToCandidate,
  createCandidate,
  findDuplicateCandidates,
  getCandidateById,
  parseSkillsInput,
} from "@/features/candidates/services";
import { findCandidates } from "@/features/candidates/repositories/candidates.repository";
import type { Candidate } from "@/features/candidates/types";
import type { CandidateFormValues } from "@/features/candidates/schemas/candidate.schema";
import { getJobById, listJobs } from "@/features/jobs/services";
import {
  findSubmissionById,
  findSubmissionsSafe,
  insertSubmission,
  patchSubmission,
  destroySubmission,
} from "@/features/submissions/repositories/submissions.repository";
import {
  buildSubmissionsFilterFormula,
  toAirtableCandidateSubmissionCreateFields,
  toAirtableCreateFields,
} from "@/features/submissions/services/submissions.mapper";
import type {
  Submission,
  SubmissionListFilters,
  SubmissionStatus,
} from "@/features/submissions/types";
import {
  ACTIVE_ALLOCATION_STATUSES,
  REVIEWABLE_SUBMISSION_STATUSES,
} from "@/features/shared/entities";
import { getUploadService, type UploadedFile } from "@/services/uploads";
import {
  getAllocationsMode,
  getSubmissionsMode,
} from "@/lib/airtable/compat";
import {
  AIRTABLE_INTERVIEW_STAGES,
  AIRTABLE_SECOND_LEVEL_REVIEW_YES,
  DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE,
  SUBMISSIONS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import type { AirtableFields } from "@/lib/airtable/client";
import { listPartnerOptions } from "@/services/lookups";

/** Request-scoped: one full Candidates/Submissions scan per RSC request. */
const loadAllSubmissionsCached = cache(async () =>
  findSubmissionsSafe({
    sort: [
      { field: SUBMISSIONS_TABLE_FIELDS.submissionDate, direction: "desc" },
    ],
  }),
);

/** Request-scoped: one Candidates table scan (submissions-mode enrichment). */
const loadAllCandidatesCached = cache(async () => findCandidates({}));

async function withEnrichment(
  submissions: Submission[],
  includePartnerIdentity = false,
): Promise<Submission[]> {
  if (submissions.length === 0) {
    return submissions;
  }

  const candidatesMode = getSubmissionsMode() === "candidates";

  // One request-scoped jobs/candidates scan instead of N× Airtable finds.
  const [candidates, jobs, partners] = await Promise.all([
    candidatesMode
      ? Promise.resolve([] as Candidate[])
      : loadAllCandidatesCached(),
    listJobs({ includeArchived: true }),
    listPartnerOptions(includePartnerIdentity ? "identity" : "operational"),
  ]);

  const candidateMap = new Map(candidates.map((c) => [c.id, c]));
  const jobMap = new Map(jobs.map((j) => [j.id, j]));
  const partnerMap = new Map(
    partners.map((p) => [p.id, { label: p.label, code: p.code ?? null }]),
  );

  return submissions.map((row) => {
    const candidate = candidateMap.get(row.candidateId);
    const job = jobMap.get(row.jobId);
    const partner = partnerMap.get(row.partnerId);
    return {
      ...row,
      candidateName: candidate?.fullName ?? row.candidateName ?? null,
      resumeUrl: candidate?.resumeUrl ?? row.resumeUrl ?? null,
      linkedIn: candidate?.linkedIn ?? row.linkedIn ?? null,
      jobTitle: job?.title ?? null,
      jobCode: job?.jobCode || null,
      jobPriority: job?.priority ?? null,
      partnerName: partner?.label ?? null,
      partnerCode: partner?.code ?? null,
    };
  });
}

export interface SubmitCandidatePayload {
  jobId: string;
  allocationId: string;
  partnerId: string;
  form: CandidateFormValues;
  /** Reuse existing person — skip create */
  existingCandidateId?: string;
  /** Staged resume (required for new candidates) */
  resumeUpload?: UploadedFile | null;
  resumeRequired?: boolean;
}

export type SubmitCandidateResult =
  | {
      ok: true;
      submission: Submission;
      candidate: Candidate;
      reusedCandidate: boolean;
    }
  | {
      ok: false;
      reason: "duplicate";
      duplicates: Candidate[];
    };

/**
 * Canonical submissions list — shared by Candidates pages, dashboards, and counts.
 *
 * In candidates mode, partner/job ID filters MUST be applied in memory.
 * FIND(recId, ARRAYJOIN({Link})) matches primary-field *names*, not record IDs,
 * so Airtable formulas silently return empty partner lists/dashboards.
 */
export async function listSubmissions(
  filters: SubmissionListFilters = {},
): Promise<Submission[]> {
  const {
    includePartnerIdentity = false,
    enrich = true,
    ...listFilters
  } = filters;
  const candidatesMode = getSubmissionsMode() === "candidates";
  const scopeInMemory =
    candidatesMode &&
    Boolean(
      listFilters.partnerId || listFilters.jobId || listFilters.allocationId,
    );

  const formula = scopeInMemory
    ? ""
    : buildSubmissionsFilterFormula({
        partnerId: listFilters.partnerId,
        jobId: listFilters.jobId,
        allocationId: listFilters.allocationId,
      });

  // Prefer request-scoped full scan when filtering in memory or listing all.
  let rows =
    !formula
      ? await loadAllSubmissionsCached()
      : await findSubmissionsSafe({
          filterByFormula: formula,
          sort: [
            {
              field: SUBMISSIONS_TABLE_FIELDS.submissionDate,
              direction: "desc",
            },
          ],
        });

  if (listFilters.partnerId) {
    rows = rows.filter((row) => row.partnerId === listFilters.partnerId);
  }
  if (listFilters.jobId) {
    rows = rows.filter((row) => row.jobId === listFilters.jobId);
  }
  if (listFilters.allocationId) {
    rows = rows.filter((row) => row.allocationId === listFilters.allocationId);
  }

  if (!enrich) {
    if (listFilters.status && listFilters.status !== "all") {
      rows = rows.filter((row) => row.status === listFilters.status);
    }
    return rows;
  }

  const enriched = await withEnrichment(rows, includePartnerIdentity);

  let filtered = enriched;
  if (listFilters.status && listFilters.status !== "all") {
    filtered = filtered.filter((row) => row.status === listFilters.status);
  }
  if (listFilters.jobTitle?.trim()) {
    const q = listFilters.jobTitle.trim().toLowerCase();
    filtered = filtered.filter((row) =>
      (row.jobTitle ?? "").toLowerCase().includes(q),
    );
  }
  if (listFilters.search?.trim()) {
    const q = listFilters.search.trim().toLowerCase();
    filtered = filtered.filter((row) => {
      const haystack = [
        row.candidateName,
        row.jobTitle,
        row.jobCode,
        row.partnerName,
        row.partnerCode,
        row.interviewStage,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  return filtered;
}

export async function listPartnerSubmissions(
  partnerId: string,
): Promise<Submission[]> {
  return listSubmissions({ partnerId });
}

export async function getSubmissionById(
  submissionId: string,
): Promise<Submission | null> {
  const row = await findSubmissionById(submissionId);
  if (!row) {
    return null;
  }
  const [enriched] = await withEnrichment([row]);
  return enriched ?? null;
}

/**
 * Open review queue — submissions not joined/rejected.
 * Pass jobIds to hard-scope for Account Managers (never return other AMs' rows).
 */
export async function listReviewQueueSubmissions(options?: {
  jobIds?: string[];
}): Promise<Submission[]> {
  if (options?.jobIds && options.jobIds.length === 0) {
    return [];
  }

  const rows = await listSubmissions();
  const allowed =
    options?.jobIds != null ? new Set(options.jobIds) : null;

  const open = rows.filter((row) => {
    if (!REVIEWABLE_SUBMISSION_STATUSES.includes(row.status)) {
      return false;
    }
    if (allowed && !allowed.has(row.jobId)) {
      return false;
    }
    return true;
  });

  const priorityRank: Record<string, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return open.sort((a, b) => {
    const pa = a.jobPriority ? (priorityRank[a.jobPriority] ?? 99) : 99;
    const pb = b.jobPriority ? (priorityRank[b.jobPriority] ?? 99) : 99;
    if (pa !== pb) {
      return pa - pb;
    }
    return (b.submissionDate ?? "").localeCompare(a.submissionDate ?? "");
  });
}

/**
 * Used ONLY by Workflow Service. Do not call from UI/actions.
 */
export async function applySubmissionStatusChange(
  submissionId: string,
  status: SubmissionStatus,
): Promise<Submission> {
  const updated = await patchSubmission(submissionId, {
    [SUBMISSIONS_TABLE_FIELDS.status]:
      DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE[status],
  });
  const [enriched] = await withEnrichment([updated]);
  if (!enriched) {
    throw new Error("Failed to update submission status");
  }
  return enriched;
}

/**
 * Candidate Submission Engine — orchestrates Person + Event.
 * Partners may only submit against their own active allocations.
 *
 * Candidates mode: one atomic create with Role + Partner + person fields,
 * then resume bind — never leave an unlinked resume-only orphan.
 */
export async function submitCandidateForAllocation(
  payload: SubmitCandidatePayload,
): Promise<SubmitCandidateResult> {
  const allocation = await getAllocationById(payload.allocationId);
  if (!allocation) {
    throw new Error("Allocation not found");
  }
  if (allocation.partnerId !== payload.partnerId) {
    throw new Error("You can only submit candidates for your own allocations");
  }
  if (!ACTIVE_ALLOCATION_STATUSES.includes(allocation.status)) {
    throw new Error("This allocation is no longer active");
  }
  if (allocation.jobId !== payload.jobId) {
    throw new Error("Job does not match this allocation");
  }

  const candidatesMode = getSubmissionsMode() === "candidates";
  let candidate: Candidate;
  let reusedCandidate = false;
  let submission: Submission;

  if (payload.existingCandidateId) {
    const existing = await getCandidateById(payload.existingCandidateId);
    if (!existing) {
      throw new Error("Existing candidate not found");
    }

    const prior = await listSubmissions({ partnerId: payload.partnerId });
    const ownsCandidate = prior.some(
      (row) => row.candidateId === existing.id,
    );
    if (!ownsCandidate) {
      throw new Error(
        "You can only reuse candidates you previously submitted",
      );
    }

    candidate = existing;
    reusedCandidate = true;

    const existingForJob = prior.filter(
      (row) =>
        row.jobId === payload.jobId &&
        row.allocationId === payload.allocationId &&
        row.candidateId === candidate.id,
    );
    if (existingForJob.length > 0) {
      throw new Error("This candidate was already submitted for this allocation");
    }

    // Link first, then optional resume — visibility never depends on upload alone.
    submission = await insertSubmission(
      toAirtableCreateFields({
        candidateId: candidate.id,
        jobId: payload.jobId,
        allocationId: payload.allocationId,
        partnerId: payload.partnerId,
        status: "submitted",
        remarks: payload.form.remarks?.trim() || undefined,
      }),
    );

    if (payload.resumeUpload) {
      try {
        candidate = await attachResumeToCandidate(
          candidate.id,
          payload.resumeUpload,
        );
      } catch (error) {
        console.error(
          "[submit] Resume upload failed after link (submission kept)",
          error,
        );
        throw new Error(
          error instanceof Error
            ? `Candidate linked, but resume upload failed: ${error.message}`
            : "Candidate linked, but resume upload failed",
        );
      }
    }
  } else {
    const duplicates = await findDuplicateCandidates({
      email: payload.form.email,
      phone: payload.form.phone,
    });

    const prior = await listSubmissions({ partnerId: payload.partnerId });
    const ownedIds = new Set(prior.map((row) => row.candidateId));
    const ownedDuplicates = duplicates.filter((row) => ownedIds.has(row.id));

    if (ownedDuplicates.length > 0) {
      return { ok: false, reason: "duplicate", duplicates: ownedDuplicates };
    }

    if (payload.resumeRequired !== false && !payload.resumeUpload) {
      throw new Error("Resume is required for new candidates");
    }

    if (candidatesMode) {
      // Single Airtable create: person + Role + Partner + status.
      submission = await insertSubmission(
        toAirtableCandidateSubmissionCreateFields({
          fullName: payload.form.fullName,
          email: payload.form.email,
          phone: payload.form.phone || undefined,
          currentCompany: payload.form.currentCompany || undefined,
          currentLocation: payload.form.currentLocation || undefined,
          experience: payload.form.experience || undefined,
          currentCtc: payload.form.currentCtc || undefined,
          expectedCtc: payload.form.expectedCtc || undefined,
          noticePeriod: payload.form.noticePeriod || undefined,
          linkedIn: payload.form.linkedIn?.trim() || undefined,
          skills: parseSkillsInput(payload.form.skills),
          remarks: payload.form.remarks?.trim() || undefined,
          jobId: payload.jobId,
          partnerId: payload.partnerId,
          status: "submitted",
        }),
      );

      const created = await getCandidateById(submission.candidateId);
      if (!created) {
        throw new Error("Candidate was created but could not be reloaded");
      }
      candidate = created;

      if (payload.resumeUpload) {
        try {
          candidate = await attachResumeToCandidate(
            candidate.id,
            payload.resumeUpload,
          );
        } catch (error) {
          console.error(
            "[submit] Resume upload failed after create (submission kept)",
            {
              candidateId: candidate.id,
              error,
            },
          );
          throw new Error(
            error instanceof Error
              ? `Candidate saved, but resume upload failed: ${error.message}`
              : "Candidate saved, but resume upload failed",
          );
        }
      }
    } else {
      candidate = await createCandidate(
        {
          fullName: payload.form.fullName,
          email: payload.form.email,
          phone: payload.form.phone,
          currentCompany: payload.form.currentCompany || undefined,
          currentLocation: payload.form.currentLocation || undefined,
          experience: payload.form.experience || undefined,
          currentCtc: payload.form.currentCtc || undefined,
          expectedCtc: payload.form.expectedCtc || undefined,
          noticePeriod: payload.form.noticePeriod || undefined,
          linkedIn: payload.form.linkedIn?.trim() || undefined,
          skills: parseSkillsInput(payload.form.skills),
          remarks: payload.form.remarks?.trim() || undefined,
        },
        { skipDuplicateCheck: duplicates.length > 0 },
      );

      if (payload.resumeUpload) {
        candidate = await attachResumeToCandidate(
          candidate.id,
          payload.resumeUpload,
        );
      }

      const existingForJob = await listSubmissions({
        partnerId: payload.partnerId,
        jobId: payload.jobId,
        allocationId: payload.allocationId,
      });
      if (existingForJob.some((row) => row.candidateId === candidate.id)) {
        throw new Error(
          "This candidate was already submitted for this allocation",
        );
      }

      submission = await insertSubmission(
        toAirtableCreateFields({
          candidateId: candidate.id,
          jobId: payload.jobId,
          allocationId: payload.allocationId,
          partnerId: payload.partnerId,
          status: "submitted",
          remarks: payload.form.remarks?.trim() || undefined,
        }),
      );
    }
  }

  try {
    const { ensurePayoutForSubmission } = await import(
      "@/features/payouts/services/payouts.service"
    );
    await ensurePayoutForSubmission(submission);
  } catch (error) {
    // Payout ledger is optional on the client CRM base — never fail submit.
    console.error("Payout create skipped after submission", error);
  }

  // job_partners mode has no Profiles Submitted column — counts derive from
  // listSubmissions. Only persist counters when a real Allocations table exists.
  if (getAllocationsMode() !== "job_partners") {
    const nextCount = allocation.profilesSubmitted + 1;
    try {
      await updateAllocation(allocation.id, {
        profilesSubmitted: nextCount,
        status:
          allocation.status === "assigned" ? "working" : allocation.status,
      });
    } catch (error) {
      console.error("[submit] Allocation counter update failed", error);
    }
  }

  try {
    const { notifyCandidateSubmitted } = await import(
      "@/features/notifications/services/notification-events"
    );
    const job = await getJobById(payload.jobId);
    await notifyCandidateSubmitted({
      accountManagerId: job?.accountManagerId ?? null,
      candidateName: candidate.fullName,
      jobTitle: job?.title ?? "Job",
      submissionId: submission.id,
    });
  } catch (error) {
    console.error("Failed to publish candidate submission notification", error);
  }

  const [enriched] = await withEnrichment([submission]);

  return {
    ok: true,
    submission: enriched ?? submission,
    candidate,
    reusedCandidate,
  };
}

export async function stageResumeFile(file: {
  filename: string;
  contentType: string;
  data: Buffer;
  size: number;
}): Promise<UploadedFile> {
  return getUploadService().upload(file);
}

export interface UpdateSubmissionReviewFieldsInput {
  interviewStage?: string | null;
  remarks?: string | null;
  internalFeedback?: string | null;
}

/**
 * Staff review fields (Interview Stage, Screening Matrix Notes, Internal Feedback).
 * Does not change Submission Status — use workflow transitions for that.
 */
export async function updateSubmissionReviewFields(
  submissionId: string,
  input: UpdateSubmissionReviewFieldsInput,
): Promise<Submission> {
  const current = await findSubmissionById(submissionId);
  if (!current) {
    throw new Error("Submission not found");
  }

  const fields: AirtableFields = {};

  if (input.interviewStage !== undefined) {
    const stage = input.interviewStage?.trim() || "";
    if (
      stage &&
      !(AIRTABLE_INTERVIEW_STAGES as readonly string[]).includes(stage)
    ) {
      throw new Error(`Invalid interview stage: ${stage}`);
    }
    fields[SUBMISSIONS_TABLE_FIELDS.interviewStage] = stage;
  }
  if (input.remarks !== undefined) {
    fields[SUBMISSIONS_TABLE_FIELDS.remarks] = input.remarks?.trim() || "";
  }
  if (input.internalFeedback !== undefined) {
    fields[SUBMISSIONS_TABLE_FIELDS.internalFeedback] =
      input.internalFeedback?.trim() || "";
  }

  if (Object.keys(fields).length === 0) {
    const [enriched] = await withEnrichment([current]);
    return enriched ?? current;
  }

  const updated = await patchSubmission(submissionId, fields);
  const [enriched] = await withEnrichment([updated]);
  if (!enriched) {
    throw new Error("Failed to update review fields");
  }

  try {
    const { notifySubmissionReviewUpdated } = await import(
      "@/features/notifications/services/notification-events"
    );
    await notifySubmissionReviewUpdated({
      partnerId: enriched.partnerId,
      candidateName: enriched.candidateName ?? "Candidate",
      jobTitle: enriched.jobTitle ?? "Job",
      submissionId: enriched.id,
      interviewStage: enriched.interviewStage,
    });
  } catch (error) {
    console.error("Failed to notify partner of review field update", error);
  }

  try {
    const { recordActivity } = await import(
      "@/features/workflows/services/activity.service"
    );
    await recordActivity({
      entityType: "submission",
      entityId: submissionId,
      action: "status_change",
      fromStatus: current.interviewStage,
      toStatus: enriched.interviewStage ?? enriched.status,
      note: "review_fields_updated",
    });
  } catch (error) {
    console.error("Failed to record review-field activity", error);
  }

  return enriched;
}

/**
 * Partner (or staff) requests 2nd-level review after rejection.
 * Writes the exact Airtable singleSelect value.
 */
export async function requestSecondLevelReview(
  submissionId: string,
  actor: { partnerId?: string | null; isStaff: boolean },
): Promise<Submission> {
  const current = await getSubmissionById(submissionId);
  if (!current) {
    throw new Error("Submission not found");
  }

  if (current.status !== "rejected") {
    throw new Error(
      "Second level review can only be requested after the candidate is rejected",
    );
  }

  if (!actor.isStaff) {
    if (!actor.partnerId || actor.partnerId !== current.partnerId) {
      throw new Error("You can only request review for your own candidates");
    }
  }

  if (current.wantsSecondLevelReview) {
    return current;
  }

  const updated = await patchSubmission(submissionId, {
    [SUBMISSIONS_TABLE_FIELDS.wantsSecondLevelReview]:
      AIRTABLE_SECOND_LEVEL_REVIEW_YES,
  });
  const [enriched] = await withEnrichment([updated]);
  if (!enriched) {
    throw new Error("Failed to request second level review");
  }

  try {
    const { notifySecondLevelReviewRequested } = await import(
      "@/features/notifications/services/notification-events"
    );
    const job = await getJobById(enriched.jobId);
    await notifySecondLevelReviewRequested({
      accountManagerId: job?.accountManagerId ?? null,
      candidateName: enriched.candidateName ?? "Candidate",
      jobTitle: enriched.jobTitle ?? job?.title ?? "Job",
      submissionId: enriched.id,
      partnerName: enriched.partnerName ?? "Talent Partner",
    });
  } catch (error) {
    console.error("Failed to notify staff of second-level review", error);
  }

  try {
    const { recordActivity } = await import(
      "@/features/workflows/services/activity.service"
    );
    await recordActivity({
      entityType: "submission",
      entityId: submissionId,
      action: "status_change",
      fromStatus: "rejected",
      toStatus: "second_level_review",
      note: "Want 2nd level Review of Profile",
    });
  } catch (error) {
    console.error("Failed to record second-level review activity", error);
  }

  return enriched;
}

/**
 * Permanently delete a candidate submission (and linked payout row when stored).
 */
export async function deleteSubmission(submissionId: string): Promise<void> {
  const submission = await findSubmissionById(submissionId);
  if (!submission) {
    throw new Error("Candidate not found");
  }

  try {
    const { getPayoutBySubmissionId } = await import(
      "@/features/payouts/services"
    );
    const { deleteRecord } = await import("@/lib/airtable/client");
    const { getOptionalAirtableTableName } = await import(
      "@/lib/airtable/tables"
    );
    const { isDerivedPayoutId } = await import(
      "@/features/payouts/services/payouts.derived"
    );

    const payout = await getPayoutBySubmissionId(submissionId);
    const payoutsTable = getOptionalAirtableTableName("payoutsTable");
    if (payout && payoutsTable && !isDerivedPayoutId(payout.id)) {
      await deleteRecord(payoutsTable, payout.id);
    }
  } catch (error) {
    console.error("Failed to remove linked payout before candidate delete", error);
  }

  await destroySubmission(submissionId);
}
