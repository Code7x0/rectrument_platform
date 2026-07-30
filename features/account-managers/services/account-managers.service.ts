import { getRecords, updateRecord } from "@/lib/airtable/client";
import { getOptionalEnv } from "@/lib/api/env";
import { isClientCompatMode } from "@/lib/airtable/compat";
import { ACCOUNT_MANAGERS_TABLE_FIELDS } from "@/lib/airtable/fields";
import { listClients } from "@/features/clients/services";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function amTableName(): string {
  const raw = getOptionalEnv("AIRTABLE_ACCOUNT_MANAGERS_TABLE")?.trim();
  if (!raw || raw === "Account") {
    return "Account Managers";
  }
  return raw;
}

export type AccountManagerDirectoryStatus = "active" | "inactive";

export interface AccountManagerDirectoryRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: AccountManagerDirectoryStatus;
  clientCount: number;
  clientNames: string[];
}

export interface AccountManagerDirectorySummary {
  total: number;
  active: number;
  inactive: number;
}

function mapStatus(raw: string | null): AccountManagerDirectoryStatus {
  if (!raw) {
    return "active";
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === "active" || normalized === "") {
    return "active";
  }
  return "inactive";
}

/**
 * Full Account Managers directory for Admin / Super Admin.
 * Includes Active and Inactive rows from Airtable.
 */
export async function listAccountManagersDirectory(): Promise<{
  rows: AccountManagerDirectoryRow[];
  summary: AccountManagerDirectorySummary;
}> {
  if (!isClientCompatMode() && !getOptionalEnv("AIRTABLE_ACCOUNT_MANAGERS_TABLE")) {
    return {
      rows: [],
      summary: { total: 0, active: 0, inactive: 0 },
    };
  }

  const [amRecords, clients] = await Promise.all([
    getRecords(amTableName(), {
      sort: [{ field: ACCOUNT_MANAGERS_TABLE_FIELDS.name, direction: "asc" }],
    }),
    listClients({ includeArchived: true }),
  ]);

  const clientsByAm = new Map<string, { name: string }[]>();
  for (const client of clients) {
    if (!client.accountManagerId) {
      continue;
    }
    const list = clientsByAm.get(client.accountManagerId) ?? [];
    list.push({ name: client.name });
    clientsByAm.set(client.accountManagerId, list);
  }

  const rows: AccountManagerDirectoryRow[] = [];
  for (const record of amRecords) {
    const email = asString(record.fields[ACCOUNT_MANAGERS_TABLE_FIELDS.email]);
    const name =
      asString(record.fields[ACCOUNT_MANAGERS_TABLE_FIELDS.name]) ??
      email ??
      "Account Manager";
    if (!email) {
      continue;
    }
    const status = mapStatus(
      asString(record.fields[ACCOUNT_MANAGERS_TABLE_FIELDS.status]),
    );
    const linked = clientsByAm.get(record.id) ?? [];
    rows.push({
      id: record.id,
      name,
      email,
      phone: asString(record.fields[ACCOUNT_MANAGERS_TABLE_FIELDS.phone]),
      status,
      clientCount: linked.length,
      clientNames: linked.map((c) => c.name),
    });
  }

  const active = rows.filter((r) => r.status === "active").length;
  return {
    rows,
    summary: {
      total: rows.length,
      active,
      inactive: rows.length - active,
    },
  };
}

/**
 * Assign (or clear) Account Owner on a Client.
 * Locked schema: this is how AMs are "allocated" to clients/jobs.
 */
export async function assignAccountManagerToClient(input: {
  clientId: string;
  accountManagerId: string | null;
}): Promise<void> {
  const { updateClient } = await import("@/features/clients/services");
  await updateClient(input.clientId, {
    accountManagerId: input.accountManagerId ?? "",
  });
}

export async function setAccountManagerStatus(input: {
  accountManagerId: string;
  status: AccountManagerDirectoryStatus;
}): Promise<void> {
  await updateRecord(amTableName(), input.accountManagerId, {
    [ACCOUNT_MANAGERS_TABLE_FIELDS.status]:
      input.status === "active" ? "Active" : "Not Active",
  });
}
