import type { AirtableFields } from "@/lib/airtable/client";
import {
  asLinkedIds,
  asString,
  isClientCompatMode,
} from "@/lib/airtable/compat";
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
import type { ClientAttachment } from "@/features/shared/entities";

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

function asAttachments(value: unknown): ClientAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: ClientAttachment[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as { url?: string; filename?: string };
    if (typeof row.url === "string" && row.url) {
      out.push({
        url: row.url,
        filename:
          typeof row.filename === "string" && row.filename
            ? row.filename
            : "Attachment",
      });
    }
  }
  return out;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function mapClientRecord(record: {
  id: string;
  fields: AirtableFields;
}): Client {
  const fields = record.fields;
  const rawCode = asString(fields[CLIENTS_TABLE_FIELDS.clientId]);
  const accountManagerIds = asLinkedIds(
    fields[CLIENTS_TABLE_FIELDS.accountManager],
  );
  return {
    id: record.id,
    // Never invent CLI-rec… codes — only Airtable Client ID.
    clientCode: isValidClientCode(rawCode) ? rawCode!.trim().toUpperCase() : rawCode,
    name: asString(fields[CLIENTS_TABLE_FIELDS.name]) ?? "Untitled Client",
    industry: asString(fields[CLIENTS_TABLE_FIELDS.industry]),
    website: asString(fields[CLIENTS_TABLE_FIELDS.website]),
    primaryContact: asString(fields[CLIENTS_TABLE_FIELDS.primaryContact]),
    accountManagerIds,
    accountManagerId: accountManagerIds[0] ?? null,
    accountManagerName: null,
    status: mapStatus(fields[CLIENTS_TABLE_FIELDS.status]),
    notes: asString(fields[CLIENTS_TABLE_FIELDS.notes]),
    briefDeck: asAttachments(fields[CLIENTS_TABLE_FIELDS.briefDeck]),
    primaryAddress: asString(fields[CLIENTS_TABLE_FIELDS.primaryAddress]),
    addresses: asString(fields[CLIENTS_TABLE_FIELDS.addresses]),
    employeeSize: asString(fields[CLIENTS_TABLE_FIELDS.employeeSize]),
    modeOfWork: asString(fields[CLIENTS_TABLE_FIELDS.modeOfWork]),
    workDaysInWeek: asNumber(fields[CLIENTS_TABLE_FIELDS.workDaysInWeek]),
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

  if (input.clientCode?.trim()) {
    fields[CLIENTS_TABLE_FIELDS.clientId] = input.clientCode.trim().toUpperCase();
  }
  if (input.industry) {
    fields[CLIENTS_TABLE_FIELDS.industry] = input.industry;
  }
  if (input.website) {
    fields[CLIENTS_TABLE_FIELDS.website] = input.website;
  }
  if (!clientMode && input.primaryContact) {
    fields[CLIENTS_TABLE_FIELDS.primaryContact] = input.primaryContact;
  }
  if (input.accountManagerIds !== undefined && input.accountManagerIds.length > 0) {
    fields[CLIENTS_TABLE_FIELDS.accountManager] = input.accountManagerIds.filter(
      Boolean,
    );
  } else if (input.accountManagerId) {
    fields[CLIENTS_TABLE_FIELDS.accountManager] = [input.accountManagerId];
  }
  if (input.notes) {
    fields[CLIENTS_TABLE_FIELDS.notes] = input.notes;
  }
  if (input.primaryAddress) {
    fields[CLIENTS_TABLE_FIELDS.primaryAddress] = input.primaryAddress;
  }
  if (input.modeOfWork) {
    fields[CLIENTS_TABLE_FIELDS.modeOfWork] = input.modeOfWork;
  }
  if (input.workDaysInWeek != null) {
    fields[CLIENTS_TABLE_FIELDS.workDaysInWeek] = input.workDaysInWeek;
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
  if (input.clientCode !== undefined) {
    fields[CLIENTS_TABLE_FIELDS.clientId] = input.clientCode?.trim()
      ? input.clientCode.trim().toUpperCase()
      : "";
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
  if (input.accountManagerIds !== undefined) {
    fields[CLIENTS_TABLE_FIELDS.accountManager] = input.accountManagerIds.filter(
      Boolean,
    );
  } else if (input.accountManagerId !== undefined) {
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
  if (input.primaryAddress !== undefined) {
    fields[CLIENTS_TABLE_FIELDS.primaryAddress] = input.primaryAddress || "";
  }
  if (input.modeOfWork !== undefined) {
    fields[CLIENTS_TABLE_FIELDS.modeOfWork] = input.modeOfWork || "";
  }
  if (input.workDaysInWeek !== undefined) {
    // Airtable FieldSet types disallow null; runtime null clears the number field.
    fields[CLIENTS_TABLE_FIELDS.workDaysInWeek] = (
      input.workDaysInWeek === null ? null : input.workDaysInWeek
    ) as AirtableFields[string];
  }

  return fields;
}

export function buildClientsFilterFormula(filters: {
  status?: ClientStatus | "all";
  includeArchived?: boolean;
  accountManagerId?: string;
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

  // Do not FIND Account Owner by record id here — ARRAYJOIN returns names,
  // not rec… ids. AM scoping is applied in-memory in listClients.

  if (clauses.length === 0) {
    return "";
  }
  if (clauses.length === 1) {
    return clauses[0] ?? "";
  }
  return `AND(${clauses.join(",")})`;
}
