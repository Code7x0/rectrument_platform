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
import type { Candidate } from "@/features/candidates/types";
import type { CandidateFormValues } from "@/features/candidates/schemas/candidate.schema";
import { getJobById } from "@/features/jobs/services";
import {
  findSubmissionById,
  findSubmissions,
  insertSubmission,
  patchSubmission,
} from "@/features/submissions/repositories/submissions.repository";
import {
  buildSubmissionsFilterFormula,
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
  DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE,
  SUBMISSIONS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import { listPartnerOptions } from "@/services/lookups";

async function withEnrichment(
  submissions: Submission[],
): Promise<Submission[]> {
  if (submissions.length === 0) {
    return submissions;
  }

  const uniqueCandidateIds = [...new Set(submissions.map((s) => s.candidateId))];
  const uniqueJobIds = [...new Set(submissions.map((s) => s.jobId))];

  const [candidates, jobs, partners] = await Promise.all([
    Promise.all(uniqueCandidateIds.map((id) => getCandidateById(id))),
    Promise.all(uniqueJobIds.map((id) => getJobById(id))),
    listPartnerOptions(),
  ]);

  const candidateMap = new Map(
    candidates
      .filter((c): c is Candidate => Boolean(c))
      .map((c) => [c.id, c]),
  );
  const jobMap = new Map(
    jobs.filter((j): j is NonNullable<typeof j> => Boolean(j)).map((j) => [j.id, j]),
  );
  const partnerMap = new Map(
    partners.map((p) => [p.id, { label: p.label, code: p.code ?? null }]),
  );

  return submissions.map((row) => {
    const candidate = candidateMap.get(row.candidateId);
    const job = jobMap.get(row.jobId);
    const partner = partnerMap.get(row.partnerId);
    return {
      ...row,
      candidateName: candidate?.fullName ?? null,
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

export async function listSubmissions(
  filters: SubmissionListFilters = {},
): Promise<Submission[]> {
  const formula = buildSubmissionsFilterFormula({
    partnerId: filters.partnerId,
    jobId: filters.jobId,
    allocationId: filters.allocationId,
  });

  const rows = await findSubmissions({
    ...(formula ? { filterByFormula: formula } : {}),
    sort: [
      { field: SUBMISSIONS_TABLE_FIELDS.submissionDate, direction: "desc" },
    ],
  });

  return withEnrichment(rows);
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
 */
export async function listReviewQueueSubmissions(): Promise<Submission[]> {
  const rows = await listSubmissions();
  const open = rows.filter((row) =>
    REVIEWABLE_SUBMISSION_STATUSES.includes(row.status),
  );

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

  let candidate: Candidate;
  let reusedCandidate = false;

  if (payload.existingCandidateId) {
    const existing = await getCandidateById(payload.existingCandidateId);
    if (!existing) {
      throw new Error("Existing candidate not found");
    }
    candidate = existing;
    reusedCandidate = true;

    if (payload.resumeUpload) {
      candidate = await attachResumeToCandidate(
        candidate.id,
        payload.resumeUpload,
      );
    }
  } else {
    const duplicates = await findDuplicateCandidates({
      email: payload.form.email,
      phone: payload.form.phone,
    });

    if (duplicates.length > 0) {
      return { ok: false, reason: "duplicate", duplicates };
    }

    if (payload.resumeRequired !== false && !payload.resumeUpload) {
      throw new Error("Resume is required for new candidates");
    }

    // Locked Candidates schema has no Company / Experience / Skills columns —
    // fold them into Screening Matrix Notes so partner input is not lost.
    const foldedNotes = [
      payload.form.remarks?.trim() || null,
      payload.form.currentCompany?.trim()
        ? `Company: ${payload.form.currentCompany.trim()}`
        : null,
      payload.form.experience?.trim()
        ? `Experience: ${payload.form.experience.trim()}`
        : null,
      payload.form.skills?.trim()
        ? `Skills: ${payload.form.skills.trim()}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    candidate = await createCandidate({
      fullName: payload.form.fullName,
      email: payload.form.email,
      phone: payload.form.phone,
      currentCompany: payload.form.currentCompany || undefined,
      currentLocation: payload.form.currentLocation || undefined,
      experience: payload.form.experience || undefined,
      currentCtc: payload.form.currentCtc || undefined,
      expectedCtc: payload.form.expectedCtc || undefined,
      noticePeriod: payload.form.noticePeriod || undefined,
      skills: parseSkillsInput(payload.form.skills),
      remarks: foldedNotes || undefined,
    });

    if (payload.resumeUpload) {
      candidate = await attachResumeToCandidate(
        candidate.id,
        payload.resumeUpload,
      );
    }
  }

  const existingForJob = await listSubmissions({
    partnerId: payload.partnerId,
    jobId: payload.jobId,
    allocationId: payload.allocationId,
  });
  const alreadySubmitted = existingForJob.some(
    (row) => row.candidateId === candidate.id,
  );
  if (alreadySubmitted) {
    throw new Error("This candidate was already submitted for this allocation");
  }

  const submissionRemarks = [
    payload.form.remarks?.trim() || null,
    payload.form.currentCompany?.trim()
      ? `Company: ${payload.form.currentCompany.trim()}`
      : null,
    payload.form.experience?.trim()
      ? `Experience: ${payload.form.experience.trim()}`
      : null,
    payload.form.skills?.trim()
      ? `Skills: ${payload.form.skills.trim()}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const submission = await insertSubmission(
    toAirtableCreateFields({
      candidateId: candidate.id,
      jobId: payload.jobId,
      allocationId: payload.allocationId,
      partnerId: payload.partnerId,
      status: "submitted",
      remarks: submissionRemarks || undefined,
    }),
  );

  try {
    const { ensurePayoutForSubmission } = await import(
      "@/features/payouts/services/payouts.service"
    );
    await ensurePayoutForSubmission(submission);
  } catch (error) {
    // Payout ledger is optional on the client CRM base — never fail submit.
    console.error("Payout create skipped after submission", error);
  }

  const nextCount = allocation.profilesSubmitted + 1;
  await updateAllocation(allocation.id, {
    profilesSubmitted: nextCount,
    status: allocation.status === "assigned" ? "working" : allocation.status,
  });

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

  return {
    ok: true,
    submission,
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
