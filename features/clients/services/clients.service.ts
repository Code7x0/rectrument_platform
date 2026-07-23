import { listAccountManagerOptions } from "@/services/lookups";
import { listJobs } from "@/features/jobs/services";
import { listSubmissions } from "@/features/submissions/services";
import {
  findClientById,
  findClients,
  insertClient,
  patchClient,
  destroyClient,
} from "@/features/clients/repositories/clients.repository";
import {
  buildClientsFilterFormula,
  toAirtableCreateFields,
  toAirtableUpdateFields,
} from "@/features/clients/services/clients.mapper";
import type {
  Client,
  ClientListFilters,
  ClientWorkspaceStats,
  CreateClientInput,
  UpdateClientInput,
} from "@/features/clients/types";
import { CLIENTS_TABLE_FIELDS } from "@/lib/airtable/fields";

async function withAccountManagerNames(clients: Client[]): Promise<Client[]> {
  if (clients.length === 0) {
    return clients;
  }

  const managers = await listAccountManagerOptions();
  const map = new Map(managers.map((m) => [m.id, m.label]));

  return clients.map((client) => ({
    ...client,
    accountManagerName: client.accountManagerId
      ? (map.get(client.accountManagerId) ?? null)
      : null,
  }));
}

function applySearch(clients: Client[], search?: string): Client[] {
  if (!search?.trim()) {
    return clients;
  }
  const q = search.trim().toLowerCase();
  return clients.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      (c.clientCode?.toLowerCase().includes(q) ?? false) ||
      (c.industry?.toLowerCase().includes(q) ?? false) ||
      (c.primaryContact?.toLowerCase().includes(q) ?? false) ||
      (c.accountManagerName?.toLowerCase().includes(q) ?? false),
  );
}

export async function listClients(
  filters: ClientListFilters = {},
): Promise<Client[]> {
  const { search, ...airtableFilters } = filters;
  const formula = buildClientsFilterFormula(airtableFilters);

  const rows = await findClients({
    ...(formula ? { filterByFormula: formula } : {}),
    sort: [{ field: CLIENTS_TABLE_FIELDS.name, direction: "asc" }],
  });

  return applySearch(await withAccountManagerNames(rows), search);
}

export async function getClientById(clientId: string): Promise<Client | null> {
  const client = await findClientById(clientId);
  if (!client) {
    return null;
  }
  const [enriched] = await withAccountManagerNames([client]);
  return enriched ?? null;
}

export async function createClient(input: CreateClientInput): Promise<Client> {
  const created = await insertClient(toAirtableCreateFields(input));
  const [client] = await withAccountManagerNames([created]);
  if (!client) {
    throw new Error("Failed to create client");
  }
  return client;
}

export async function updateClient(
  clientId: string,
  input: UpdateClientInput,
): Promise<Client> {
  const updated = await patchClient(clientId, toAirtableUpdateFields(input));
  const [client] = await withAccountManagerNames([updated]);
  if (!client) {
    throw new Error("Failed to update client");
  }
  return client;
}

export async function archiveClient(clientId: string): Promise<Client> {
  return updateClient(clientId, { status: "archived" });
}

/** Permanently remove the client record from Airtable. */
export async function deleteClient(clientId: string): Promise<void> {
  const existing = await findClientById(clientId);
  if (!existing) {
    throw new Error("Client not found");
  }
  await destroyClient(clientId);
}

/**
 * Calculated workspace stats — never stored on the Client record.
 */
export async function getClientWorkspaceStats(
  clientId: string,
): Promise<ClientWorkspaceStats> {
  const jobs = await listJobs({
    clientId,
    includeArchived: true,
  });

  const jobIds = new Set(jobs.map((j) => j.id));
  const submissions = await listSubmissions();
  const candidateIds = new Set(
    submissions
      .filter((s) => jobIds.has(s.jobId))
      .map((s) => s.candidateId),
  );

  return {
    jobCount: jobs.filter((j) => j.status !== "archived").length,
    partnerCount: 0,
    candidateCount: candidateIds.size,
  };
}
