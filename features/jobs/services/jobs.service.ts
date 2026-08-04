import { cache } from "react";

import {
  DOMAIN_EMPLOYMENT_TYPE_TO_AIRTABLE,
  DOMAIN_JOB_PRIORITY_TO_AIRTABLE,
  DOMAIN_JOB_STATUS_TO_AIRTABLE,
  JOBS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import { isClientCompatMode } from "@/lib/airtable/compat";
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

async function withEnrichment(
  jobs: Job[],
): Promise<{ jobs: Job[]; clientOwnersById: Map<string, string[]> }> {
  if (jobs.length === 0) {
    return { jobs, clientOwnersById: new Map() };
  }

  const [clients, accountManagers] = await Promise.all([
    listClientOptions(),
    listAccountManagerOptions(),
  ]);
  const clientMap = new Map(clients.map((client) => [client.id, client]));
  const amMap = new Map(
    accountManagers.map((am) => [
      am.id,
      { name: am.label, code: am.code ?? null },
    ]),
  );

  // Need Account Owner ids for inherit — lookup options are labels only.
  const { listClients } = await import("@/features/clients/services");
  const clientRows = await listClients({ includeArchived: true });
  const clientOwnersById = new Map(
    clientRows.map((client) => [
      client.id,
      client.accountManagerIds?.length
        ? client.accountManagerIds
        : client.accountManagerId
          ? [client.accountManagerId]
          : [],
    ]),
  );

  const enriched = jobs.map((job) => {
    const client = job.clientId ? clientMap.get(job.clientId) : undefined;
    const owners = job.clientId
      ? (clientOwnersById.get(job.clientId) ?? [])
      : [];
    // Prefer per-job AM (link field or [RP_AM] marker). Explicit [RP_AM] none
    // blocks Client Account Owner inheritance. Otherwise inherit primary owner.
    const accountManagerId = job.accountManagerUnassigned
      ? null
      : (job.accountManagerId ?? owners[0] ?? null);
    const amMeta = accountManagerId ? amMap.get(accountManagerId) : null;

    return {
      ...job,
      clientName: client?.label ?? null,
      accountManagerId,
      accountManagerUnassigned: job.accountManagerUnassigned,
      // Admin/SA see names; code available via lookups for partner-facing UIs.
      accountManagerName: amMeta?.name ?? null,
    };
  });

  return { jobs: enriched, clientOwnersById };
}

/**
 * AM job visibility:
 * - Explicit per-job unassign ([RP_AM] none) → never visible.
 * - Explicit per-job AM (field / [RP_AM] marker) always wins.
 * - Client Account Owners always inherit unmarked jobs on their client
 *   (sibling-hide must not strip their portfolio).
 * - Non-owners: if they have ANY explicit job on a client, sibling unmarked
 *   jobs are NOT inherited (prevents “assign one job → whole client” bleed).
 */
function filterJobsForAccountManager(
  originals: Job[],
  enriched: Job[],
  accountManagerId: string,
  clientOwnersById: Map<string, string[]>,
): Job[] {
  const explicitById = new Map(
    originals.map((job) => [job.id, job.accountManagerId]),
  );
  const unassignedIds = new Set(
    originals
      .filter((job) => job.accountManagerUnassigned)
      .map((job) => job.id),
  );
  const clientsWithExplicitAm = new Set(
    originals
      .filter(
        (job) =>
          job.accountManagerId === accountManagerId && Boolean(job.clientId),
      )
      .map((job) => job.clientId as string),
  );

  return enriched.filter((job) => {
    if (unassignedIds.has(job.id)) {
      return false;
    }
    const explicit = explicitById.get(job.id) ?? null;
    if (explicit) {
      return explicit === accountManagerId;
    }
    const owners = job.clientId
      ? (clientOwnersById.get(job.clientId) ?? [])
      : [];
    if (owners.includes(accountManagerId)) {
      return true;
    }
    if (job.clientId && clientsWithExplicitAm.has(job.clientId)) {
      return false;
    }
    return job.accountManagerId === accountManagerId;
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

/** Request-scoped full jobs scan. */
const loadAllJobsCached = cache(async () =>
  findJobs({
    sort: [{ field: JOBS_TABLE_FIELDS.createdAt, direction: "desc" }],
  }),
);

export async function listJobs(filters: JobListFilters = {}): Promise<Job[]> {
  const { search, accountManagerId, clientId, ...rest } = filters;

  // Client mode: do not query missing Jobs.Assigned Account Manager, and do not
  // FIND(recId) on linked Client — ARRAYJOIN returns client names, not ids.
  const formula = buildJobsFilterFormula({
    ...rest,
    clientId: isClientCompatMode() ? undefined : clientId,
    accountManagerId: isClientCompatMode() ? undefined : accountManagerId,
    search: undefined,
  });

  const jobs = formula
    ? await findJobs({
        filterByFormula: formula,
        sort: [{ field: JOBS_TABLE_FIELDS.createdAt, direction: "desc" }],
      })
    : await loadAllJobsCached();

  let { jobs: enriched, clientOwnersById } = await withEnrichment(jobs);

  if (
    accountManagerId &&
    accountManagerId !== "all"
  ) {
    enriched = filterJobsForAccountManager(
      jobs,
      enriched,
      accountManagerId,
      clientOwnersById,
    );
  }

  if (isClientCompatMode() && clientId && clientId !== "all") {
    enriched = enriched.filter((job) => job.clientId === clientId);
  }

  return applySearchFilter(enriched, search);
}

export const getJobById = cache(async function getJobById(
  jobId: string,
): Promise<Job | null> {
  const job = await findJobById(jobId);
  if (!job) {
    return null;
  }

  const { jobs: enrichedJobs } = await withEnrichment([job]);
  return enrichedJobs[0] ?? null;
});

export async function createJob(input: CreateJobInput): Promise<Job> {
  const { jobCode } = await allocateNextJobCodeForClient(input.clientId);
  const created = await insertJob(
    toAirtableCreateFields(input, valueMaps, { jobCode }),
  );
  // Per-job AM only ([RP_AM] marker) — do not set Clients.Account Owner.

  const { jobs: enrichedCreated } = await withEnrichment([created]);
  const job = enrichedCreated[0];

  if (!job) {
    throw new Error("Failed to create job");
  }

  const amId = input.accountManagerId?.trim() || job.accountManagerId;
  if (amId) {
    const { notifyAccountManagerAssignedToJob } = await import(
      "@/features/notifications/services/notification-events"
    );
    void notifyAccountManagerAssignedToJob({
      accountManagerId: amId,
      jobTitle: job.title,
      jobId: job.id,
      jobCode: job.jobCode,
    }).catch((error) => {
      console.error("[notifications] AM job assign failed", error);
    });
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

  // Locked client Jobs have no AM link — store per-job AM in Comments [RP_AM].
  if (isClientCompatMode() && input.accountManagerId !== undefined) {
    const { upsertJobAmMarker, upsertJobIdMarker } = await import(
      "@/lib/business-ids"
    );
    const { findRecord } = await import("@/lib/airtable/client");
    const { getAirtableTableName } = await import("@/lib/airtable/tables");
    let commentsRaw =
      typeof fields[JOBS_TABLE_FIELDS.notes] === "string"
        ? (fields[JOBS_TABLE_FIELDS.notes] as string)
        : "";
    try {
      const record = await findRecord(
        getAirtableTableName("jobsTable"),
        jobId,
      );
      const notesField = record.fields[JOBS_TABLE_FIELDS.notes];
      if (typeof notesField === "string") {
        commentsRaw = notesField;
      }
    } catch {
      // fall through with fields/existing notes
    }
    if (!commentsRaw && existing?.notes) {
      commentsRaw = existing.notes;
    }
    let next = upsertJobAmMarker(
      commentsRaw,
      input.accountManagerId.trim() || null,
    );
    if (existing?.jobCode) {
      next = upsertJobIdMarker(next, existing.jobCode);
    }
    fields[JOBS_TABLE_FIELDS.notes] = next;
  }

  const updated = await patchJob(jobId, fields);

  // Never sync Clients.Account Owner from a job AM change (that assigned the whole client).

  if (input.accountManagerId !== undefined) {
    const previousAmId = existing?.accountManagerId ?? null;
    const nextAmId = input.accountManagerId.trim() || null;
    if (previousAmId !== nextAmId) {
      const {
        notifyAccountManagerAssignedToJob,
        notifyAccountManagerRemovedFromJob,
      } = await import(
        "@/features/notifications/services/notification-events"
      );
      const jobTitle = updated.title || existing?.title || "Job";
      const jobCode = updated.jobCode || existing?.jobCode || null;
      if (previousAmId) {
        void notifyAccountManagerRemovedFromJob({
          accountManagerId: previousAmId,
          jobTitle,
          jobId,
          jobCode,
        }).catch((error) => {
          console.error("[notifications] AM job unassign failed", error);
        });
      }
      if (nextAmId) {
        void notifyAccountManagerAssignedToJob({
          accountManagerId: nextAmId,
          jobTitle,
          jobId,
          jobCode,
        }).catch((error) => {
          console.error("[notifications] AM job assign failed", error);
        });
      }
    }
  }

  const { jobs: enrichedUpdated } = await withEnrichment([updated]);
  const job = enrichedUpdated[0];

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
