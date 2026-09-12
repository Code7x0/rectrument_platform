import { listActiveAllocationsForPartner } from "@/features/allocations/services";
import { compareJobsByPriorityThenOpenDate } from "@/features/jobs/lib/job-priority-sort";
import { listJobsByIds } from "@/features/jobs/services";
import { isClaimableJobStatus } from "@/features/shared/entities/job.entity";
import { listSubmissions } from "@/features/submissions/services";
import { getCachedAllJobs } from "@/lib/cache/crm-cache";

/**
 * Lightweight partner workspace fingerprint for /api/sync/pulse.
 * Detects priority, status, and submission changes without a full dashboard rebuild.
 */
export async function getPartnerWorkFingerprint(
  partnerId: string,
): Promise<string> {
  const [allocations, allJobs, submissions] = await Promise.all([
    listActiveAllocationsForPartner(partnerId),
    getCachedAllJobs(),
    listSubmissions({ partnerId, enrich: false }),
  ]);

  const allocatedJobIds = new Set(allocations.map((row) => row.jobId));
  const allocJobs = allocatedJobIds.size
    ? await listJobsByIds([...allocatedJobIds])
    : [];

  const allocPart = [...allocJobs]
    .sort(compareJobsByPriorityThenOpenDate)
    .map(
      (job) =>
        `${job.id}:${job.priority ?? ""}:${job.status}:${job.postedDate ?? job.createdAt ?? ""}`,
    )
    .join(",");

  const openPart = allJobs
    .filter(
      (job) =>
        isClaimableJobStatus(job.status) && !allocatedJobIds.has(job.id),
    )
    .sort(compareJobsByPriorityThenOpenDate)
    .slice(0, 15)
    .map(
      (job) =>
        `${job.id}:${job.priority ?? ""}:${job.postedDate ?? job.createdAt ?? ""}`,
    )
    .join(",");

  const recentSubmissions = [...submissions]
    .sort((a, b) =>
      (b.submissionDate ?? "").localeCompare(a.submissionDate ?? ""),
    )
    .slice(0, 10);

  const subPart = recentSubmissions
    .map(
      (row) =>
        `${row.id}:${row.airtableStatus ?? row.status}:${row.submissionDate ?? ""}`,
    )
    .join(",");

  return `a:${allocPart}|o:${openPart}|s:${subPart}`;
}
