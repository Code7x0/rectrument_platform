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
import { getUploadService, type UploadedFile } from "@/services/uploads";

import {
  toAirtableCreateFields,
  toAirtableUpdateFields,
} from "./jobs.mapper";
import { buildJobsFilterFormula } from "./jobs.validation";
import { filterJobsForAccountManager } from "./jobs-am-visibility";

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
  const clientRecordMap = new Map(
    clientRows.map((client) => [client.id, client]),
  );
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
    const lookup = job.clientId ? clientMap.get(job.clientId) : undefined;
    const clientRecord = job.clientId
      ? clientRecordMap.get(job.clientId)
      : undefined;
    const owners = job.clientId
      ? (clientOwnersById.get(job.clientId) ?? [])
      : [];
    // Prefer per-job AM(s) (link field or [RP_AM] marker). Explicit [RP_AM] none
    // blocks Client Account Owner inheritance. Otherwise inherit client owners.
    const accountManagerIds = job.accountManagerUnassigned
      ? []
      : job.accountManagerIds?.length
        ? job.accountManagerIds
        : job.accountManagerId
          ? [job.accountManagerId]
          : owners;
    const accountManagerId = accountManagerIds[0] ?? null;
    const amNames = accountManagerIds
      .map((id) => amMap.get(id)?.name)
      .filter((name): name is string => Boolean(name));

    return {
      ...job,
      clientName: clientRecord?.name ?? lookup?.label ?? null,
      clientCode:
        clientRecord?.clientCode?.trim() ||
        lookup?.clientCode?.trim() ||
        null,
      accountManagerId,
      accountManagerIds,
      accountManagerUnassigned: job.accountManagerUnassigned,
      // Admin/SA see names; code available via lookups for partner-facing UIs.
      accountManagerName:
        amNames.length > 0 ? amNames.join(", ") : null,
    };
  });

  return { jobs: enriched, clientOwnersById };
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

  const enrichment = await withEnrichment(jobs);
  let enriched = enrichment.jobs;
  const { clientOwnersById } = enrichment;

  if (
    accountManagerId &&
    accountManagerId !== "all"
  ) {
    const { listClients } = await import("@/features/clients/services");
    const ownedClients = await listClients({
      accountManagerId,
      includeArchived: true,
    });
    for (const client of ownedClients) {
      const existing = clientOwnersById.get(client.id) ?? [];
      if (!existing.includes(accountManagerId)) {
        clientOwnersById.set(client.id, [...existing, accountManagerId]);
      }
    }
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

export async function createJob(
  input: CreateJobInput,
  options?: {
    jdUpload?: UploadedFile | null;
    sampleResumeUpload?: UploadedFile | null;
    /** Screenshots / client updates — appended to Job Description attachments. */
    commentAttachmentUpload?: UploadedFile | null;
  },
): Promise<Job> {
  const { jobCode } = await allocateNextJobCodeForClient(input.clientId);
  const created = await insertJob(
    toAirtableCreateFields(input, valueMaps, { jobCode }),
  );
  // Per-job AM only ([RP_AM] marker) — do not set Clients.Account Owner.

  if (options?.jdUpload) {
    await attachJobDescription(created.id, options.jdUpload);
  }
  if (options?.commentAttachmentUpload) {
    await attachJobDescription(created.id, options.commentAttachmentUpload);
  }
  if (options?.sampleResumeUpload) {
    await attachSampleResume(created.id, options.sampleResumeUpload);
  }

  const refreshed =
    options?.jdUpload ||
    options?.commentAttachmentUpload ||
    options?.sampleResumeUpload
      ? ((await findJobById(created.id)) ?? created)
      : created;
  const { jobs: enrichedCreated } = await withEnrichment([refreshed]);
  const job = enrichedCreated[0];

  if (!job) {
    throw new Error("Failed to create job");
  }

  const amIds = Array.from(
    new Set(
      (input.accountManagerIds?.length
        ? input.accountManagerIds
        : input.accountManagerId
          ? [input.accountManagerId]
          : job.accountManagerIds?.length
            ? job.accountManagerIds
            : job.accountManagerId
              ? [job.accountManagerId]
              : []
      )
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  );
  if (amIds.length > 0) {
    const { notifyAccountManagerAssignedToJob } = await import(
      "@/features/notifications/services/notification-events"
    );
    for (const accountManagerId of amIds) {
      void notifyAccountManagerAssignedToJob({
        accountManagerId,
        jobTitle: job.title,
        jobId: job.id,
        jobCode: job.jobCode,
      }).catch((error) => {
        console.error("[notifications] AM job assign failed", error);
      });
    }
  }

  return job;
}

export async function attachJobDescription(
  jobId: string,
  upload: UploadedFile,
): Promise<void> {
  const uploader = getUploadService();
  await uploader.bindToEntity(upload, {
    entityId: jobId,
    fieldName: JOBS_TABLE_FIELDS.description,
    mode: "append",
  });
}

/** Attach to Jobs.Sample Profiling (sample resume for the role). */
export async function attachSampleResume(
  jobId: string,
  upload: UploadedFile,
): Promise<void> {
  const uploader = getUploadService();
  await uploader.bindToEntity(upload, {
    entityId: jobId,
    fieldName: JOBS_TABLE_FIELDS.sampleProfiling,
    mode: "append",
  });
}

type JobAttachmentField = "Job Description" | "Sample Profiling";

/**
 * Remove one attachment from Job Description or Sample Profiling.
 * Remaining files are kept via Airtable attachment ids.
 */
export async function removeJobAttachment(input: {
  jobId: string;
  field: JobAttachmentField;
  attachmentId?: string | null;
  url: string;
}): Promise<Job> {
  const { findRecord, updateRecord } = await import("@/lib/airtable/client");
  const { getAirtableTableName } = await import("@/lib/airtable/tables");
  const { mapJobRecord } = await import("@/features/jobs/services/jobs.mapper");

  const fieldName =
    input.field === "Sample Profiling"
      ? JOBS_TABLE_FIELDS.sampleProfiling
      : JOBS_TABLE_FIELDS.description;

  const tableName = getAirtableTableName("jobsTable");
  const record = await findRecord(tableName, input.jobId);
  const current = record.fields[fieldName];
  const attachments = Array.isArray(current) ? current : [];

  const remaining = attachments.filter((item) => {
    const row = item as { id?: string; url?: string };
    if (input.attachmentId && row.id) {
      return row.id !== input.attachmentId;
    }
    return (row.url ?? "").trim() !== input.url.trim();
  });

  if (remaining.length === attachments.length) {
    throw new Error("Attachment not found on this job");
  }

  const nextAttachments = remaining
    .map((item) => {
      const row = item as { id?: string };
      return typeof row.id === "string" && row.id.trim()
        ? { id: row.id.trim() }
        : null;
    })
    .filter((row): row is { id: string } => Boolean(row));

  await updateRecord(tableName, input.jobId, {
    [fieldName]: nextAttachments,
  } as unknown as Parameters<typeof updateRecord>[2]);

  const refreshed = await findRecord(tableName, input.jobId);
  return mapJobRecord({ id: refreshed.id, fields: refreshed.fields });
}

export async function updateJob(
  jobId: string,
  input: UpdateJobInput,
  options?: {
    jdUpload?: UploadedFile | null;
    sampleResumeUpload?: UploadedFile | null;
    commentAttachmentUpload?: UploadedFile | null;
  },
): Promise<Job> {
  const existing = await findJobById(jobId);
  const fields = toAirtableUpdateFields(input, valueMaps);

  // Persist Job ID on the live field when known (marker remains for back-compat).
  if (existing?.jobCode?.trim()) {
    fields[JOBS_TABLE_FIELDS.jobId] = existing.jobCode.trim().toUpperCase();
  }

  // Locked client Jobs store text JD/notes + system markers in Comments.
  // Always merge markers onto the intended body — never discard a new description
  // by reloading the previous Comments value over it.
  if (
    isClientCompatMode() &&
    (input.description !== undefined ||
      input.notes !== undefined ||
      input.accountManagerId !== undefined ||
      input.accountManagerIds !== undefined ||
      Boolean(existing?.jobCode))
  ) {
    const {
      upsertJobIdMarker,
      upsertJobAmMarker,
      parseJobAmAssignment,
      parsePartnerAssignedByMap,
      upsertPartnerAssignedByMarker,
      stripJobSystemMarkers,
    } = await import("@/lib/business-ids");
    const { findRecord } = await import("@/lib/airtable/client");
    const { getAirtableTableName } = await import("@/lib/airtable/tables");

    let airtableComments = "";
    try {
      const record = await findRecord(getAirtableTableName("jobsTable"), jobId);
      const notesField = record.fields[JOBS_TABLE_FIELDS.notes];
      if (typeof notesField === "string") {
        airtableComments = notesField;
      }
    } catch {
      airtableComments = existing?.notes ?? "";
    }

    const body =
      input.description !== undefined
        ? input.description || ""
        : input.notes !== undefined
          ? input.notes || ""
          : stripJobSystemMarkers(airtableComments) ?? "";

    let next = body;
    if (existing?.jobCode) {
      next = upsertJobIdMarker(next, existing.jobCode);
    }

    if (input.accountManagerIds !== undefined) {
      next = upsertJobAmMarker(
        next,
        input.accountManagerIds.length > 0 ? input.accountManagerIds : null,
      );
    } else if (input.accountManagerId !== undefined) {
      next = upsertJobAmMarker(next, input.accountManagerId.trim() || null);
    } else {
      const priorAm = parseJobAmAssignment(airtableComments);
      if (priorAm?.kind === "assigned") {
        next = upsertJobAmMarker(next, priorAm.accountManagerIds);
      } else if (priorAm?.kind === "unassigned") {
        next = upsertJobAmMarker(next, null);
      }
    }

    for (const [partnerId, assignedByUserId] of parsePartnerAssignedByMap(
      airtableComments,
    )) {
      next = upsertPartnerAssignedByMarker(next, partnerId, assignedByUserId);
    }

    fields[JOBS_TABLE_FIELDS.notes] = next;
  } else if (
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

  if (options?.jdUpload) {
    await attachJobDescription(jobId, options.jdUpload);
  }
  if (options?.commentAttachmentUpload) {
    await attachJobDescription(jobId, options.commentAttachmentUpload);
  }
  if (options?.sampleResumeUpload) {
    await attachSampleResume(jobId, options.sampleResumeUpload);
  }

  // Never sync Clients.Account Owner from a job AM change (that assigned the whole client).

  if (
    input.accountManagerIds !== undefined ||
    input.accountManagerId !== undefined
  ) {
    const previousAmIds = Array.from(
      new Set(
        (existing?.accountManagerIds?.length
          ? existing.accountManagerIds
          : existing?.accountManagerId
            ? [existing.accountManagerId]
            : []
        ).filter(Boolean),
      ),
    );
    const nextAmIds = Array.from(
      new Set(
        (input.accountManagerIds !== undefined
          ? input.accountManagerIds
          : input.accountManagerId
            ? [input.accountManagerId]
            : []
        )
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    );
    const previousSet = new Set(previousAmIds);
    const nextSet = new Set(nextAmIds);
    const removed = previousAmIds.filter((id) => !nextSet.has(id));
    const added = nextAmIds.filter((id) => !previousSet.has(id));
    if (removed.length > 0 || added.length > 0) {
      const {
        notifyAccountManagerAssignedToJob,
        notifyAccountManagerRemovedFromJob,
      } = await import(
        "@/features/notifications/services/notification-events"
      );
      const jobTitle = updated.title || existing?.title || "Job";
      const jobCode = updated.jobCode || existing?.jobCode || null;
      for (const accountManagerId of removed) {
        void notifyAccountManagerRemovedFromJob({
          accountManagerId,
          jobTitle,
          jobId,
          jobCode,
        }).catch((error) => {
          console.error("[notifications] AM job unassign failed", error);
        });
      }
      for (const accountManagerId of added) {
        void notifyAccountManagerAssignedToJob({
          accountManagerId,
          jobTitle,
          jobId,
          jobCode,
        }).catch((error) => {
          console.error("[notifications] AM job assign failed", error);
        });
      }
    }
  }

  const refreshed =
    options?.jdUpload ||
    options?.commentAttachmentUpload ||
    options?.sampleResumeUpload
      ? ((await findJobById(jobId)) ?? updated)
      : updated;
  const { jobs: enrichedUpdated } = await withEnrichment([refreshed]);
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
