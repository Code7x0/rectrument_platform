import type { Job } from "@/features/jobs/types";

/**
 * AM job visibility:
 * - Explicit per-job unassign ([RP_AM] none) → never visible.
 * - Client Account Owners see every job on their client (shared ownership).
 *   Creating/tagging a job for one co-owner must not hide it from the others.
 * - Non-owners: explicit per-job AM tag grants that job only.
 * - Non-owners: if they have ANY explicit job on a client, sibling unmarked
 *   jobs are NOT inherited (prevents “assign one job → whole client” bleed).
 */
export function filterJobsForAccountManager(
  originals: Job[],
  enriched: Job[],
  accountManagerId: string,
  clientOwnersById: Map<string, string[]>,
): Job[] {
  const explicitById = new Map(
    originals.map((job) => [
      job.id,
      job.accountManagerIds?.length
        ? job.accountManagerIds
        : job.accountManagerId
          ? [job.accountManagerId]
          : [],
    ]),
  );
  const unassignedIds = new Set(
    originals
      .filter((job) => job.accountManagerUnassigned)
      .map((job) => job.id),
  );
  const clientsWithExplicitAm = new Set(
    originals
      .filter((job) => {
        const ids =
          job.accountManagerIds?.length
            ? job.accountManagerIds
            : job.accountManagerId
              ? [job.accountManagerId]
              : [];
        return ids.includes(accountManagerId) && Boolean(job.clientId);
      })
      .map((job) => job.clientId as string),
  );

  return enriched.filter((job) => {
    if (unassignedIds.has(job.id)) {
      return false;
    }

    const owners = job.clientId
      ? (clientOwnersById.get(job.clientId) ?? [])
      : [];
    if (owners.includes(accountManagerId)) {
      return true;
    }

    const explicit = explicitById.get(job.id) ?? [];
    if (explicit.length > 0) {
      return explicit.includes(accountManagerId);
    }

    if (job.clientId && clientsWithExplicitAm.has(job.clientId)) {
      return false;
    }

    return (
      job.accountManagerId === accountManagerId ||
      (job.accountManagerIds?.includes(accountManagerId) ?? false)
    );
  });
}
