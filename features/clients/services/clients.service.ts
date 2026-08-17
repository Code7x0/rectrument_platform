import { cache } from "react";

import { getRecords, type AirtableFields } from "@/lib/airtable/client";
import { asLinkedIds } from "@/lib/airtable/compat";
import { getOptionalEnv } from "@/lib/api/env";
import { buildRecordIdOrFormula } from "@/lib/airtable/record-id-formula";
import { listAccountManagerOptions } from "@/services/lookups";
import { listJobs } from "@/features/jobs/services";
import { isAssignableJobStatus } from "@/features/shared/entities/job.entity";
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
import {
  ACCOUNT_MANAGERS_TABLE_FIELDS,
  CLIENTS_TABLE_FIELDS,
} from "@/lib/airtable/fields";

/** Prefer ID formula when the set is small; otherwise one full Clients scan. */
const CLIENTS_BY_ID_THRESHOLD = 40;

async function listAccountManagerClientIds(
  accountManagerId: string,
): Promise<Set<string>> {
  const raw = getOptionalEnv("AIRTABLE_ACCOUNT_MANAGERS_TABLE")?.trim();
  const tableName = !raw || raw === "Account" ? "Account Managers" : raw;
  try {
    const records = await getRecords(tableName, {
      filterByFormula: `RECORD_ID() = '${accountManagerId.replace(/'/g, "\\'")}'`,
      fields: [ACCOUNT_MANAGERS_TABLE_FIELDS.clients],
      maxRecords: 1,
    });
    const fields = (records[0]?.fields ?? {}) as AirtableFields;
    return new Set(asLinkedIds(fields[ACCOUNT_MANAGERS_TABLE_FIELDS.clients]));
  } catch (error) {
    console.warn("[clients] AM.Clients reverse-link lookup failed", error);
    return new Set();
  }
}

/** True when AM id is linked on Clients.Account Owner (any position). */
export function clientOwnedByAccountManager(
  client: Pick<Client, "accountManagerId" | "accountManagerIds">,
  accountManagerId: string,
): boolean {
  const amId = accountManagerId.trim();
  if (!amId) {
    return false;
  }
  if (client.accountManagerIds?.includes(amId)) {
    return true;
  }
  return client.accountManagerId === amId;
}

/** Request-scoped full clients scan. */
const loadAllClientsCached = cache(async () =>
  findClients({
    sort: [{ field: CLIENTS_TABLE_FIELDS.name, direction: "asc" }],
  }),
);

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
  const { search, accountManagerId, ...airtableFilters } = filters;

  // Do not filter Account Owner by record id in Airtable formulas.
  // ARRAYJOIN({Account Owner}) returns primary-field names (e.g. "Lucifer"),
  // not rec… ids — FIND(recId, …) always misses and blanks AM dashboards.
  const formula = buildClientsFilterFormula({
    ...airtableFilters,
    accountManagerId: undefined,
  });

  const rows = formula
    ? await findClients({
        filterByFormula: formula,
        sort: [{ field: CLIENTS_TABLE_FIELDS.name, direction: "asc" }],
      })
    : await loadAllClientsCached();

  let enriched = await withAccountManagerNames(rows);
  if (accountManagerId?.trim()) {
    const amId = accountManagerId.trim();
    const reverseLinkedIds = await listAccountManagerClientIds(amId);
    enriched = enriched.filter(
      (client) =>
        clientOwnedByAccountManager(client, amId) ||
        reverseLinkedIds.has(client.id),
    );
  }

  return applySearch(enriched, search);
}

export const getClientById = cache(async function getClientById(
  clientId: string,
): Promise<Client | null> {
  const client = await findClientById(clientId);
  if (!client) {
    return null;
  }
  const [enriched] = await withAccountManagerNames([client]);
  return enriched ?? null;
});

/**
 * Fetch a small set of Clients by record id (request-scoped via sorted key).
 * Falls back to the full Clients scan when the set is large — one list is cheaper
 * than a huge OR() formula.
 */
