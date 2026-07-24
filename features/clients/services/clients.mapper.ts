import type { AirtableFields } from "@/lib/airtable/client";
import { asLinkedId, asString, isClientCompatMode } from "@/lib/airtable/compat";
import {
  AIRTABLE_CLIENT_STATUS,
  CLIENTS_TABLE_FIELDS,
  DOMAIN_CLIENT_STATUS_TO_AIRTABLE,
} from "@/lib/airtable/fields";
import { isValidClientCode } from "@/lib/business-ids";
import type {
  Client,
  ClientStatus,
  CreateClientInput,
  UpdateClientInput,
} from "@/features/clients/types";

function mapStatus(value: unknown): ClientStatus {
  const raw = asString(value);
  if (!raw) {
    return "active";
  }
  return (
    AIRTABLE_CLIENT_STATUS[raw as keyof typeof AIRTABLE_CLIENT_STATUS] ??
    "active"
  );
}

export function mapClientRecord(record: {
  id: string;
  fields: AirtableFields;
}): Client {
  const fields = record.fields;
  const rawCode = asString(fields[CLIENTS_TABLE_FIELDS.clientId]);
  return {
    id: record.id,
    // Never invent CLI-rec… codes — only Airtable Client ID.
    clientCode: isValidClientCode(rawCode) ? rawCode!.trim().toUpperCase() : rawCode,
    name: asString(fields[CLIENTS_TABLE_FIELDS.name]) ?? "Untitled Client",
    industry: asString(fields[CLIENTS_TABLE_FIELDS.industry]),
    website: asString(fields[CLIENTS_TABLE_FIELDS.website]),
    primaryContact: asString(fields[CLIENTS_TABLE_FIELDS.primaryContact]),
    accountManagerId: asLinkedId(fields[CLIENTS_TABLE_FIELDS.accountManager]),
    accountManagerName: null,
    status: mapStatus(fields[CLIENTS_TABLE_FIELDS.status]),
    notes: asString(fields[CLIENTS_TABLE_FIELDS.notes]),
  };
}

export function toAirtableCreateFields(
  input: CreateClientInput,
): AirtableFields {
  const clientMode = isClientCompatMode();
  const fields: AirtableFields = {
    [CLIENTS_TABLE_FIELDS.name]: input.name,
    [CLIENTS_TABLE_FIELDS.status]:
      DOMAIN_CLIENT_STATUS_TO_AIRTABLE[
        input.status === "archived" ? "active" : (input.status ?? "active")
      ],
  };

  if (input.industry) {
    fields[CLIENTS_TABLE_FIELDS.industry] = input.industry;
  }
  if (input.website) {
    fields[CLIENTS_TABLE_FIELDS.website] = input.website;
  }
  if (!clientMode && input.primaryContact) {
    fields[CLIENTS_TABLE_FIELDS.primaryContact] = input.primaryContact;
  }
  if (input.accountManagerId) {
    fields[CLIENTS_TABLE_FIELDS.accountManager] = [input.accountManagerId];
  }
  if (input.notes) {
    fields[CLIENTS_TABLE_FIELDS.notes] = input.notes;
  }

  return fields;
}

export function toAirtableUpdateFields(
  input: UpdateClientInput,
): AirtableFields {
  const fields: AirtableFields = {};
  const clientMode = isClientCompatMode();

  if (input.name !== undefined) {
    fields[CLIENTS_TABLE_FIELDS.name] = input.name;
  }
  if (input.industry !== undefined) {
    fields[CLIENTS_TABLE_FIELDS.industry] = input.industry || "";
  }
  if (input.website !== undefined) {
    fields[CLIENTS_TABLE_FIELDS.website] = input.website || "";
  }
  if (!clientMode && input.primaryContact !== undefined) {
    fields[CLIENTS_TABLE_FIELDS.primaryContact] = input.primaryContact || "";
  }
  if (input.accountManagerId !== undefined) {
    fields[CLIENTS_TABLE_FIELDS.accountManager] = input.accountManagerId
      ? [input.accountManagerId]
      : [];
  }
  if (input.status !== undefined) {
    fields[CLIENTS_TABLE_FIELDS.status] =
      DOMAIN_CLIENT_STATUS_TO_AIRTABLE[input.status];
  }
  if (input.notes !== undefined) {
    fields[CLIENTS_TABLE_FIELDS.notes] = input.notes || "";
  }

  return fields;
}

export function buildClientsFilterFormula(filters: {
  status?: ClientStatus | "all";
  includeArchived?: boolean;
}): string {
  const clauses: string[] = [];
  const clientMode = isClientCompatMode();

  if (
    !filters.includeArchived &&
    (!filters.status || filters.status === "all")
  ) {
    if (clientMode) {
      clauses.push(
        `NOT({${CLIENTS_TABLE_FIELDS.status}} = 'Inactive')`,
      );
    } else {
      clauses.push(
        `NOT({${CLIENTS_TABLE_FIELDS.status}} = '${DOMAIN_CLIENT_STATUS_TO_AIRTABLE.archived}')`,
      );
    }
  }

  if (filters.status && filters.status !== "all") {
    clauses.push(
      `{${CLIENTS_TABLE_FIELDS.status}} = '${DOMAIN_CLIENT_STATUS_TO_AIRTABLE[filters.status]}'`,
    );
  }

  if (clauses.length === 0) {
    return "";
  }
  if (clauses.length === 1) {
    return clauses[0] ?? "";
  }
  return `AND(${clauses.join(",")})`;
}
