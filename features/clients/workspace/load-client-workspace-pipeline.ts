import { listAllocations } from "@/features/allocations/services";
import type { Allocation } from "@/features/allocations/types";
import type { Job } from "@/features/jobs/types";
import { listSubmissions } from "@/features/submissions/services";
import type { Submission } from "@/features/submissions/types";

/**
 * Load partners (allocations) and candidates (submissions) for a client's jobs.
 * Fetches per job so Airtable filters stay scoped — avoids full-table scans.
 */
export async function loadClientWorkspacePipeline(jobs: Job[]): Promise<{
  allocations: Allocation[];
  submissions: Submission[];
}> {
  if (jobs.length === 0) {
    return { allocations: [], submissions: [] };
  }

  const [allocationGroups, submissionGroups] = await Promise.all([
    Promise.all(
      jobs.map((job) =>
        listAllocations({
          jobId: job.id,
          includeArchived: true,
          includePartnerIdentity: true,
        }),
      ),
    ),
    Promise.all(jobs.map((job) => listSubmissions({ jobId: job.id }))),
  ]);

  return {
    allocations: allocationGroups.flat(),
    submissions: submissionGroups.flat(),
  };
}
