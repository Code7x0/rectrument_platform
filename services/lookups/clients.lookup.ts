import { getRecords } from "@/lib/airtable/client";
import { asLinkedIds } from "@/lib/airtable/compat";
import { CLIENTS_TABLE_FIELDS } from "@/lib/airtable/fields";
import { getAirtableTableName } from "@/lib/airtable/tables";

import type { LookupOption } from "./types";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export type ClientLookupOption = LookupOption & {
  accountManagerId: string | null;
  accountManagerIds: string[];
  clientCode: string | null;
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
      const clientCode = asString(record.fields[CLIENTS_TABLE_FIELDS.clientId]);
      const accountManagerIds = asLinkedIds(
        record.fields[CLIENTS_TABLE_FIELDS.accountManager],
      );
      const option: ClientLookupOption = {
        id: record.id,
        label: clientCode ? `${clientCode} — ${label}` : label,
        code: clientCode,
        clientCode,
        accountManagerIds,
        accountManagerId: accountManagerIds[0] ?? null,
      };
      return option;
    })
    .filter((option): option is ClientLookupOption => option !== null);
}
