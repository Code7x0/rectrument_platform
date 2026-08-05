/**
 * Allocate / ensure business IDs against live Airtable data.
 */

import { findClientById } from "@/features/clients/repositories/clients.repository";
import { findClients } from "@/features/clients/repositories/clients.repository";
import { findJobs } from "@/features/jobs/repositories/jobs.repository";
import { findPartners } from "@/features/partners/repositories/partners.repository";
import {
  allocateUniqueAmCode,
  allocateUniqueCandidateCode,
  allocateUniqueClientCode,
  allocateUniquePartnerCode,
  buildAmCodeBase,
  buildCandidateCodeBase,
  buildClientCodeBase,
  buildPartnerCodeBase,
  formatJobCode,
  isValidAmCode,
  isValidCandidateCode,
  isValidClientCode,
  isValidPartnerCode,
  nextJobSequence,
  parseAmCodeMarker,
  upsertAmCodeMarker,
} from "@/lib/business-ids";
import {
  ACCOUNT_MANAGERS_TABLE_FIELDS,
  CANDIDATES_TABLE_FIELDS,
  CLIENTS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import { patchClient } from "@/features/clients/repositories/clients.repository";
import { getRecords, updateRecord } from "@/lib/airtable/client";
import { getAirtableTableName } from "@/lib/airtable/tables";
import { getOptionalEnv } from "@/lib/api/env";
import { asString, isClientCompatMode } from "@/lib/airtable/compat";

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

export async function listExistingCandidateCodes(
  excludeRecordId?: string,
): Promise<string[]> {
  const records = await getRecords(
    getAirtableTableName("candidatesTable"),
    { fields: [CANDIDATES_TABLE_FIELDS.candidateId] },
  );
  return records
    .filter((record) => record.id !== excludeRecordId)
    .map((record) => asString(record.fields[CANDIDATES_TABLE_FIELDS.candidateId]))
    .filter((code): code is string => Boolean(code && isValidCandidateCode(code)));
}

export async function allocateCandidateCodeForPerson(input: {
  fullName: string | null | undefined;
  phone: string | null | undefined;
  excludeRecordId?: string;
  existingCodes?: string[];
}): Promise<string> {
  const base = buildCandidateCodeBase(input.fullName, input.phone);
  const existing =
    input.existingCodes ??
    (await listExistingCandidateCodes(input.excludeRecordId));
  return allocateUniqueCandidateCode(base, existing);
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

function amTableName(): string {
  const raw = getOptionalEnv("AIRTABLE_ACCOUNT_MANAGERS_TABLE")?.trim();
  if (!raw || raw === "Account") {
    return "Account Managers";
  }
  return raw;
}

export async function listExistingAmCodes(
  excludeAmId?: string,
): Promise<string[]> {
  if (!isClientCompatMode() && !getOptionalEnv("AIRTABLE_ACCOUNT_MANAGERS_TABLE")) {
    return [];
  }
  const records = await getRecords(amTableName(), {});
  const codes: string[] = [];
  for (const record of records) {
    if (excludeAmId && record.id === excludeAmId) {
      continue;
    }
    const fromMarker = parseAmCodeMarker(
      asString(record.fields[ACCOUNT_MANAGERS_TABLE_FIELDS.comments]),
    );
    if (fromMarker) {
      codes.push(fromMarker);
    }
  }
  return codes;
}

export async function allocateAmCodeForPerson(input: {
  fullName: string | null | undefined;
  phone: string | null | undefined;
  excludeAmId?: string;
}): Promise<string> {
  const base = buildAmCodeBase(input.fullName, input.phone);
  const existing = await listExistingAmCodes(input.excludeAmId);
  return allocateUniqueAmCode(base, existing);
}

/**
 * Ensure Account Manager has a short business ID in Comments ([RP_AMCODE]).
 * Coexists with invite markers. No new Airtable columns.
 */
export async function ensureAccountManagerHasBusinessCode(input: {
  id: string;
  name: string | null | undefined;
  phone: string | null | undefined;
  comments: string | null | undefined;
}): Promise<string> {
  const expectedBase = buildAmCodeBase(input.name, input.phone);
  const expectedLetters = expectedBase.replace(/\d.*$/, "");
  const existing = parseAmCodeMarker(input.comments);
  if (existing && isValidAmCode(existing)) {
    const existingLetters = existing.replace(/\d.*$/, "");
    // Keep stable codes that still match the name-derived letter prefix.
    if (existingLetters === expectedLetters) {
      return existing;
    }
  }
  const amCode = await allocateAmCodeForPerson({
    fullName: input.name,
    phone: input.phone,
    excludeAmId: input.id,
  });
  const nextComments = upsertAmCodeMarker(input.comments, amCode);
  await updateRecord(amTableName(), input.id, {
    [ACCOUNT_MANAGERS_TABLE_FIELDS.comments]: nextComments,
  });
  return amCode;
}
