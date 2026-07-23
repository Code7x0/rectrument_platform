import { getRecords } from "@/lib/airtable/client";
import { asSelectList, isClientCompatMode } from "@/lib/airtable/compat";
import {
  AIRTABLE_IDENTITY_VISIBILITY,
  PARTNERS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import { getAirtableTableName } from "@/lib/airtable/tables";

import type { LookupOption } from "./types";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export type PartnerLookupMode = "identity" | "operational";

/**
 * Active talent partners for dropdowns.
 * - identity: company/contact (Admin / Super Admin)
 * - operational: Partner ID, or name when PUBLIC (Account Managers)
 */
export async function listPartnerOptions(
  mode: PartnerLookupMode = "identity",
): Promise<LookupOption[]> {
  const statusFilter = isClientCompatMode()
    ? `OR({${PARTNERS_TABLE_FIELDS.status}} = 'Active', {${PARTNERS_TABLE_FIELDS.status}} = 'Preferred', {${PARTNERS_TABLE_FIELDS.status}} = '')`
    : `AND(OR({${PARTNERS_TABLE_FIELDS.status}} = 'Active', {${PARTNERS_TABLE_FIELDS.status}} = ''), NOT({${PARTNERS_TABLE_FIELDS.status}} = 'Archived'))`;

  const records = await getRecords(getAirtableTableName("partnersTable"), {
    filterByFormula: statusFilter,
    sort: [
      {
        field:
          mode === "operational"
            ? PARTNERS_TABLE_FIELDS.partnerId
            : PARTNERS_TABLE_FIELDS.companyName,
        direction: "asc",
      },
    ],
  });

  return records
    .map((record) => {
      const partnerCode =
        asString(record.fields[PARTNERS_TABLE_FIELDS.partnerId]) ??
        record.id.replace(/^rec/, "TP-");

      const visibilityRaw = asString(
        record.fields[PARTNERS_TABLE_FIELDS.identityVisibility],
      );
      const isPublic =
        visibilityRaw === "PUBLIC" ||
        AIRTABLE_IDENTITY_VISIBILITY[
          visibilityRaw as keyof typeof AIRTABLE_IDENTITY_VISIBILITY
        ] === "public";

      if (mode === "operational") {
        if (isPublic) {
          const name =
            asString(record.fields[PARTNERS_TABLE_FIELDS.name]) ??
            asString(record.fields[PARTNERS_TABLE_FIELDS.companyName]);
          return {
            id: record.id,
            label: name ?? partnerCode,
          };
        }

        const specialization = asSelectList(
          record.fields[PARTNERS_TABLE_FIELDS.specialization],
        );
        return {
          id: record.id,
          label: specialization
            ? `${partnerCode} · ${specialization}`
            : partnerCode,
        };
      }

      const company = asString(record.fields[PARTNERS_TABLE_FIELDS.companyName]);
      const contact = asString(record.fields[PARTNERS_TABLE_FIELDS.name]);
      const label = company ?? contact;
      if (!label) {
        return null;
      }
      return {
        id: record.id,
        label: contact && company ? `${company} — ${contact}` : label,
      };
    })
    .filter((option): option is LookupOption => option !== null);
}
