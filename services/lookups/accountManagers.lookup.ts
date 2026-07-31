import { getRecords } from "@/lib/airtable/client";
import { getOptionalEnv } from "@/lib/api/env";
import { isClientCompatMode } from "@/lib/airtable/compat";
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
  const raw = getOptionalEnv("AIRTABLE_ACCOUNT_MANAGERS_TABLE")?.trim();
  const accountManagersTable =
    !raw || raw === "Account" ? "Account Managers" : raw;

  if (raw || isClientCompatMode()) {
    const records = await getRecords(accountManagersTable, {
      filterByFormula: `OR({${ACCOUNT_MANAGERS_TABLE_FIELDS.status}} = 'Active', {${ACCOUNT_MANAGERS_TABLE_FIELDS.status}} = '')`,
      sort: [{ field: ACCOUNT_MANAGERS_TABLE_FIELDS.name, direction: "asc" }],
    });

    return records.map((record) => ({
      // Client review: assignment UIs show Account Manager IDs, not names.
      id: record.id,
      label: record.id,
    }));
  }

  const records = await getRecords(getAirtableTableName("usersTable"), {
    filterByFormula: `AND({${USERS_TABLE_FIELDS.role}} = 'Account Manager', OR({${USERS_TABLE_FIELDS.status}} = 'Active', {${USERS_TABLE_FIELDS.status}} = ''))`,
    sort: [{ field: USERS_TABLE_FIELDS.fullName, direction: "asc" }],
  });

  return records.map((record) => ({
    id: record.id,
    label: record.id,
  }));
}
