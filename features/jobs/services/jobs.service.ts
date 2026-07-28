import {
  DOMAIN_EMPLOYMENT_TYPE_TO_AIRTABLE,
  DOMAIN_JOB_PRIORITY_TO_AIRTABLE,
  DOMAIN_JOB_STATUS_TO_AIRTABLE,
  CLIENTS_TABLE_FIELDS,
  JOBS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import { isClientCompatMode } from "@/lib/airtable/compat";
import { patchClient } from "@/features/clients/repositories/clients.repository";
import { allocateNextJobCodeForClient } from "@/features/shared/services/business-ids.service";
import {
  listAccountManagerOptions,
  listClientOptions,
} from "@/services/lookups";
import type {
  CreateJobInput,
  Job,
  JobListFilters,
  UpdateJobInput,
} from "@/features/jobs/types";
import {
  destroyJob,
  findJobById,
  findJobs,
  insertJob,
  patchJob,
} from "@/features/jobs/repositories/jobs.repository";

import {
  toAirtableCreateFields,
  toAirtableUpdateFields,
} from "./jobs.mapper";
import { buildJobsFilterFormula } from "./jobs.validation";

const valueMaps = {
  status: DOMAIN_JOB_STATUS_TO_AIRTABLE,
  priority: DOMAIN_JOB_PRIORITY_TO_AIRTABLE,
  employmentType: DOMAIN_EMPLOYMENT_TYPE_TO_AIRTABLE,
};

async function withEnrichment(jobs: Job[]): Promise<Job[]> {
  if (jobs.length === 0) {
    return jobs;
  }

  const [clients, accountManagers] = await Promise.all([
    listClientOptions(),
    listAccountManagerOptions(),
  ]);
  const clientMap = new Map(clients.map((client) => [client.id, client]));
  const amMap = new Map(
    accountManagers.map((am) => [am.id, am.label]),
  );

  return jobs.map((job) => {
    const client = job.clientId ? clientMap.get(job.clientId) : undefined;
    // Locked client schema: AM lives on Clients.Account Owner, not Jobs.
    const accountManagerId =
      job.accountManagerId ?? client?.accountManagerId ?? null;

    return {
      ...job,
      clientName: client?.label ?? null,
      accountManagerId,
      accountManagerName: accountManagerId
        ? (amMap.get(accountManagerId) ?? null)
        : null,
    };
  });
}

function applySearchFilter(jobs: Job[], search?: string): Job[] {
  if (!search?.trim()) {
    return jobs;
  }

  const q = search.trim().toLowerCase();
  return jobs.filter(
    (job) =>
      job.jobCode.toLowerCase().includes(q) ||
      job.title.toLowerCase().includes(q) ||
      (job.clientName?.toLowerCase().includes(q) ?? false) ||
      (job.accountManagerName?.toLowerCase().includes(q) ?? false),
  );
}

/**
 * On the locked client base, "assign job → AM" means setting the Client's
 * Account Owner (Jobs has no Assigned Account Manager column).
 * Pass null/empty to clear ownership.
 */
async function syncClientAccountOwner(
  clientId: string,
  accountManagerId: string | null | undefined,
): Promise<void> {
  if (!isClientCompatMode()) {
    return;
  }
  await patchClient(clientId, {
    [CLIENTS_TABLE_FIELDS.accountManager]: accountManagerId
      ? [accountManagerId]
      : [],
  });
}

export async function listJobs(filters: JobListFilters = {}): Promise<Job[]> {
  const { search, accountManagerId, clientId, ...rest } = filters;

  // Client mode: AM ownership is Clients.Account Owner — prefer client-id filter
  // so we never return another manager's jobs from Airtable.
  let clientScopedIds: Set<string> | null = null;
  if (
    isClientCompatMode() &&
    accountManagerId &&
    accountManagerId !== "all"
  ) {
    const { listClients } = await import("@/features/clients/services");
    const owned = await listClients({
      accountManagerId,
      includeArchived: true,
    });
    clientScopedIds = new Set(owned.map((c) => c.id));
    if (clientScopedIds.size === 0) {
      return [];
    }
  }

  // Client mode: do not query missing Jobs.Assigned Account Manager, and do not
  // FIND(recId) on linked Client — ARRAYJOIN returns client names, not ids.
  const formula = buildJobsFilterFormula({
    ...rest,
    clientId: isClientCompatMode() ? undefined : clientId,
    accountManagerId: isClientCompatMode() ? undefined : accountManagerId,
    search: undefined,
  });

  const jobs = await findJobs({
    ...(formula ? { filterByFormula: formula } : {}),
    sort: [{ field: JOBS_TABLE_FIELDS.createdAt, direction: "desc" }],
  });

  let enriched = await withEnrichment(jobs);

  if (clientScopedIds) {
    enriched = enriched.filter(
      (job) => job.clientId != null && clientScopedIds!.has(job.clientId),
    );
  } else if (
    isClientCompatMode() &&
    accountManagerId &&
    accountManagerId !== "all"
  ) {
    enriched = enriched.filter(
      (job) => job.accountManagerId === accountManagerId,
    );
  }

  if (isClientCompatMode() && clientId && clientId !== "all") {
    enriched = enriched.filter((job) => job.clientId === clientId);
  }

  return applySearchFilter(enriched, search);
}

export async function getJobById(jobId: string): Promise<Job | null> {
  const job = await findJobById(jobId);
  if (!job) {
    return null;
  }

  const [enriched] = await withEnrichment([job]);
  return enriched ?? null;
}

export async function createJob(input: CreateJobInput): Promise<Job> {
  const { jobCode } = await allocateNextJobCodeForClient(input.clientId);
  const created = await insertJob(
    toAirtableCreateFields(input, valueMaps, { jobCode }),
  );
  if (input.clientId) {
    await syncClientAccountOwner(
      input.clientId,
      input.accountManagerId?.trim() || null,
    );
  }

  const [job] = await withEnrichment([created]);

  if (!job) {
    throw new Error("Failed to create job");
  }

  return job;
}

export async function updateJob(
  jobId: string,
  input: UpdateJobInput,
): Promise<Job> {
  const existing = await findJobById(jobId);
  const fields = toAirtableUpdateFields(input, valueMaps);

  // Preserve business Job ID marker in Comments when notes/description are rewritten.
  if (
    existing?.jobCode &&
    (input.description !== undefined || input.notes !== undefined)
  ) {
    const { upsertJobIdMarker } = await import("@/lib/business-ids");
    const nextNotes =
      typeof fields[JOBS_TABLE_FIELDS.notes] === "string"
        ? (fields[JOBS_TABLE_FIELDS.notes] as string)
        : (existing.notes ?? "");
    fields[JOBS_TABLE_FIELDS.notes] = upsertJobIdMarker(
      nextNotes,
      existing.jobCode,
    );
  }

  const updated = await patchJob(jobId, fields);

  if (input.accountManagerId !== undefined) {
    const clientId = input.clientId ?? updated.clientId;
    if (clientId) {
      await syncClientAccountOwner(
        clientId,
        input.accountManagerId.trim() || null,
      );
    }
  }

  const [job] = await withEnrichment([updated]);

  if (!job) {
    throw new Error("Failed to update job");
  }

  return job;
}

/**
 * Soft-delete: set Status = Archived. Never permanently destroy records.
 */
export async function archiveJob(jobId: string): Promise<Job> {
  return updateJob(jobId, { status: "archived" });
}

/** Permanently remove the job record from Airtable. */
export async function deleteJob(jobId: string): Promise<void> {
  const existing = await findJobById(jobId);
  if (!existing) {
    throw new Error("Job not found");
  }
  await destroyJob(jobId);
}

export async function getJobLocations(): Promise<string[]> {
  const jobs = await listJobs({ includeArchived: false });
  const locations = new Set<string>();

  for (const job of jobs) {
    if (job.location) {
      locations.add(job.location);
    }
  }

  return Array.from(locations).sort((a, b) => a.localeCompare(b));
}
