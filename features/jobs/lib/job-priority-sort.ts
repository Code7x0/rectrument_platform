import type { Job, JobPriority } from "@/features/jobs/types";

export const PRIORITY_SORT_ORDER: Record<JobPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function priorityRank(priority: JobPriority | null | undefined): number {
  if (!priority) {
    return 99;
  }
  return PRIORITY_SORT_ORDER[priority];
}

function jobOpenDateMs(
  job: Pick<Job, "postedDate" | "startDate" | "createdAt">,
): number {
  const raw = job.postedDate || job.startDate || job.createdAt;
  if (!raw) {
    return Number.POSITIVE_INFINITY;
  }
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
}

/**
 * Canonical Partner job ordering: Priority (Super High→Low), then open/posted date.
 */
export function compareJobsByPriorityThenOpenDate(
  a: Pick<Job, "priority" | "postedDate" | "startDate" | "createdAt" | "title">,
  b: Pick<Job, "priority" | "postedDate" | "startDate" | "createdAt" | "title">,
): number {
  const byPriority = priorityRank(a.priority) - priorityRank(b.priority);
  if (byPriority !== 0) {
    return byPriority;
  }
  const byDate = jobOpenDateMs(a) - jobOpenDateMs(b);
  if (byDate !== 0) {
    return byDate;
  }
  return (a.title ?? "").localeCompare(b.title ?? "");
}
