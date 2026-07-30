import { listAllocations } from "@/features/allocations/services";
import type { Allocation } from "@/features/allocations/types";
import type { Job } from "@/features/jobs/types";
import { listSubmissions } from "@/features/submissions/services";
import type { Submission } from "@/features/submissions/types";

/**
 * Load partners (allocations) and candidates (submissions) for a client's jobs.
 * One allocations scan + one submissions scan (filtered in memory by job ids) —
 * never N per-job full-table Airtable fetches.
 */
export async function loadClientWorkspacePipeline(
  jobs: Job[],
  options?: { includePartnerIdentity?: boolean },
): Promise<{
  allocations: Allocation[];
  submissions: Submission[];
}> {
  if (jobs.length === 0) {
    return { allocations: [], submissions: [] };
  }

  const includePartnerIdentity = options?.includePartnerIdentity ?? false;
  const jobIds = jobs.map((job) => job.id);
  const allowed = new Set(jobIds);

  const [allocations, submissions] = await Promise.all([
    listAllocations({
      jobIds,
      includeArchived: true,
      includePartnerIdentity,
    }),
    listSubmissions({ includePartnerIdentity }).then((rows) =>
      rows.filter((row) => allowed.has(row.jobId)),
    ),
  ]);

  return { allocations, submissions };
}
