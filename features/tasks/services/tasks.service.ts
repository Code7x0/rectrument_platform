import { findActiveAllocationsForPartner } from "@/features/tasks/repositories/tasks.repository";
import { getJobById } from "@/features/jobs/services";
import { listPartnerSubmissions } from "@/features/submissions/services";
import type { Allocation } from "@/features/allocations/types";
import type { Job, JobPriority, JobStatus } from "@/features/jobs/types";
import {
  PRIORITY_SORT_ORDER,
  type PartnerWorkTask,
} from "@/features/tasks/types";

/** Jobs partners can still work — closed/filled should leave the queue. */
const ASSIGNABLE_JOB_STATUSES: ReadonlySet<JobStatus> = new Set([
  "open",
  "on_hold",
]);

function remainingProfiles(expected: number, submitted: number): number {
  return Math.max(0, expected - submitted);
}

function toPartnerWorkTask(
  allocation: Allocation,
  job: Job,
  submittedProfiles: number,
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
    job,
  };
}

function priorityRank(priority: JobPriority | null): number {
  if (!priority) {
    return 99;
  }
  return PRIORITY_SORT_ORDER[priority];
}

/**
 * Sort Assigned Jobs by Airtable priority: High (then Urgent) first, then Medium, then Low.
 */
export function sortPartnerWorkTasks(
  tasks: PartnerWorkTask[],
): PartnerWorkTask[] {
  return [...tasks].sort((a, b) => {
    const byPriority = priorityRank(a.priority) - priorityRank(b.priority);
    if (byPriority !== 0) {
      return byPriority;
    }
    return (a.jobTitle ?? "").localeCompare(b.jobTitle ?? "");
  });
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

  const tasks: PartnerWorkTask[] = [];

  for (const allocation of allocations) {
    const job = jobMap.get(allocation.jobId);
    if (!job || !ASSIGNABLE_JOB_STATUSES.has(job.status)) {
      continue;
    }
    tasks.push(
      toPartnerWorkTask(
        allocation,
        job,
        submittedByJob.get(allocation.jobId) ?? 0,
      ),
    );
  }

  return sortPartnerWorkTasks(tasks);
}