export async function getClientsByIds(ids: string[]): Promise<Client[]> {
  const unique = [
    ...new Set(ids.map((id) => id.trim()).filter((id) => id.startsWith("rec"))),
  ].sort();
  if (unique.length === 0) {
    return [];
  }
  if (unique.length > CLIENTS_BY_ID_THRESHOLD) {
    const all = await listClients({ includeArchived: true });
    const wanted = new Set(unique);
    return all.filter((client) => wanted.has(client.id));
  }
  return getClientsByIdsCached(unique.join(","));
}

const getClientsByIdsCached = cache(async (key: string): Promise<Client[]> => {
  const unique = key.split(",").filter(Boolean);
  const formula = buildRecordIdOrFormula(unique);
  if (!formula) {
    return [];
  }
  const rows = await findClients({ filterByFormula: formula });
  return withAccountManagerNames(rows);
});

export async function createClient(input: CreateClientInput): Promise<Client> {
  const { allocateClientCodeForName } = await import(
    "@/features/shared/services/business-ids.service"
  );
  // Always system-allocate — never accept manual Client Codes on create.
  const clientCode = await allocateClientCodeForName({ name: input.name });

  const created = await insertClient(
    toAirtableCreateFields({
      ...input,
      clientCode,
    }),
  );
  const [client] = await withAccountManagerNames([created]);
  if (!client) {
    throw new Error("Failed to create client");
  }

  if (client.accountManagerId) {
    const { notifyAccountManagerAssignedToClient } = await import(
      "@/features/notifications/services/notification-events"
    );
    void notifyAccountManagerAssignedToClient({
      accountManagerId: client.accountManagerId,
      clientName: client.name,
      clientId: client.id,
    }).catch((error) => {
      console.error("[notifications] AM client assign failed", error);
    });
  }

  return client;
}

export async function updateClient(
  clientId: string,
  input: UpdateClientInput,
): Promise<Client> {
  const existing = await findClientById(clientId);
  const updated = await patchClient(clientId, toAirtableUpdateFields(input));
  const [client] = await withAccountManagerNames([updated]);
  if (!client) {
    throw new Error("Failed to update client");
  }

  if (input.accountManagerId !== undefined) {
    const previousAmId = existing?.accountManagerId ?? null;
    const nextAmId = client.accountManagerId;
    if (previousAmId !== nextAmId) {
      const {
        notifyAccountManagerAssignedToClient,
        notifyAccountManagerRemovedFromClient,
      } = await import(
        "@/features/notifications/services/notification-events"
      );
      if (previousAmId) {
        void notifyAccountManagerRemovedFromClient({
          accountManagerId: previousAmId,
          clientName: client.name,
          clientId,
        }).catch((error) => {
          console.error("[notifications] AM client unassign failed", error);
        });
      }
      if (nextAmId) {
        void notifyAccountManagerAssignedToClient({
          accountManagerId: nextAmId,
          clientName: client.name,
          clientId,
        }).catch((error) => {
          console.error("[notifications] AM client assign failed", error);
        });
      }
    }
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
 * Pass accountManagerId to scope jobs/candidates to that AM (no foreign bleed).
 */
export async function getClientWorkspaceStats(
  clientId: string,
  options: { accountManagerId?: string } = {},
): Promise<ClientWorkspaceStats> {
  const jobs = await listJobs({
    clientId,
    includeArchived: true,
    ...(options.accountManagerId
      ? { accountManagerId: options.accountManagerId }
      : {}),
  });

  const jobIds = new Set(jobs.map((j) => j.id));
  const submissions = await listSubmissions();
  const candidateIds = new Set(
    submissions
      .filter((s) => jobIds.has(s.jobId))
      .map((s) => s.candidateId),
  );

  const visibleJobs = jobs.filter((j) => j.status !== "archived");
  return {
    jobCount: visibleJobs.length,
    partnerCount: 0,
    candidateCount: candidateIds.size,
    activeRoleCount: visibleJobs.filter(
      (job) => isAssignableJobStatus(job.status),
    ).length,
  };
}
