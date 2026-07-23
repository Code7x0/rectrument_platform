import {
  createRecord,
  findRecord,
  getRecords,
  type AirtableFields,
  type AirtableListOptions,
} from "@/lib/airtable/client";
import { getAirtableTableName } from "@/lib/airtable/tables";
import { mapCandidateRecord } from "@/features/candidates/services/candidates.mapper";
import type { Candidate } from "@/features/candidates/types";

function getTableName(): string {
  return getAirtableTableName("candidatesTable");
}

export async function findCandidates(
  options: AirtableListOptions = {},
): Promise<Candidate[]> {
  const records = await getRecords(getTableName(), options);
  return records.map((record) =>
    mapCandidateRecord({
      id: record.id,
      fields: record.fields as AirtableFields,
    }),
  );
}

export async function findCandidateById(
  recordId: string,
): Promise<Candidate | null> {
  try {
    const record = await findRecord(getTableName(), recordId);
    return mapCandidateRecord({
      id: record.id,
      fields: record.fields as AirtableFields,
    });
  } catch {
    return null;
  }
}

export async function insertCandidate(
  fields: AirtableFields,
): Promise<Candidate> {
  const record = await createRecord(getTableName(), fields);
  return mapCandidateRecord({
    id: record.id,
    fields: record.fields as AirtableFields,
  });
}
