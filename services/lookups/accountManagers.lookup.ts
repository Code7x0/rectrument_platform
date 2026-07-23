import { getRecords } from "@/lib/airtable/client";
import { getOptionalEnv } from "@/lib/api/env";
import {
  ACCOUNT_MANAGERS_TABLE_FIELDS,
  USERS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import { getAirtableTableName } from "@/lib/airtable/tables";

import type { LookupOption } from "./types";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Active Account Managers.
 * Client base: Account Managers table (AIRTABLE_ACCOUNT_MANAGERS_TABLE).
 * App base: Users where Role = Account Manager.
 */
export async function listAccountManagerOptions(): Promise<LookupOption[]> {
  const accountManagersTable = getOptionalEnv(
    "AIRTABLE_ACCOUNT_MANAGERS_TABLE",
  )?.trim();

  if (accountManagersTable) {
    const records = await getRecords(accountManagersTable, {
      filterByFormula: `OR({${ACCOUNT_MANAGERS_TABLE_FIELDS.status}} = 'Active', {${ACCOUNT_MANAGERS_TABLE_FIELDS.status}} = '')`,
      sort: [{ field: ACCOUNT_MANAGERS_TABLE_FIELDS.name, direction: "asc" }],
    });

    return records
      .map((record) => {
        const label =
          asString(record.fields[ACCOUNT_MANAGERS_TABLE_FIELDS.name]) ??
          asString(record.fields[ACCOUNT_MANAGERS_TABLE_FIELDS.email]);
        if (!label) {
          return null;
        }
        return { id: record.id, label };
      })
      .filter((option): option is LookupOption => option !== null);
  }

  const records = await getRecords(getAirtableTableName("usersTable"), {
    filterByFormula: `AND({${USERS_TABLE_FIELDS.role}} = 'Account Manager', OR({${USERS_TABLE_FIELDS.status}} = 'Active', {${USERS_TABLE_FIELDS.status}} = ''))`,
    sort: [{ field: USERS_TABLE_FIELDS.fullName, direction: "asc" }],
  });

  return records
    .map((record) => {
      const label =
        asString(record.fields[USERS_TABLE_FIELDS.fullName]) ??
        asString(record.fields[USERS_TABLE_FIELDS.email]);
      if (!label) {
        return null;
      }
      return { id: record.id, label };
    })
    .filter((option): option is LookupOption => option !== null);
}
