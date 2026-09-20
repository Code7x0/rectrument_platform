/** Airtable REST metadata — when the row was last updated in the base. */
export function readAirtableRecordLastModified(record: {
  _rawJson?: { lastModifiedTime?: string };
}): string | null {
  const value = record._rawJson?.lastModifiedTime;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
