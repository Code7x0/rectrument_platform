import { getRecords } from "@/lib/airtable/client";
import { CLIENTS_TABLE_FIELDS } from "@/lib/airtable/fields";
import { getAirtableTableName } from "@/lib/airtable/tables";

import type { LookupOption } from "./types";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Active clients for dropdowns / filters.
 * Shared across Jobs and Client Workspace.
 */
export async function listClientOptions(): Promise<LookupOption[]> {
  const records = await getRecords(getAirtableTableName("clientsTable"), {
    filterByFormula: `OR({${CLIENTS_TABLE_FIELDS.status}} = 'Active', {${CLIENTS_TABLE_FIELDS.status}} = '')`,
    sort: [{ field: CLIENTS_TABLE_FIELDS.name, direction: "asc" }],
  });

  return records
    .map((record) => {
      const label = asString(record.fields[CLIENTS_TABLE_FIELDS.name]);
      if (!label) {
        return null;
      }
      return { id: record.id, label };
    })
    .filter((option): option is LookupOption => option !== null);
}
