import {
  createRecord,
  findRecord,
  getRecords,
  updateRecord,
  type AirtableFields,
  type AirtableListOptions,
} from "@/lib/airtable/client";
import { getSubmissionsMode } from "@/lib/airtable/compat";
import { getAirtableTableName } from "@/lib/airtable/tables";
import {
  mapSubmissionRecord,
  SUBMISSION_PATCH_CANDIDATE_ID,
} from "@/features/submissions/services/submissions.mapper";
import type { Submission } from "@/features/submissions/types";

function getTableName(): string {
  if (getSubmissionsMode() === "candidates") {
    return getAirtableTableName("candidatesTable");
  }
  return getAirtableTableName("submissionsTable");
}

function stripInternalFields(fields: AirtableFields): {
  patchId: string | null;
  airtableFields: AirtableFields;
} {
  const airtableFields = { ...fields };
  const patchRaw = airtableFields[SUBMISSION_PATCH_CANDIDATE_ID];
  delete airtableFields[SUBMISSION_PATCH_CANDIDATE_ID];
  const patchId =
    typeof patchRaw === "string" && patchRaw.startsWith("rec")
      ? patchRaw
      : null;
  return { patchId, airtableFields };
}

export async function findSubmissions(
  options: AirtableListOptions = {},
): Promise<Submission[]> {
  const records = await getRecords(getTableName(), options);
  const mapped: Submission[] = [];
  for (const record of records) {
    try {
      mapped.push(
        mapSubmissionRecord({
          id: record.id,
          fields: record.fields as AirtableFields,
        }),
      );
    } catch {
      // Skip Candidates rows that are not yet linked to a job/partner.
    }
  }
  return mapped;
}

export async function findSubmissionById(
  recordId: string,
): Promise<Submission | null> {
  try {
    const record = await findRecord(getTableName(), recordId);
    return mapSubmissionRecord({
      id: record.id,
      fields: record.fields as AirtableFields,
    });
  } catch {
    return null;
  }
}

export async function insertSubmission(
  fields: AirtableFields,
): Promise<Submission> {
  const { patchId, airtableFields } = stripInternalFields(fields);

  if (getSubmissionsMode() === "candidates" && patchId) {
    const record = await updateRecord(getTableName(), patchId, airtableFields);
    return mapSubmissionRecord({
      id: record.id,
      fields: record.fields as AirtableFields,
    });
  }

  const record = await createRecord(getTableName(), airtableFields);
  return mapSubmissionRecord({
    id: record.id,
    fields: record.fields as AirtableFields,
  });
}

/**
 * Low-level field patch. Status updates must be initiated by Workflow Service only.
 */
export async function patchSubmission(
  recordId: string,
  fields: AirtableFields,
): Promise<Submission> {
  const { airtableFields } = stripInternalFields(fields);
  const record = await updateRecord(getTableName(), recordId, airtableFields);
  return mapSubmissionRecord({
    id: record.id,
    fields: record.fields as AirtableFields,
  });
}
