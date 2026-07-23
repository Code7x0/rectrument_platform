import {
  createRecord,
  findRecord,
  getRecords,
  updateRecord,
  type AirtableFields,
  type AirtableListOptions,
} from "@/lib/airtable/client";
import { getAirtableTableName } from "@/lib/airtable/tables";
import { mapJobRecord } from "@/features/jobs/services/jobs.mapper";
import type { Job } from "@/features/jobs/types";

/**
 * Jobs repository — Airtable access + domain mapping only.
 * Business rules (enrichment, archive policy, search) stay in services.
 */
function getTableName(): string {
  return getAirtableTableName("jobsTable");
}

export async function findJobs(
  options: AirtableListOptions = {},
): Promise<Job[]> {
  const records = await getRecords(getTableName(), options);
  return records.map((record) =>
    mapJobRecord({
      id: record.id,
      fields: record.fields as AirtableFields,
    }),
  );
}

export async function findJobById(recordId: string): Promise<Job | null> {
  try {
    const record = await findRecord(getTableName(), recordId);
    return mapJobRecord({
      id: record.id,
      fields: record.fields as AirtableFields,
    });
  } catch {
    return null;
  }
}

export async function insertJob(fields: AirtableFields): Promise<Job> {
  const record = await createRecord(getTableName(), fields);
  return mapJobRecord({
    id: record.id,
    fields: record.fields as AirtableFields,
  });
}

export async function patchJob(
  recordId: string,
  fields: AirtableFields,
): Promise<Job> {
  const record = await updateRecord(getTableName(), recordId, fields);
  return mapJobRecord({
    id: record.id,
    fields: record.fields as AirtableFields,
  });
}
