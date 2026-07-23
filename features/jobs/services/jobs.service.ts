import {
  DOMAIN_EMPLOYMENT_TYPE_TO_AIRTABLE,
  DOMAIN_JOB_PRIORITY_TO_AIRTABLE,
  DOMAIN_JOB_STATUS_TO_AIRTABLE,
  JOBS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
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
  const clientMap = new Map(clients.map((client) => [client.id, client.label]));
  const amMap = new Map(
    accountManagers.map((am) => [am.id, am.label]),
  );

  return jobs.map((job) => ({
    ...job,
    clientName: job.clientId ? (clientMap.get(job.clientId) ?? null) : null,
    accountManagerName: job.accountManagerId
      ? (amMap.get(job.accountManagerId) ?? null)
      : null,
  }));
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

export async function listJobs(filters: JobListFilters = {}): Promise<Job[]> {
  const { search, ...airtableFilters } = filters;
  const formula = buildJobsFilterFormula({
    ...airtableFilters,
    search: undefined,
  });

  const jobs = await findJobs({
    ...(formula ? { filterByFormula: formula } : {}),
    sort: [{ field: JOBS_TABLE_FIELDS.createdAt, direction: "desc" }],
  });

  return applySearchFilter(await withEnrichment(jobs), search);
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

  const created = await insertJob(toAirtableCreateFields(input, valueMaps));
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

  const updated = await patchJob(
    jobId,
    toAirtableUpdateFields(input, valueMaps),
  );
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
