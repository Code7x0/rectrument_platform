import type { AppSession } from "@/types";
import {
  resolveAccountManagerScopeId,
  resolvePartnerScopeId,
} from "@/lib/auth";
import { getClientById, clientOwnedByAccountManager } from "@/features/clients/services";
import { getJobById } from "@/features/jobs/services";
import { getAllocationById } from "@/features/allocations/services";
import { getSubmissionById } from "@/features/submissions/services";

export class ScopeDeniedError extends Error {
  constructor(message = "You do not have access to this record") {
    super(message);
    this.name = "ScopeDeniedError";
  }
}

export function isElevatedStaff(session: AppSession): boolean {
  return session.role === "admin" || session.role === "super_admin";
}

/**
 * Resolve AM-owned job ids (via Clients.Account Owner enrichment on Jobs).
 */
export async function listAccountManagerJobIds(
  accountManagerId: string,
): Promise<string[]> {
  const { listJobs } = await import("@/features/jobs/services");
  const jobs = await listJobs({
    accountManagerId,
    includeArchived: true,
  });
  return jobs.map((job) => job.id);
}

export async function assertAccountManagerOwnsClient(
  session: AppSession,
  clientId: string,
): Promise<void> {
  if (isElevatedStaff(session)) {
    return;
  }
  const amId = resolveAccountManagerScopeId(session);
  if (!amId || session.role !== "account_manager") {
    throw new ScopeDeniedError();
  }
  const client = await getClientById(clientId);
  if (!client || !clientOwnedByAccountManager(client, amId)) {
    throw new ScopeDeniedError("Client is outside your assignment");
  }
}

export async function assertAccountManagerOwnsJob(
  session: AppSession,
  jobId: string,
): Promise<void> {
  if (isElevatedStaff(session)) {
    return;
  }
  const amId = resolveAccountManagerScopeId(session);
  if (!amId || session.role !== "account_manager") {
    throw new ScopeDeniedError();
  }
  const job = await getJobById(jobId);
  if (!job || job.accountManagerId !== amId) {
    throw new ScopeDeniedError("Job is outside your assignment");
  }
}

export async function assertAccountManagerOwnsAllocation(
  session: AppSession,
  allocationId: string,
): Promise<void> {
  if (isElevatedStaff(session)) {
    return;
  }
  const allocation = await getAllocationById(allocationId);
  if (!allocation) {
    throw new ScopeDeniedError("Allocation not found");
  }
  await assertAccountManagerOwnsJob(session, allocation.jobId);
}

export async function assertAccountManagerOwnsSubmission(
  session: AppSession,
  submissionId: string,
): Promise<void> {
  if (isElevatedStaff(session)) {
    return;
  }
  const submission = await getSubmissionById(submissionId);
  if (!submission) {
    throw new ScopeDeniedError("Submission not found");
  }
  await assertAccountManagerOwnsJob(session, submission.jobId);
}

export async function assertPartnerOwnsAllocation(
  session: AppSession,
  allocationId: string,
): Promise<void> {
  if (isElevatedStaff(session)) {
    return;
  }
  const partnerId = resolvePartnerScopeId(session);
  if (!partnerId || session.role !== "partner") {
    throw new ScopeDeniedError();
  }
  const allocation = await getAllocationById(allocationId);
  if (!allocation || allocation.partnerId !== partnerId) {
    throw new ScopeDeniedError("Allocation is not assigned to you");
  }
}

export async function assertPartnerOwnsJob(
  session: AppSession,
  jobId: string,
): Promise<void> {
  if (isElevatedStaff(session)) {
    return;
  }
  const partnerId = resolvePartnerScopeId(session);
  if (!partnerId || session.role !== "partner") {
    throw new ScopeDeniedError();
  }
  const { listAllocations } = await import("@/features/allocations/services");
  const { ACTIVE_ALLOCATION_STATUSES } = await import(
    "@/features/shared/entities"
  );
  const rows = await listAllocations({
    partnerId,
    jobId,
    includeArchived: false,
  });
  const active = rows.some((row) =>
    ACTIVE_ALLOCATION_STATUSES.includes(row.status),
  );
  if (!active) {
    throw new ScopeDeniedError(
      "You are not assigned to this job (or the assignment was removed).",
    );
  }
}
