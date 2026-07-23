import {
  createRecord,
  findRecord,
  getRecords,
  updateRecord,
  type AirtableFields,
  type AirtableListOptions,
} from "@/lib/airtable/client";
import { getAirtableTableName } from "@/lib/airtable/tables";
import { mapPartnerRecord } from "@/features/partners/services/partners.mapper";
import type { Partner } from "@/features/partners/types";

function getTableName(): string {
  return getAirtableTableName("partnersTable");
}

export async function findPartners(
  options: AirtableListOptions = {},
): Promise<Partner[]> {
  const records = await getRecords(getTableName(), options);
  return records.map((record) =>
    mapPartnerRecord({
      id: record.id,
      fields: record.fields as AirtableFields,
    }),
  );
}

export async function findPartnerById(
  recordId: string,
): Promise<Partner | null> {
  try {
    const record = await findRecord(getTableName(), recordId);
    return mapPartnerRecord({
      id: record.id,
      fields: record.fields as AirtableFields,
    });
  } catch {
    return null;
  }
}

export async function insertPartner(fields: AirtableFields): Promise<Partner> {
  const record = await createRecord(getTableName(), fields);
  return mapPartnerRecord({
    id: record.id,
    fields: record.fields as AirtableFields,
  });
}

export async function patchPartner(
  recordId: string,
  fields: AirtableFields,
): Promise<Partner> {
  const record = await updateRecord(getTableName(), recordId, fields);
  return mapPartnerRecord({
    id: record.id,
    fields: record.fields as AirtableFields,
  });
}
