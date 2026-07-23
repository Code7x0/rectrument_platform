import { findActiveAllocationsForPartner } from "@/features/tasks/repositories/tasks.repository";
import { getJobById } from "@/features/jobs/services";
import type { Allocation } from "@/features/allocations/types";
import type { Job, JobPriority } from "@/features/jobs/types";
import {
  PRIORITY_SORT_ORDER,
  type PartnerWorkTask,
} from "@/features/tasks/types";

function remainingProfiles(expected: number, submitted: number): number {
  return Math.max(0, expected - submitted);
}

function toPartnerWorkTask(
  allocation: Allocation,
  job: Job,
): PartnerWorkTask {
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
    expectedProfiles: allocation.expectedProfiles,
    submittedProfiles: allocation.profilesSubmitted,
    remainingProfiles: remainingProfiles(
      allocation.expectedProfiles,
      allocation.profilesSubmitted,
    ),
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
 * Sort: higher priority first, then more remaining profiles, then newer assign.
 */
export function sortPartnerWorkTasks(
  tasks: PartnerWorkTask[],
): PartnerWorkTask[] {
  return [...tasks].sort((a, b) => {
    const byPriority = priorityRank(a.priority) - priorityRank(b.priority);
    if (byPriority !== 0) {
      return byPriority;
    }

    const byRemaining = b.remainingProfiles - a.remainingProfiles;
    if (byRemaining !== 0) {
      return byRemaining;
    }

    const aDate = a.assignedDate ?? "";
    const bDate = b.assignedDate ?? "";
    return bDate.localeCompare(aDate);
  });
}

/**
 * Partner Work Queue — own active allocations only.
 * Feature 6 will open Submit Candidate from these tasks.
 */
export async function listPartnerWorkTasks(
  partnerId: string,
): Promise<PartnerWorkTask[]> {
  if (!partnerId) {
    return [];
  }

  const allocations = await findActiveAllocationsForPartner(partnerId);
  if (allocations.length === 0) {
    return [];
  }

  const uniqueJobIds = [...new Set(allocations.map((row) => row.jobId))];
  const jobs = await Promise.all(uniqueJobIds.map((id) => getJobById(id)));
  const jobMap = new Map(
    jobs.filter((job): job is Job => Boolean(job)).map((job) => [job.id, job]),
  );

  const tasks: PartnerWorkTask[] = [];

  for (const allocation of allocations) {
    const job = jobMap.get(allocation.jobId);
    if (!job) {
      continue;
    }
    tasks.push(toPartnerWorkTask(allocation, job));
  }

  return sortPartnerWorkTasks(tasks);
}
