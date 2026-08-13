import { findActiveAllocationsForPartner } from "@/features/tasks/repositories/tasks.repository";
import { getJobById } from "@/features/jobs/services";
import { compareJobsByPriorityThenOpenDate } from "@/features/jobs/lib/job-priority-sort";
import { listPartnerSubmissions } from "@/features/submissions/services";
import type { Allocation } from "@/features/allocations/types";
import type { Job } from "@/features/jobs/types";
import { isAssignableJobStatus } from "@/features/shared/entities/job.entity";
import type { PartnerWorkTask } from "@/features/tasks/types";

function remainingProfiles(expected: number, submitted: number): number {
  return Math.max(0, expected - submitted);
}

function toPartnerWorkTask(
  allocation: Allocation,
  job: Job,
  submittedProfiles: number,
  workDaysInWeek: number | null,
): PartnerWorkTask {
  const expectedProfiles = Math.max(1, allocation.expectedProfiles || 1);
  return {
    id: allocation.id,
    kind: "partner_allocation",
    audience: "partner",
    allocationId: allocation.id,
    allocationStatus: allocation.status,
    jobId: job.id,
    jobTitle: job.title,
    jobCode: job.jobCode,
    clientName: job.clientName,
    location: job.location,
    experience: job.experience,
    priority: job.priority,
    expectedProfiles,
    submittedProfiles,
    remainingProfiles: remainingProfiles(expectedProfiles, submittedProfiles),
    assignedDate: allocation.assignedDate,
    workDaysInWeek,
    job,
  };
}

/**
 * Sort Assigned Jobs by Airtable priority (Super High/Urgent first), then job open date.
 */
export function sortPartnerWorkTasks(
  tasks: PartnerWorkTask[],
): PartnerWorkTask[] {
  return [...tasks].sort((a, b) =>
    compareJobsByPriorityThenOpenDate(a.job, b.job),
  );
}

/**
 * Partner Work Queue — own active allocations on open/on-hold jobs only.
 * Submitted counts come from Candidates (job_partners has no counters).
 */
export async function listPartnerWorkTasks(
  partnerId: string,
): Promise<PartnerWorkTask[]> {
  if (!partnerId) {
    return [];
  }

  const [allocations, submissions] = await Promise.all([
    findActiveAllocationsForPartner(partnerId),
    listPartnerSubmissions(partnerId),
  ]);

  if (allocations.length === 0) {
    return [];
  }

  const submittedByJob = new Map<string, number>();
  for (const row of submissions) {
    submittedByJob.set(
      row.jobId,
      (submittedByJob.get(row.jobId) ?? 0) + 1,
    );
  }

  const jobIds = [...new Set(allocations.map((allocation) => allocation.jobId))];
  const jobResults = await Promise.all(jobIds.map((jobId) => getJobById(jobId)));
  const jobMap = new Map(
    jobResults
      .filter((job): job is Job => job !== null)
      .map((job) => [job.id, job]),
  );

  const clientIds = [
    ...new Set(
      [...jobMap.values()]
        .map((job) => job.clientId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const { getClientById } = await import("@/features/clients/services");
  const clientRows = await Promise.all(
    clientIds.map((id) => getClientById(id).catch(() => null)),
  );
  const workDaysByClientId = new Map<string, number | null>();
  for (let index = 0; index < clientIds.length; index += 1) {
    const clientId = clientIds[index]!;
    const client = clientRows[index];
    workDaysByClientId.set(
      clientId,
      typeof client?.workDaysInWeek === "number" ? client.workDaysInWeek : null,
    );
  }

  const tasks: PartnerWorkTask[] = [];

  for (const allocation of allocations) {
    const job = jobMap.get(allocation.jobId);
    if (!job || !isAssignableJobStatus(job.status)) {
      continue;
    }
    const workDaysInWeek = job.clientId
      ? (workDaysByClientId.get(job.clientId) ?? null)
      : null;
    tasks.push(
      toPartnerWorkTask(
        allocation,
        job,
        submittedByJob.get(allocation.jobId) ?? 0,
        workDaysInWeek,
      ),
    );
  }

  return sortPartnerWorkTasks(tasks);
}
