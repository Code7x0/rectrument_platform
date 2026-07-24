/**
 * Allocate / ensure business IDs against live Airtable data.
 */

import { findClientById } from "@/features/clients/repositories/clients.repository";
import { findJobs } from "@/features/jobs/repositories/jobs.repository";
import { findPartners } from "@/features/partners/repositories/partners.repository";
import { JOBS_TABLE_FIELDS } from "@/lib/airtable/fields";
import {
  allocateUniquePartnerCode,
  buildPartnerCodeBase,
  formatJobCode,
  isValidPartnerCode,
  nextJobSequence,
} from "@/lib/business-ids";

export async function listExistingPartnerCodes(
  excludePartnerId?: string,
): Promise<string[]> {
  const partners = await findPartners({});
  return partners
    .filter((p) => p.id !== excludePartnerId)
    .map((p) => p.partnerCode)
    .filter((code): code is string => Boolean(code));
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
  const client = await findClientById(clientRecordId);
  if (!client?.clientCode?.trim()) {
    throw new Error(
      "Client is missing a Client ID (business code). Set Client ID in Airtable before creating jobs.",
    );
  }

  const clientCode = client.clientCode.trim().toUpperCase();
  const jobs = await findJobs({
    filterByFormula: `FIND('${clientRecordId}', ARRAYJOIN({${JOBS_TABLE_FIELDS.client}}))`,
  });

  // Also scan all job codes in case marker/field exists but filter misses orphans
  const allJobs = jobs.length > 0 ? jobs : await findJobs({});
  const codes = allJobs
    .filter((j) => j.clientId === clientRecordId || j.jobCode.startsWith(`${clientCode}_`))
    .map((j) => j.jobCode)
    .filter(Boolean);

  const sequence = nextJobSequence(clientCode, codes);
  return { clientCode, jobCode: formatJobCode(clientCode, sequence) };
}
