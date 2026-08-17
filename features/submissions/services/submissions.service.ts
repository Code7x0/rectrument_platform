import { cache } from "react";

import { getRecords, type AirtableFields } from "@/lib/airtable/client";
import { asLinkedIds } from "@/lib/airtable/compat";
import { PARTNERS_TABLE_FIELDS } from "@/lib/airtable/fields";
import { getAirtableTableName } from "@/lib/airtable/tables";
import {
  getAllocationById,
  listActiveAllocationsForPartner,
  updateAllocation,
} from "@/features/allocations/services";
import {
  attachResumeToCandidate,
  clearResumeFromCandidate,
  createCandidate,
  findDuplicateCandidates,
  getCandidateById,
  parseSkillsInput,
} from "@/features/candidates/services";
import { findCandidates } from "@/features/candidates/repositories/candidates.repository";
import type { Candidate } from "@/features/candidates/types";
import type { CandidateFormValues } from "@/features/candidates/schemas/candidate.schema";
import { getJobById, listJobs } from "@/features/jobs/services";
import { listClients } from "@/features/clients/services";
import {
  findSubmissionById,
  findSubmissionsSafe,
  insertSubmission,
  patchSubmission,
  destroySubmission,
} from "@/features/submissions/repositories/submissions.repository";
import { buildScreeningMatrixNotes } from "@/features/submissions/lib/build-screening-matrix-notes";
import { isUnreviewedByStaff } from "@/features/submissions/lib/partner-edit-eligibility";
import { updateCandidateRecord } from "@/features/candidates/repositories/candidates.repository";
import { toAirtableUpdateFields } from "@/features/candidates/services/candidates.mapper";
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
  AIRTABLE_SUBMISSION_STATUS,
  AIRTABLE_SUBMISSION_STATUS_OPTIONS,
  resolveAirtableSubmissionStatusOption,
  DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE,
  SUBMISSIONS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
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

  // One request-scoped jobs/candidates/clients scan instead of N× Airtable finds.
  const [candidates, jobs, partners, clientRows] = await Promise.all([
    candidatesMode
      ? Promise.resolve([] as Candidate[])
      : loadAllCandidatesCached(),
    listJobs({ includeArchived: true }),
    listPartnerOptions(includePartnerIdentity ? "identity" : "operational"),
    listClients({ includeArchived: true }),
  ]);

  const candidateMap = new Map(candidates.map((c) => [c.id, c]));
  const jobMap = new Map(jobs.map((j) => [j.id, j]));
  const partnerMap = new Map(
    partners.map((p) => [p.id, { label: p.label, code: p.code ?? null }]),
  );
  const clientMap = new Map(clientRows.map((c) => [c.id, c]));

  return submissions.map((row) => {
    const candidate = candidateMap.get(row.candidateId);
    const job = jobMap.get(row.jobId);
    const partner = partnerMap.get(row.partnerId);
    const clientId = job?.clientId ?? row.clientId ?? null;
    const client = clientId ? clientMap.get(clientId) : undefined;
    const clientCode =
      client?.clientCode?.trim() ||
      job?.clientCode?.trim() ||
      row.clientCode?.trim() ||
      job?.jobCode?.split("_")[0]?.trim() ||
      null;
    const rawName =
      client?.name?.trim() ||
      job?.clientName?.trim() ||
      row.clientName?.trim() ||
      null;
    const clientName =
      rawName && !/^rec[a-zA-Z0-9]{10,}$/.test(rawName) ? rawName : clientCode;
    return {
      ...row,
      candidateName: candidate?.fullName ?? row.candidateName ?? null,
      resumeUrl: candidate?.resumeUrl ?? row.resumeUrl ?? null,
      resumeFilename: candidate?.resumeFilename ?? row.resumeFilename ?? null,
      linkedIn: candidate?.linkedIn ?? row.linkedIn ?? null,
      jobTitle: job?.title ?? null,
      jobCode: job?.jobCode || null,
      clientId,
      clientName,
      clientCode,
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
  /**
   * When true, create a new Candidates row even if the partner already
   * submitted this person for a different job (multi-job submit / edit).
   */
  allowSamePersonOtherJob?: boolean;
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
    }
  | {
      ok: false;
      reason: "duplicate_blocked";
      message: string;
      existingStatus: string | null;
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

async function listPartnerLinkedCandidateIds(
  partnerId: string,
): Promise<Set<string>> {
  try {
    const records = await getRecords(getAirtableTableName("partnersTable"), {
      filterByFormula: `RECORD_ID() = '${partnerId.replace(/'/g, "\\'")}'`,
      fields: [PARTNERS_TABLE_FIELDS.candidates],
      maxRecords: 1,
    });
    const fields = (records[0]?.fields ?? {}) as AirtableFields;
    return new Set(asLinkedIds(fields[PARTNERS_TABLE_FIELDS.candidates]));
  } catch (error) {
    console.warn("[submissions] Partner.Candidates lookup failed", error);
    return new Set();
  }
}

export const listPartnerSubmissions = cache(async function listPartnerSubmissions(
  partnerId: string,
): Promise<Submission[]> {
  if (!partnerId) {
    return [];
  }

  const [linked, linkedCandidateIds, allocations] = await Promise.all([
    listSubmissions({ partnerId }),
    listPartnerLinkedCandidateIds(partnerId),
    listActiveAllocationsForPartner(partnerId),
  ]);

  const allocatedJobIds = new Set(allocations.map((row) => row.jobId));
  const seen = new Set(linked.map((row) => row.id));

  if (linkedCandidateIds.size === 0 && allocatedJobIds.size === 0) {
    return linked;
  }

  const extras = (await listSubmissions({ enrich: true })).filter((row) => {
    if (seen.has(row.id)) {
      return false;
    }
    if (linkedCandidateIds.has(row.id) || linkedCandidateIds.has(row.candidateId)) {
      return true;
    }
    return !row.partnerId && allocatedJobIds.has(row.jobId);
  });

  if (extras.length === 0) {
    return linked;
  }

  return [...linked, ...extras].sort((a, b) =>
    (b.submissionDate ?? "").localeCompare(a.submissionDate ?? ""),
  );
});

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

  const screeningNotes = buildScreeningMatrixNotes({
    experience: payload.form.experience,
    skillScreens: payload.form.skillScreens ?? [],
    remarks: payload.form.remarks,
  });

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
        remarks: screeningNotes || undefined,
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
    const foreignDuplicates = duplicates.filter(
      (row) => !ownedIds.has(row.id),
    );

    // Other partners' candidates with same mobile — never create a duplicate.
    if (foreignDuplicates.length > 0) {
      const { evaluateDuplicateCandidatePolicy } = await import(
        "@/features/submissions/lib/duplicate-candidate-policy"
      );
      const matchedIds = new Set(foreignDuplicates.map((row) => row.id));
      const relatedSubs = (await listSubmissions({ enrich: false })).filter(
        (row) =>
          matchedIds.has(row.candidateId) || matchedIds.has(row.id),
      );
      const policy = evaluateDuplicateCandidatePolicy(relatedSubs);
      if (policy.action !== "allow") {
        if (policy.action === "block_alert_am") {
          const job = await getJobById(payload.jobId);
          const { getPartnerById } = await import(
            "@/features/partners/services"
          );
          const { operationalPartnerLabel } = await import(
            "@/features/partners/services/partner-privacy"
          );
          const { notifyDuplicateCandidateAttempt } = await import(
            "@/features/notifications/services/notification-events"
          );
          const partner = await getPartnerById(payload.partnerId);
          notifyDuplicateCandidateAttempt({
            accountManagerId: job?.accountManagerId ?? null,
            accountManagerIds: job?.accountManagerIds ?? null,
            partnerId: payload.partnerId,
            partnerLabel: partner
              ? operationalPartnerLabel(partner)
              : "Talent Partner",
            jobTitle: job?.title ?? "Job",
            jobCode: job?.jobCode,
            candidateName: payload.form.fullName,
            existingStatus: policy.existingStatus,
            matchedCandidateId: foreignDuplicates[0]!.id,
          });
          console.info("[submissions] duplicate attempt blocked", {
            partnerId: payload.partnerId,
            jobId: payload.jobId,
            matchedCandidateId: foreignDuplicates[0]!.id,
            existingStatus: policy.existingStatus,
          });
        }
        return {
          ok: false,
          reason: "duplicate_blocked",
          message: policy.message,
          existingStatus: policy.existingStatus,
          duplicates: foreignDuplicates,
        };
      }
    }

    if (ownedDuplicates.length > 0) {
      const ownedDupIds = new Set(ownedDuplicates.map((row) => row.id));
      const alreadyForThisJob = prior.some(
        (row) =>
          row.jobId === payload.jobId && ownedDupIds.has(row.candidateId),
      );
      if (alreadyForThisJob) {
        throw new Error("This candidate was already submitted for this job");
      }
      // Candidates mode: one row = one job. Same person on another job needs a
      // new row — do not prompt "reuse" (reuse patches Role and overwrites the job).
      if (
        candidatesMode ||
        payload.allowSamePersonOtherJob
      ) {
        // continue to create
      } else {
        return { ok: false, reason: "duplicate", duplicates: ownedDuplicates };
      }
    }

    if (payload.resumeRequired !== false && !payload.resumeUpload) {
      throw new Error("Resume is required for new candidates");
    }

    if (candidatesMode) {
      const { allocateCandidateCodeForPerson } = await import(
        "@/features/shared/services/business-ids.service"
      );
      const candidateCode = await allocateCandidateCodeForPerson({
        fullName: payload.form.fullName,
        phone: payload.form.phone,
        submittedAt: new Date(),
      });

      const createInput = {
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
        remarks: screeningNotes || undefined,
        jobId: payload.jobId,
        partnerId: payload.partnerId,
        candidateCode,
        status: "submitted" as const,
      };

      // Person + Role + Partner + business ID + Anonymous Created By.
      // Retry without schema-sensitive fields if Airtable still uses system types.
      const createAttempts = [
        createInput,
        { ...createInput, stampAnonymous: false as const },
        { ...createInput, candidateCode: undefined },
        { ...createInput, candidateCode: undefined, stampAnonymous: false as const },
      ];
      let lastCreateError: unknown;
      let createdSubmission: Submission | null = null;
      for (const attempt of createAttempts) {
        try {
          createdSubmission = await insertSubmission(
            toAirtableCandidateSubmissionCreateFields(attempt),
          );
          lastCreateError = null;
          break;
        } catch (error) {
          lastCreateError = error;
        }
      }
      if (!createdSubmission) {
        throw lastCreateError instanceof Error
          ? lastCreateError
          : new Error("Unable to create candidate submission");
      }
      submission = createdSubmission;

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
          remarks: screeningNotes || undefined,
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
          remarks: screeningNotes || undefined,
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
  /** Exact Airtable Submission Status option (staff dropdown). */
  airtableStatus?: string | null;
  interviewStage?: string | null;
  remarks?: string | null;
  internalFeedback?: string | null;
}

function mapAirtableStatusToDomain(raw: string): SubmissionStatus {
  const direct =
    AIRTABLE_SUBMISSION_STATUS[raw as keyof typeof AIRTABLE_SUBMISSION_STATUS];
  if (direct) {
    return direct;
  }
  const trimmed = raw.trim();
  for (const [key, domain] of Object.entries(AIRTABLE_SUBMISSION_STATUS)) {
    if (key.trim() === trimmed) {
      return domain as SubmissionStatus;
    }
  }
  return "submitted";
}

function isKnownAirtableStatus(value: string): boolean {
  const trimmed = value.trim();
  if (
    (AIRTABLE_SUBMISSION_STATUS_OPTIONS as readonly string[]).some(
      (option) => option === value || option.trim() === trimmed,
    )
  ) {
    return true;
  }
  return Object.keys(AIRTABLE_SUBMISSION_STATUS).some(
    (key) => key === value || key.trim() === trimmed,
  );
}

/**
 * Staff review fields: Submission Status, Interview Stage, Internal Feedback.
 * Screening Matrix Notes stays partner-owned — callers should not send remarks.
 * Each field is optional — only provided keys are written.
 */
export async function updateSubmissionReviewFields(
  submissionId: string,
  input: UpdateSubmissionReviewFieldsInput,
  actorUserId?: string | null,
): Promise<Submission> {
  const current = await findSubmissionById(submissionId);
  if (!current) {
    throw new Error("Submission not found");
  }

  const fields: AirtableFields = {};
  const previousStatus = current.status;
  const previousAirtableStatus = (current.airtableStatus ?? "").trim();
  let nextDomainStatus = current.status;
  let nextAirtableStatus = previousAirtableStatus;

  if (input.airtableStatus !== undefined) {
    const statusValue = input.airtableStatus?.trim() || "";
    if (!statusValue) {
      throw new Error("Submission Status is required");
    }
    // Prefer exact catalog value (preserves trailing spaces on Airtable options).
    const exact =
      resolveAirtableSubmissionStatusOption(input.airtableStatus) ??
      input.airtableStatus;
    if (!exact || !isKnownAirtableStatus(exact)) {
      throw new Error(`Invalid submission status: ${statusValue}`);
    }
    fields[SUBMISSIONS_TABLE_FIELDS.status] = exact;
    nextDomainStatus = mapAirtableStatusToDomain(exact);
    nextAirtableStatus = exact.trim();
  }

  if (input.interviewStage !== undefined) {
    const stage = input.interviewStage?.trim() || "";
    if (
      stage &&
      !(AIRTABLE_INTERVIEW_STAGES as readonly string[]).includes(stage)
    ) {
      throw new Error(`Invalid interview stage: ${stage}`);
    }
    // Airtable singleSelect rejects "" (tries to create option ""). Clear with null.
    fields[SUBMISSIONS_TABLE_FIELDS.interviewStage] = (
      stage ? stage : null
    ) as AirtableFields[string];
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

  const statusChanged =
    input.airtableStatus !== undefined &&
    (previousStatus !== nextDomainStatus ||
      previousAirtableStatus !== nextAirtableStatus);
  const stageChanged =
    input.interviewStage !== undefined &&
    (input.interviewStage?.trim() || "") !== (current.interviewStage ?? "");
  const notesChanged =
    (input.remarks !== undefined &&
      (input.remarks?.trim() || "") !== (current.remarks ?? "")) ||
    (input.internalFeedback !== undefined &&
      (input.internalFeedback?.trim() || "") !==
        (current.internalFeedback ?? ""));

  try {
    const { recordActivity } = await import(
      "@/features/workflows/services/activity.service"
    );
    if (statusChanged) {
      await recordActivity({
        entityType: "submission",
        entityId: submissionId,
        action: "status_change",
        fromStatus: previousStatus,
        toStatus: nextDomainStatus,
        note: enriched.airtableStatus,
      });
    } else if (stageChanged) {
      await recordActivity({
        entityType: "submission",
        entityId: submissionId,
        action: "status_change",
        fromStatus: current.interviewStage,
        toStatus: enriched.interviewStage,
        note: "interview_stage_updated",
      });
    } else if (notesChanged) {
      await recordActivity({
        entityType: "submission",
        entityId: submissionId,
        action: "status_change",
        fromStatus: current.status,
        toStatus: enriched.status,
        note: "review_fields_updated",
      });
    }
  } catch (error) {
    console.error("Failed to record review-field activity", error);
  }

  try {
    if (statusChanged) {
      const { notifySubmissionStatusChanged } = await import(
        "@/features/notifications/services/notification-events"
      );
      await notifySubmissionStatusChanged({
        partnerId: enriched.partnerId,
        candidateName: enriched.candidateName ?? "Candidate",
        jobTitle: enriched.jobTitle ?? "Job",
        submissionId: enriched.id,
        toStatus: nextDomainStatus,
        statusLabel: enriched.airtableStatus,
      });
    } else if (stageChanged || notesChanged) {
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
    }
  } catch (error) {
    console.error("Failed to notify partner of review field update", error);
  }

  if (statusChanged && nextDomainStatus === "joined") {
    try {
      const { markPayoutEligibleOnJoined } = await import(
        "@/features/payouts/services/payouts.service"
      );
      await markPayoutEligibleOnJoined(
        enriched,
        actorUserId?.trim() || "system",
      );
    } catch (error) {
      console.error("Failed to mark payout eligible on joined", error);
    }
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

export async function updatePartnerSubmissionProfile(input: {
  submissionId: string;
  partnerId: string;
  form: CandidateFormValues;
  resumeUpload?: UploadedFile | null;
  /** Clear existing resume when no replacement file is provided. */
  removeResume?: boolean;
  /** Allocated jobs to keep/add while still unreviewed. */
  jobSelections?: Array<{ jobId: string; allocationId: string }>;
}): Promise<Submission> {
  const current = await findSubmissionById(input.submissionId);
  if (!current) {
    throw new Error("Candidate not found");
  }
  if (current.partnerId !== input.partnerId) {
    throw new Error("You can only edit candidates you submitted");
  }
  if (!isUnreviewedByStaff(current)) {
    throw new Error("This profile is locked after internal review");
  }

  const fresh = await findSubmissionById(input.submissionId);
  if (!fresh || !isUnreviewedByStaff(fresh)) {
    throw new Error("This profile is locked after internal review");
  }

  const screeningNotes = buildScreeningMatrixNotes({
    experience: input.form.experience,
    skillScreens: input.form.skillScreens ?? [],
    remarks: input.form.remarks,
  });

  const linkedIn = input.form.linkedIn?.trim()
    ? input.form.linkedIn.trim().startsWith("http")
      ? input.form.linkedIn.trim()
      : `https://${input.form.linkedIn.trim()}`
    : "";

  await updateCandidateRecord(
    fresh.candidateId,
    toAirtableUpdateFields({
      fullName: input.form.fullName,
      email: input.form.email,
      phone: input.form.phone,
      currentLocation: input.form.currentLocation,
      currentCtc: input.form.currentCtc || undefined,
      expectedCtc: input.form.expectedCtc || undefined,
      noticePeriod: input.form.noticePeriod,
      linkedIn: linkedIn || undefined,
      remarks: screeningNotes || undefined,
    }),
  );

  if (input.resumeUpload) {
    try {
      await attachResumeToCandidate(fresh.candidateId, input.resumeUpload);
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `Profile saved, but resume upload failed: ${error.message}`
          : "Profile saved, but resume upload failed",
      );
    }
  } else if (input.removeResume) {
    try {
      await clearResumeFromCandidate(fresh.candidateId);
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `Profile saved, but resume removal failed: ${error.message}`
          : "Profile saved, but resume removal failed",
      );
    }
  }

  if (input.jobSelections !== undefined) {
    await syncPartnerSubmissionJobs({
      submission: fresh,
      partnerId: input.partnerId,
      form: input.form,
      jobSelections: input.jobSelections,
      screeningNotes,
    });
  }

  const updated = await getSubmissionById(input.submissionId);
  if (!updated) {
    throw new Error("Candidate was updated but could not be reloaded");
  }
  return updated;
}

async function assertPartnerOwnsActiveAllocation(input: {
  partnerId: string;
  jobId: string;
  allocationId: string;
}): Promise<void> {
  const allocation = await getAllocationById(input.allocationId);
  if (!allocation) {
    throw new Error("Allocation not found");
  }
  if (allocation.partnerId !== input.partnerId) {
    throw new Error("You can only use your own job allocations");
  }
  if (!ACTIVE_ALLOCATION_STATUSES.includes(allocation.status)) {
    throw new Error("This allocation is no longer active");
  }
  if (allocation.jobId !== input.jobId) {
    throw new Error("Job does not match this allocation");
  }
}

/**
 * Change Role on this unreviewed row and/or create additional Candidates rows
 * for other selected jobs (client mode = one row per job submission).
 */
async function syncPartnerSubmissionJobs(input: {
  submission: Submission;
  partnerId: string;
  form: CandidateFormValues;
  jobSelections: Array<{ jobId: string; allocationId: string }>;
  screeningNotes: string;
}): Promise<void> {
  const unique = new Map<string, { jobId: string; allocationId: string }>();
  for (const row of input.jobSelections) {
    const jobId = row.jobId?.trim();
    const allocationId = row.allocationId?.trim();
    if (!jobId || !allocationId) {
      continue;
    }
    unique.set(jobId, { jobId, allocationId });
  }
  const selections = [...unique.values()];
  if (selections.length === 0) {
    throw new Error("Select at least one job");
  }

  for (const selection of selections) {
    const isCurrentRow =
      selection.jobId === input.submission.jobId &&
      selection.allocationId === input.submission.allocationId;
    if (isCurrentRow) {
      continue;
    }
    await assertPartnerOwnsActiveAllocation({
      partnerId: input.partnerId,
      jobId: selection.jobId,
      allocationId: selection.allocationId,
    });
  }

  const selectedJobIds = new Set(selections.map((row) => row.jobId));
  const keepCurrent = selections.find(
    (row) => row.jobId === input.submission.jobId,
  );
  const primary = keepCurrent ?? selections[0]!;

  if (primary.jobId !== input.submission.jobId) {
    const fields: AirtableFields = {
      [SUBMISSIONS_TABLE_FIELDS.role]: [primary.jobId],
    };
    if (getSubmissionsMode() !== "candidates") {
      fields[SUBMISSIONS_TABLE_FIELDS.job] = [primary.jobId];
      fields[SUBMISSIONS_TABLE_FIELDS.allocation] = [primary.allocationId];
    }
    await patchSubmission(input.submission.id, fields);
  }

  const prior = await listSubmissions({ partnerId: input.partnerId });
  const duplicates = await findDuplicateCandidates({
    email: input.form.email,
    phone: input.form.phone,
  });
  const samePersonIds = new Set(
    duplicates
      .filter((row) => prior.some((sub) => sub.candidateId === row.id))
      .map((row) => row.id),
  );
  // Include this row (candidates mode: candidateId === submission.id).
  samePersonIds.add(input.submission.candidateId);

  const alreadyOnJob = new Set(
    prior
      .filter((row) => samePersonIds.has(row.candidateId))
      .map((row) => row.jobId),
  );
  alreadyOnJob.add(primary.jobId);

  for (const selection of selections) {
    if (selection.jobId === primary.jobId) {
      continue;
    }
    if (alreadyOnJob.has(selection.jobId)) {
      continue;
    }
    const created = await submitCandidateForAllocation({
      jobId: selection.jobId,
      allocationId: selection.allocationId,
      partnerId: input.partnerId,
      form: input.form,
      resumeRequired: false,
      allowSamePersonOtherJob: true,
    });
    if (!created.ok) {
      throw new Error(
        "Could not add this candidate to one of the selected jobs",
      );
    }
    alreadyOnJob.add(selection.jobId);
  }

  // Drop unreviewed sibling rows for jobs the partner deselected.
  for (const row of prior) {
    if (row.id === input.submission.id) {
      continue;
    }
    if (!samePersonIds.has(row.candidateId)) {
      continue;
    }
    if (selectedJobIds.has(row.jobId)) {
      continue;
    }
    if (!isUnreviewedByStaff(row)) {
      continue;
    }
    await deleteSubmission(row.id);
  }
}

/** Partner soft-control: remove an unreviewed mistaken upload. */
export async function deleteOwnUnreviewedSubmission(input: {
  submissionId: string;
  partnerId: string;
}): Promise<void> {
  const current = await findSubmissionById(input.submissionId);
  if (!current) {
    throw new Error("Candidate not found");
  }
  if (current.partnerId !== input.partnerId) {
    throw new Error("You can only remove candidates you submitted");
  }
  if (!isUnreviewedByStaff(current)) {
    throw new Error("This profile is locked after internal review");
  }
  await deleteSubmission(input.submissionId);
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
