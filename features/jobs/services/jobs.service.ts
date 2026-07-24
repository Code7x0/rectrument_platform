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
 */
async function syncClientAccountOwner(
  clientId: string,
  accountManagerId: string,
): Promise<void> {
  if (!isClientCompatMode()) {
    return;
  }
  await patchClient(clientId, {
    [CLIENTS_TABLE_FIELDS.accountManager]: [accountManagerId],
  });
}

export async function listJobs(filters: JobListFilters = {}): Promise<Job[]> {
  const { search, accountManagerId, ...rest } = filters;

  // Client mode: do not query the missing Jobs.Assigned Account Manager field.
  const formula = buildJobsFilterFormula({
    ...rest,
    accountManagerId: isClientCompatMode() ? undefined : accountManagerId,
    search: undefined,
  });

  const jobs = await findJobs({
    ...(formula ? { filterByFormula: formula } : {}),
    sort: [{ field: JOBS_TABLE_FIELDS.createdAt, direction: "desc" }],
  });

  let enriched = await withEnrichment(jobs);

  if (
    isClientCompatMode() &&
    accountManagerId &&
    accountManagerId !== "all"
  ) {
    enriched = enriched.filter(
      (job) => job.accountManagerId === accountManagerId,
    );
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
  if (!input.accountManagerId) {
    throw new Error("Assigned Account Manager is required");
  }

  const { jobCode } = await allocateNextJobCodeForClient(input.clientId);
  const created = await insertJob(
    toAirtableCreateFields(input, valueMaps, { jobCode }),
  );
  await syncClientAccountOwner(input.clientId, input.accountManagerId);

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
  if (input.accountManagerId !== undefined && !input.accountManagerId) {
    throw new Error("Assigned Account Manager is required");
  }

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

  if (input.accountManagerId) {
    const clientId = input.clientId ?? updated.clientId;
    if (clientId) {
      await syncClientAccountOwner(clientId, input.accountManagerId);
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
