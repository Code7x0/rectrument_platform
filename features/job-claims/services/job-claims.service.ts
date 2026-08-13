import { allocatePartner } from "@/features/allocations/services";
import { listActiveAllocationsForPartner } from "@/features/allocations/services";
import { getClientById } from "@/features/clients/services";
import { getJobById, listJobs } from "@/features/jobs/services";
import { deriveJobWorkMode } from "@/features/jobs/lib/work-mode";
import { compareJobsByPriorityThenOpenDate } from "@/features/jobs/lib/job-priority-sort";
import {
  findActiveClaimForPartnerJob,
  findJobClaimById,
  insertJobClaim,
  listAllJobClaims,
  listJobClaimsForPartner,
  listPendingJobClaims,
  updateJobClaimStatus,
} from "@/features/job-claims/repositories/job-claims.repository";
import type {
  JobClaim,
  JobClaimReviewItem,
  PartnerAvailableJob,
  PartnerJobClaimUiState,
} from "@/features/job-claims/types";
import { getPartnerById } from "@/features/partners/services";
import {
  notifyJobClaimApproved,
  notifyJobClaimRejected,
  notifyJobClaimRequested,
} from "@/features/notifications/services/notification-events";
import type { Job } from "@/features/jobs/types";
import {
  isClaimableJobStatus,
  isClosedJobStatus,
} from "@/features/shared/entities/job.entity";

function formatDaysOfWorking(days: number | null | undefined): string | null {
  if (typeof days !== "number" || !Number.isFinite(days)) {
    return null;
  }
  return `${days} day${days === 1 ? "" : "s"}`;
}

/**
 * Strip all client identity from a job for Partner available-jobs responses.
 */
export function toPartnerAvailableJob(
  job: Job,
  options: {
    daysOfWorking: string | null;
    claimState: PartnerJobClaimUiState;
    claimId: string | null;
    claimRequestedAt: string | null;
    claimRejectionReason: string | null;
  },
): PartnerAvailableJob {
  return {
    id: job.id,
    jobCode: job.jobCode || null,
    title: job.title,
    location: job.location,
    experience: job.experience,
    workMode: deriveJobWorkMode(job.location, job.workMode),
    daysOfWorking: options.daysOfWorking,
    salary: job.salary,
    possiblePayout: job.possiblePayout,
    priority: job.priority,
    status: job.status,
    description: job.description,
    interviewProcess: job.interviewProcess,
    documents: job.documents.filter(
      (doc) =>
        doc.label === "Job Description" || doc.label === "Sample Profiling",
    ),
    claimState: options.claimState,
    claimId: options.claimId,
    claimRequestedAt: options.claimRequestedAt,
    claimRejectionReason: options.claimRejectionReason,
  };
}

async function loadWorkDaysByClientId(
  clientIds: string[],
): Promise<Map<string, number | null>> {
  const unique = [...new Set(clientIds.filter(Boolean))];
  const map = new Map<string, number | null>();
  await Promise.all(
    unique.map(async (clientId) => {
      try {
        const client = await getClientById(clientId);
        map.set(
          clientId,
          typeof client?.workDaysInWeek === "number"
            ? client.workDaysInWeek
            : null,
        );
      } catch {
        map.set(clientId, null);
      }
    }),
  );
  return map;
}

function claimUiStateForJob(
  jobId: string,
  allocatedJobIds: Set<string>,
  claims: JobClaim[],
): {
  claimState: PartnerJobClaimUiState;
  claimId: string | null;
  claimRequestedAt: string | null;
  claimRejectionReason: string | null;
} {
  if (allocatedJobIds.has(jobId)) {
    const approved = claims.find(
      (c) => c.jobId === jobId && c.status === "approved",
    );
    return {
      claimState: "approved",
      claimId: approved?.id ?? null,
      claimRequestedAt: approved?.requestedAt ?? null,
      claimRejectionReason: null,
    };
  }
  const pending = claims.find(
    (c) => c.jobId === jobId && c.status === "pending",
  );
  if (pending) {
    return {
      claimState: "pending",
      claimId: pending.id,
      claimRequestedAt: pending.requestedAt,
      claimRejectionReason: null,
    };
  }
  const rejected = claims
    .filter((c) => c.jobId === jobId && c.status === "rejected")
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];
  if (rejected) {
    return {
      claimState: "rejected",
      claimId: rejected.id,
      claimRequestedAt: rejected.requestedAt,
      claimRejectionReason: rejected.rejectionReason,
    };
  }
  return {
    claimState: "available",
    claimId: null,
    claimRequestedAt: null,
    claimRejectionReason: null,
  };
}

