/**
 * Allocate / ensure business IDs against live Airtable data.
 */

import { findClientById } from "@/features/clients/repositories/clients.repository";
import { findClients } from "@/features/clients/repositories/clients.repository";
import { findJobs } from "@/features/jobs/repositories/jobs.repository";
import { findPartners } from "@/features/partners/repositories/partners.repository";
import {
  allocateUniqueClientCode,
  allocateUniquePartnerCode,
  buildClientCodeBase,
  buildPartnerCodeBase,
  formatJobCode,
  isValidClientCode,
  isValidPartnerCode,
  nextJobSequence,
} from "@/lib/business-ids";
import { CLIENTS_TABLE_FIELDS } from "@/lib/airtable/fields";
import { patchClient } from "@/features/clients/repositories/clients.repository";

export async function listExistingPartnerCodes(
  excludePartnerId?: string,
): Promise<string[]> {
  const partners = await findPartners({});
  return partners
    .filter((p) => p.id !== excludePartnerId)
    .map((p) => p.partnerCode)
    .filter((code): code is string => Boolean(code));
}

export async function listExistingClientCodes(
  excludeClientId?: string,
): Promise<string[]> {
  const clients = await findClients({});
  return clients
    .filter((c) => c.id !== excludeClientId)
    .map((c) => c.clientCode)
    .filter((code): code is string => Boolean(code?.trim()));
}

export async function allocateClientCodeForName(input: {
  name: string;
  excludeClientId?: string;
}): Promise<string> {
  const base = buildClientCodeBase(input.name);
  const existing = await listExistingClientCodes(input.excludeClientId);
  return allocateUniqueClientCode(base, existing);
}

export async function ensureClientHasBusinessCode(client: {
  id: string;
  name: string;
  clientCode: string | null;
}): Promise<string> {
  if (isValidClientCode(client.clientCode)) {
    return client.clientCode!.trim().toUpperCase();
  }
  const clientCode = await allocateClientCodeForName({
    name: client.name,
    excludeClientId: client.id,
  });
  await patchClient(client.id, {
    [CLIENTS_TABLE_FIELDS.clientId]: clientCode,
  });
  return clientCode;
}

export async function allocatePartnerCodeForPerson(input: {
  fullName: string | null | undefined;
  phone: string | null | undefined;
  excludePartnerId?: string;
}): Promise<string> {
  const base = buildPartnerCodeBase(input.fullName, input.phone);
  const existing = await listExistingPartnerCodes(input.excludePartnerId);
  return allocateUniquePartnerCode(base, existing);
}

export async function ensurePartnerHasBusinessCode(partner: {
  id: string;
  partnerCode: string | null;
  contactName: string | null;
  companyName: string;
  phone: string | null;
}): Promise<string | null> {
  if (isValidPartnerCode(partner.partnerCode)) {
    return partner.partnerCode!.trim().toUpperCase();
  }
  return allocatePartnerCodeForPerson({
    fullName: partner.contactName ?? partner.companyName,
    phone: partner.phone,
    excludePartnerId: partner.id,
  });
}

export async function allocateNextJobCodeForClient(
  clientRecordId: string,
): Promise<{ clientCode: string; jobCode: string }> {
  let client = await findClientById(clientRecordId);
  if (!client) {
    throw new Error("Client not found");
  }

  let clientCode = client.clientCode?.trim() ?? "";
  if (!isValidClientCode(clientCode)) {
    clientCode = await ensureClientHasBusinessCode(client);
    client = (await findClientById(clientRecordId)) ?? client;
  }
  clientCode = clientCode.trim().toUpperCase();

  // ARRAYJOIN({Client}) returns client names, not record ids — filter in memory.
  const allJobs = await findJobs({});
  const codes = allJobs
    .filter(
      (j) =>
        j.clientId === clientRecordId ||
        j.jobCode.startsWith(`${clientCode}_`),
    )
    .map((j) => j.jobCode)
    .filter(Boolean);

  const sequence = nextJobSequence(clientCode, codes);
  return { clientCode, jobCode: formatJobCode(clientCode, sequence) };
}
