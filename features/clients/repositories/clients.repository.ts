import {
  createRecord,
  findRecord,
  getRecords,
  updateRecord,
  type AirtableFields,
  type AirtableListOptions,
} from "@/lib/airtable/client";
import { getAirtableTableName } from "@/lib/airtable/tables";
import { mapClientRecord } from "@/features/clients/services/clients.mapper";
import type { Client } from "@/features/clients/types";

function getTableName(): string {
  return getAirtableTableName("clientsTable");
}

export async function findClients(
  options: AirtableListOptions = {},
): Promise<Client[]> {
  const records = await getRecords(getTableName(), options);
  return records.map((record) =>
    mapClientRecord({
      id: record.id,
      fields: record.fields as AirtableFields,
    }),
  );
}

export async function findClientById(
  recordId: string,
): Promise<Client | null> {
  try {
    const record = await findRecord(getTableName(), recordId);
    return mapClientRecord({
      id: record.id,
      fields: record.fields as AirtableFields,
    });
  } catch {
    return null;
  }
}

export async function insertClient(fields: AirtableFields): Promise<Client> {
  const record = await createRecord(getTableName(), fields);
  return mapClientRecord({
    id: record.id,
    fields: record.fields as AirtableFields,
  });
}

export async function patchClient(
  recordId: string,
  fields: AirtableFields,
): Promise<Client> {
  const record = await updateRecord(getTableName(), recordId, fields);
  return mapClientRecord({
    id: record.id,
    fields: record.fields as AirtableFields,
  });
}