/**
 * Open jobs Partners may claim (excludes already-allocated jobs for this partner).
 * Client fields are never included in the returned DTOs.
 */
export async function listPartnerAvailableJobs(
  partnerId: string,
): Promise<PartnerAvailableJob[]> {
  const [jobs, allocations, claims] = await Promise.all([
    listJobs({ includeArchived: false }),
    listActiveAllocationsForPartner(partnerId),
    listJobClaimsForPartner(partnerId),
  ]);

  const allocatedJobIds = new Set(allocations.map((row) => row.jobId));
  const claimable = jobs.filter(
    (job) =>
      isClaimableJobStatus(job.status) && !allocatedJobIds.has(job.id),
  );

  const workDaysByClient = await loadWorkDaysByClientId(
    claimable
      .map((job) => job.clientId)
      .filter((id): id is string => Boolean(id)),
  );

  return [...claimable]
    .sort(compareJobsByPriorityThenOpenDate)
    .map((job) => {
      const claimMeta = claimUiStateForJob(job.id, allocatedJobIds, claims);
      const days =
        job.clientId != null
          ? formatDaysOfWorking(workDaysByClient.get(job.clientId) ?? null)
          : null;
      return toPartnerAvailableJob(job, {
        daysOfWorking: days,
        ...claimMeta,
      });
    });
}

export async function getPartnerAvailableJob(
  partnerId: string,
  jobId: string,
): Promise<PartnerAvailableJob | null> {
  const jobs = await listPartnerAvailableJobs(partnerId);
  return jobs.find((job) => job.id === jobId) ?? null;
}

export function isJobClaimable(job: Pick<Job, "status">): boolean {
  return isClaimableJobStatus(job.status);
}

/**
 * Partner creates a pending claim. Does NOT create an Airtable allocation.
 */
export async function createPartnerJobClaim(input: {
  partnerId: string;
  jobId: string;
}): Promise<JobClaim> {
  const job = await getJobById(input.jobId);
  if (!job) {
    throw new Error("Job not found");
  }
  if (!isJobClaimable(job)) {
    throw new Error("This job is not available to claim");
  }

  const allocations = await listActiveAllocationsForPartner(input.partnerId);
  if (allocations.some((row) => row.jobId === input.jobId)) {
    throw new Error("This job is already assigned to you");
  }

  const existing = await findActiveClaimForPartnerJob(
    input.partnerId,
    input.jobId,
  );
  if (existing?.status === "pending") {
    throw new Error("You already have a pending claim for this job");
  }
  if (existing?.status === "approved") {
    throw new Error("This job is already assigned to you");
  }

  const accountManagerId = job.accountManagerId;
  const claim = await insertJobClaim({
    partnerId: input.partnerId,
    jobId: input.jobId,
    accountManagerId,
  });

  const partner = await getPartnerById(input.partnerId);
  notifyJobClaimRequested({
    accountManagerId,
    partnerId: input.partnerId,
    partnerLabel:
      partner?.contactName?.trim() ||
      partner?.companyName?.trim() ||
      partner?.partnerCode ||
      "Talent Partner",
    jobTitle: job.title,
    jobCode: job.jobCode,
    claimId: claim.id,
  });

  return claim;
}

