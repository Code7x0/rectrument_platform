import { getRecords } from "@/lib/airtable/client";
import { getOptionalEnv } from "@/lib/api/env";
import { asString, isClientCompatMode } from "@/lib/airtable/compat";
import {
  ACCOUNT_MANAGERS_TABLE_FIELDS,
  USERS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import { getAirtableTableName } from "@/lib/airtable/tables";
import { isValidAmCode, parseAmCodeMarker } from "@/lib/business-ids";

import type { LookupOption } from "./types";

/**
 * Active Account Managers for Admin / Super Admin pickers.
 * label = display name; code = short business AM ID (for partners / reference).
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

    const options: LookupOption[] = [];
    for (const record of records) {
      const name =
        asString(record.fields[ACCOUNT_MANAGERS_TABLE_FIELDS.name]) ??
        asString(record.fields[ACCOUNT_MANAGERS_TABLE_FIELDS.email]);
      if (!name) {
        continue;
      }
      const comments = asString(
        record.fields[ACCOUNT_MANAGERS_TABLE_FIELDS.comments],
      );
      const parsedCode = parseAmCodeMarker(comments);
      const code =
        parsedCode && isValidAmCode(parsedCode) ? parsedCode : null;
      options.push({
        id: record.id,
        label: name,
        code,
      });
    }
    return options;
  }

  const records = await getRecords(getAirtableTableName("usersTable"), {
    filterByFormula: `AND({${USERS_TABLE_FIELDS.role}} = 'Account Manager', OR({${USERS_TABLE_FIELDS.status}} = 'Active', {${USERS_TABLE_FIELDS.status}} = ''))`,
    sort: [{ field: USERS_TABLE_FIELDS.fullName, direction: "asc" }],
  });

  return records
    .map((record): LookupOption | null => {
      const label =
        asString(record.fields[USERS_TABLE_FIELDS.fullName]) ??
        asString(record.fields[USERS_TABLE_FIELDS.email]);
      if (!label) {
        return null;
      }
      return { id: record.id, label, code: null };
    })
    .filter((option): option is LookupOption => option !== null);
}
