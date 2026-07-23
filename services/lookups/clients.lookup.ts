import { getRecords } from "@/lib/airtable/client";
import { asLinkedId } from "@/lib/airtable/compat";
import { CLIENTS_TABLE_FIELDS } from "@/lib/airtable/fields";
import { getAirtableTableName } from "@/lib/airtable/tables";

import type { LookupOption } from "./types";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export type ClientLookupOption = LookupOption & {
  accountManagerId: string | null;
};

/**
 * Active clients for dropdowns / filters.
 * Includes Account Owner (AM) for client-compat job enrichment.
 */
export async function listClientOptions(): Promise<ClientLookupOption[]> {
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
      return {
        id: record.id,
        label,
        accountManagerId: asLinkedId(
          record.fields[CLIENTS_TABLE_FIELDS.accountManager],
        ),
      };
    })
    .filter((option): option is ClientLookupOption => option !== null);
}