export async function listJobClaimsForReview(options: {
  /** When set, only claims for these job ids (AM scope). */
  jobIds?: string[] | null;
}): Promise<JobClaimReviewItem[]> {
  const claims = await listAllJobClaims();
  let scoped = claims;
  if (options.jobIds) {
    const allowed = new Set(options.jobIds);
    scoped = claims.filter((claim) => allowed.has(claim.jobId));
  }

  const partnerIds = [...new Set(scoped.map((c) => c.partnerId))];
  const jobIds = [...new Set(scoped.map((c) => c.jobId))];
  const [partners, jobs] = await Promise.all([
    Promise.all(partnerIds.map((id) => getPartnerById(id))),
    Promise.all(jobIds.map((id) => getJobById(id))),
  ]);
  const partnerMap = new Map(
    partners
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map((row) => [row.id, row]),
  );
  const jobMap = new Map(
    jobs
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map((row) => [row.id, row]),
  );

  const items: JobClaimReviewItem[] = [];
  for (const claim of scoped) {
    const job = jobMap.get(claim.jobId);
    const partner = partnerMap.get(claim.partnerId);
    if (!job || !partner) {
      continue;
    }
    items.push({
      claim,
      jobTitle: job.title,
      jobCode: job.jobCode || null,
      partnerCode: partner.partnerCode ?? "—",
      partnerName:
        partner.contactName?.trim() || partner.companyName?.trim() || null,
      specialization: partner.specialization,
      skills: partner.skills ?? null,
      experience: partner.experience ?? null,
    });
  }

  return items.sort((a, b) => {
    if (a.claim.status === "pending" && b.claim.status !== "pending") {
      return -1;
    }
    if (b.claim.status === "pending" && a.claim.status !== "pending") {
      return 1;
    }
    return b.claim.requestedAt.localeCompare(a.claim.requestedAt);
  });
}

export async function listJobClaimsForAccountManager(
  accountManagerId: string,
): Promise<JobClaimReviewItem[]> {
  const { listAccountManagerJobIds } = await import("@/lib/auth/scope");
  const jobIds = await listAccountManagerJobIds(accountManagerId);
  // Also include pending claims explicitly routed to this AM (job may lack owner tag).
  const all = await listJobClaimsForReview({});
  const owned = new Set(jobIds);
  return all.filter(
    (item) =>
      owned.has(item.claim.jobId) ||
      item.claim.accountManagerId === accountManagerId,
  );
}

export async function listJobClaimsForAdmin(): Promise<JobClaimReviewItem[]> {
  return listJobClaimsForReview({});
}

/**
 * Approve pending claim → create existing Airtable allocation → unlock client via allocation scope.
 */
export async function approveJobClaim(input: {
  claimId: string;
  reviewerUserId: string;
  accountManagerId?: string | null;
}): Promise<{ claim: JobClaim; allocationId: string }> {
  const claim = await findJobClaimById(input.claimId);
  if (!claim) {
    throw new Error("Claim not found");
  }
  if (claim.status !== "pending") {
    throw new Error("Only pending claims can be approved");
  }

  const job = await getJobById(claim.jobId);
  if (!job) {
    throw new Error("Job not found");
  }
  if (isClosedJobStatus(job.status)) {
    throw new Error("This job is no longer claimable");
  }

  const existing = await listActiveAllocationsForPartner(claim.partnerId);
  const already = existing.find((row) => row.jobId === claim.jobId);
  let allocationId = already?.id ?? null;

  if (!allocationId) {
    const allocation = await allocatePartner({
      jobId: claim.jobId,
      partnerId: claim.partnerId,
      accountManagerId:
        input.accountManagerId ??
        claim.accountManagerId ??
        job.accountManagerId ??
        undefined,
      assignedById: input.reviewerUserId,
      expectedProfiles: 1,
      status: "assigned",
      notes: `Partner claim ${claim.id} approved`,
    });
    allocationId = allocation.id;
  }

  const updated = await updateJobClaimStatus(claim.id, {
    status: "approved",
    reviewedByUserId: input.reviewerUserId,
    allocationId,
  });

  notifyJobClaimApproved({
    partnerId: claim.partnerId,
    jobTitle: job.title,
    jobCode: job.jobCode,
    claimId: claim.id,
  });

  return { claim: updated, allocationId };
}

export async function rejectJobClaim(input: {
  claimId: string;
  reviewerUserId: string;
  reason?: string | null;
}): Promise<JobClaim> {
  const claim = await findJobClaimById(input.claimId);
  if (!claim) {
    throw new Error("Claim not found");
  }
  if (claim.status !== "pending") {
    throw new Error("Only pending claims can be rejected");
  }

  const updated = await updateJobClaimStatus(claim.id, {
    status: "rejected",
    reviewedByUserId: input.reviewerUserId,
    rejectionReason: input.reason ?? null,
  });

  const job = await getJobById(claim.jobId);
  notifyJobClaimRejected({
    partnerId: claim.partnerId,
    jobTitle: job?.title ?? "Job",
    jobCode: job?.jobCode,
    claimId: claim.id,
    reason: input.reason ?? null,
  });

  return updated;
}

export async function countPendingClaims(): Promise<number> {
  const pending = await listPendingJobClaims();
  return pending.length;
}
