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
  /** Short business AM ID (e.g. VPR98) — for partner-facing reference. */
  amCode: string;
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
    const ownerIds =
      client.accountManagerIds?.length > 0
        ? client.accountManagerIds
        : client.accountManagerId
          ? [client.accountManagerId]
          : [];
    for (const amId of ownerIds) {
      const list = clientsByAm.get(amId) ?? [];
      list.push({ name: client.name });
      clientsByAm.set(amId, list);
    }
  }

  const rows: AccountManagerDirectoryRow[] = [];
  const { ensureAccountManagerHasBusinessCode } = await import(
    "@/features/shared/services/business-ids.service"
  );

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
    const phone = asString(record.fields[ACCOUNT_MANAGERS_TABLE_FIELDS.phone]);
    const comments = asString(
      record.fields[ACCOUNT_MANAGERS_TABLE_FIELDS.comments],
    );
    let amCode = "—";
    try {
      amCode = await ensureAccountManagerHasBusinessCode({
        id: record.id,
        name,
        phone,
        comments,
      });
    } catch (error) {
      console.error("[am-code] directory ensure failed", record.id, error);
    }
    const linked = clientsByAm.get(record.id) ?? [];
    rows.push({
      id: record.id,
      amCode,
      name,
      email,
      phone,
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
 * Unassign also strips per-job [RP_AM] markers so the AM loses those jobs
 * (otherwise leftover job markers keep them on the AM dashboard).
 */
export async function assignAccountManagerToClient(input: {
  clientId: string;
  accountManagerId: string | null;
}): Promise<void> {
  const { updateClient } = await import("@/features/clients/services");
  await updateClient(input.clientId, {
    accountManagerId: input.accountManagerId ?? "",
  });

  if (input.accountManagerId?.trim()) {
    return;
  }

  // Clear explicit per-job AM markers under this client so unassign sticks.
  const { findJobs, patchJob } = await import(
    "@/features/jobs/repositories/jobs.repository"
  );
  const { JOBS_TABLE_FIELDS } = await import("@/lib/airtable/fields");
  const { findRecord } = await import("@/lib/airtable/client");
  const { getAirtableTableName } = await import("@/lib/airtable/tables");
  const { stripJobAmMarker, upsertJobIdMarker, parseJobIdMarker } =
    await import("@/lib/business-ids");
  const { asString, isClientCompatMode } = await import(
    "@/lib/airtable/compat"
  );

  const jobs = await findJobs({});
  const jobsForClient = jobs.filter((job) => job.clientId === input.clientId);
  for (const job of jobsForClient) {
    if (!job.accountManagerId && !job.accountManagerUnassigned) {
      continue;
    }
    if (!isClientCompatMode()) {
      await patchJob(job.id, {
        [JOBS_TABLE_FIELDS.accountManager]: [],
      });
      continue;
    }
    try {
      const record = await findRecord(
        getAirtableTableName("jobsTable"),
        job.id,
      );
      const commentsRaw = asString(record.fields[JOBS_TABLE_FIELDS.notes]) ?? "";
      let next = stripJobAmMarker(commentsRaw) ?? "";
      const jobCode = parseJobIdMarker(commentsRaw) ?? job.jobCode ?? null;
      if (jobCode) {
        next = upsertJobIdMarker(next, jobCode);
      }
      await patchJob(job.id, {
        [JOBS_TABLE_FIELDS.notes]: next,
      });
    } catch (error) {
      console.error(
        "[am] clear job marker on client unassign failed",
        job.id,
        error,
      );
    }
  }
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
