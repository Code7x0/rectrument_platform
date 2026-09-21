import type { AirtableFields } from "@/lib/airtable/client";
import { asString } from "@/lib/airtable/compat";
import { getOptionalEnv } from "@/lib/api/env";

function lastModifiedFieldNames(): string[] {
  const fromEnv = getOptionalEnv("AIRTABLE_CANDIDATES_LAST_MODIFIED_FIELD")?.trim();
  return [
    ...(fromEnv ? [fromEnv] : []),
    "Last modified time",
    "Last Modified Time",
    "Last Modified",
  ];
}

/** Reads configured or common “last modified” column values from Airtable fields. */
export function readLastModifiedFromAirtableFields(
  fields: AirtableFields,
): string | null {
  for (const name of lastModifiedFieldNames()) {
    const value = asString(fields[name]);
    if (value) {
      return value;
    }
  }
  return null;
}

/** Airtable REST metadata — when the row was last updated in the base. */
export function readAirtableRecordLastModified(record: {
  fields?: AirtableFields;
  _rawJson?: { lastModifiedTime?: string };
}): string | null {
  if (record.fields) {
    const fromField = readLastModifiedFromAirtableFields(record.fields);
    if (fromField) {
      return fromField;
    }
  }
  const value = record._rawJson?.lastModifiedTime;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
