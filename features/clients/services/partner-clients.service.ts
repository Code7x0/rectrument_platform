import { listActiveAllocationsForPartner } from "@/features/allocations/services";
import { getClientById } from "@/features/clients/services";
import { listJobs } from "@/features/jobs/services";
import type { PartnerClientView } from "@/features/shared/entities";

/**
 * Clients related to a partner's assigned jobs only.
 * Derived from Allocations/Jobs.Client — no Partners.Clients reverse link required.
 */
export async function listPartnerAssignedClients(
  partnerId: string,
): Promise<PartnerClientView[]> {
  const allocations = await listActiveAllocationsForPartner(partnerId);
  if (allocations.length === 0) {
    return [];
  }

  const jobIds = [...new Set(allocations.map((row) => row.jobId))];
  const jobs = await listJobs({ includeArchived: true });
  const jobMap = new Map(jobs.map((job) => [job.id, job]));

  const titlesByClient = new Map<string, string[]>();
  for (const jobId of jobIds) {
    const job = jobMap.get(jobId);
    if (!job?.clientId) {
      continue;
    }
    const titles = titlesByClient.get(job.clientId) ?? [];
    if (job.title && !titles.includes(job.title)) {
      titles.push(job.title);
    }
    titlesByClient.set(job.clientId, titles);
  }

  const clientIds = [...titlesByClient.keys()];
  const clients = await Promise.all(
    clientIds.map((id) => getClientById(id).catch(() => null)),
  );

  return clients
    .filter((client): client is NonNullable<typeof client> => Boolean(client))
    .map((client) => ({
      id: client.id,
      clientCode: client.clientCode,
      name: client.name,
      industry: client.industry,
      website: client.website,
      status: client.status,
      primaryAddress: client.primaryAddress ?? null,
      addresses: client.addresses ?? null,
      employeeSize: client.employeeSize ?? null,
      modeOfWork: client.modeOfWork ?? null,
      workDaysInWeek: client.workDaysInWeek ?? null,
      notes: client.notes ?? null,
      briefDeck: client.briefDeck ?? [],
      assignedJobTitles: titlesByClient.get(client.id) ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
