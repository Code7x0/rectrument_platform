import { listActiveAllocationsForPartner } from "@/features/allocations/services";
import { getClientsByIds } from "@/features/clients/services";
import { listJobsByIds } from "@/features/jobs/services";
import type { PartnerClientView } from "@/features/shared/entities";

/**
 * Clients related to a partner's assigned jobs only.
 * Derived from Allocations/Jobs.Client — no Partners.Clients reverse link required.
 *
 * Fetches only allocated jobs + those clients (not full CRM tables).
 */
export async function listPartnerAssignedClients(
  partnerId: string,
): Promise<PartnerClientView[]> {
  const allocations = await listActiveAllocationsForPartner(partnerId);
  if (allocations.length === 0) {
    return [];
  }

  const jobIds = [
    ...new Set(allocations.map((row) => row.jobId).filter(Boolean)),
  ];
  const jobs = await listJobsByIds(jobIds);

  const jobsByClient = new Map<string, Array<{ id: string; title: string }>>();
  for (const job of jobs) {
    if (!job.clientId) {
      continue;
    }
    const rows = jobsByClient.get(job.clientId) ?? [];
    if (!rows.some((row) => row.id === job.id)) {
      rows.push({ id: job.id, title: job.title });
    }
    jobsByClient.set(job.clientId, rows);
  }

  const clientIds = [...jobsByClient.keys()];
  const clients = await getClientsByIds(clientIds);
  const clientMap = new Map(clients.map((client) => [client.id, client]));

  return clientIds
    .map((clientId) => clientMap.get(clientId))
    .filter((client): client is NonNullable<typeof client> => Boolean(client))
    .map((client) => {
      const assignedJobs = jobsByClient.get(client.id) ?? [];
      return {
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
        assignedJobs,
        assignedJobTitles: assignedJobs.map((row) => row.title),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
