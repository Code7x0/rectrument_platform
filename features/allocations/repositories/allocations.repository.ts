import {
  createRecord,
  findRecord,
  getRecords,
  updateRecord,
  type AirtableFields,
  type AirtableListOptions,
} from "@/lib/airtable/client";
import {
  buildJobPartnerAllocationId,
  getAllocationsMode,
  parseJobPartnerAllocationId,
} from "@/lib/airtable/compat";
import {
  ALLOCATIONS_TABLE_FIELDS,
  JOBS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import { getAirtableTableName } from "@/lib/airtable/tables";
import { mapAllocationRecord } from "@/features/allocations/services/allocations.mapper";
import { jobPartnerIds } from "@/features/jobs/services/jobs.mapper";
import type { Allocation } from "@/features/allocations/types";

function getTableName(): string {
  return getAirtableTableName("allocationsTable");
}

function getJobsTableName(): string {
  return getAirtableTableName("jobsTable");
}

function allocationFromJobPartner(
  jobId: string,
  partnerId: string,
): Allocation {
  const id = buildJobPartnerAllocationId(jobId, partnerId);
  return {
    id,
    allocationCode: id.replace(/^jp_/, "ALL-"),
    jobId,
    jobTitle: null,
    jobCode: null,
    partnerId,
    partnerCode: null,
    partnerName: null,
    accountManagerId: null,
    assignedById: null,
    assignedDate: null,
    status: "assigned",
    expectedProfiles: 1,
    profilesSubmitted: 0,
    notes: null,
  };
}

async function findAllocationsFromJobPartners(
  options: AirtableListOptions = {},
): Promise<Allocation[]> {
  const jobRecords = await getRecords(getJobsTableName(), {
    // Ignore allocation-table formulas; filter in memory below when possible.
    fields: [
      JOBS_TABLE_FIELDS.title,
      JOBS_TABLE_FIELDS.partners,
      JOBS_TABLE_FIELDS.status,
    ],
  });

  const allocations: Allocation[] = [];
  for (const job of jobRecords) {
    const fields = job.fields as AirtableFields;
    for (const partnerId of jobPartnerIds(fields)) {
      allocations.push(allocationFromJobPartner(job.id, partnerId));
    }
  }

  const formula = options.filterByFormula ?? "";
  let filtered = allocations;

  const partnerField = ALLOCATIONS_TABLE_FIELDS.partner;
  const jobField = ALLOCATIONS_TABLE_FIELDS.job;
  const partnerFind = new RegExp(
    `FIND\\('(rec[A-Za-z0-9]+)', ARRAYJOIN\\(\\{${partnerField}\\}\\)\\)`,
  ).exec(formula);
  if (partnerFind?.[1]) {
    filtered = filtered.filter((row) => row.partnerId === partnerFind[1]);
  }
  const jobFind = new RegExp(
    `FIND\\('(rec[A-Za-z0-9]+)', ARRAYJOIN\\(\\{${jobField}\\}\\)\\)`,
  ).exec(formula);
  if (jobFind?.[1]) {
    filtered = filtered.filter((row) => row.jobId === jobFind[1]);
  }

  return filtered;
}

async function findAllocationFromJobPartners(
  recordId: string,
): Promise<Allocation | null> {
  const parsed = parseJobPartnerAllocationId(recordId);
  if (!parsed) {
    return null;
  }
  try {
    const job = await findRecord(getJobsTableName(), parsed.jobId);
    const partners = jobPartnerIds(job.fields as AirtableFields);
    if (!partners.includes(parsed.partnerId)) {
      return null;
    }
    return allocationFromJobPartner(
      parsed.jobId,
      parsed.partnerId,
    );
  } catch {
    return null;
  }
}

/**
 * Allocations repository — Airtable access + domain mapping only.
 * In `job_partners` mode, Jobs.Partners multi-links are the source of truth.
 */
export async function findAllocations(
  options: AirtableListOptions = {},
): Promise<Allocation[]> {
  if (getAllocationsMode() === "job_partners") {
    return findAllocationsFromJobPartners(options);
  }
  const records = await getRecords(getTableName(), options);
  return records.map((record) =>
    mapAllocationRecord({
      id: record.id,
      fields: record.fields as AirtableFields,
    }),
  );
}

export async function findAllocationById(
  recordId: string,
): Promise<Allocation | null> {
  if (getAllocationsMode() === "job_partners") {
    return findAllocationFromJobPartners(recordId);
  }
  try {
    const record = await findRecord(getTableName(), recordId);
    return mapAllocationRecord({
      id: record.id,
      fields: record.fields as AirtableFields,
    });
  } catch {
    return null;
  }
}

export async function insertAllocation(
  fields: AirtableFields,
): Promise<Allocation> {
  if (getAllocationsMode() === "job_partners") {
    const jobRaw = fields[ALLOCATIONS_TABLE_FIELDS.job];
    const partnerRaw = fields[ALLOCATIONS_TABLE_FIELDS.partner];
    const jobId = Array.isArray(jobRaw) ? jobRaw[0] : null;
    const partnerId = Array.isArray(partnerRaw) ? partnerRaw[0] : null;
    if (typeof jobId !== "string" || typeof partnerId !== "string") {
      throw new Error("Job and Partner are required to allocate via Jobs.Partners");
    }
    const job = await findRecord(getJobsTableName(), jobId);
    const existing = jobPartnerIds(job.fields as AirtableFields);
    if (!existing.includes(partnerId)) {
      await updateRecord(getJobsTableName(), jobId, {
        [JOBS_TABLE_FIELDS.partners]: [...existing, partnerId],
      });
    }
    return allocationFromJobPartner(jobId, partnerId);
  }

  const record = await createRecord(getTableName(), fields);
  return mapAllocationRecord({
    id: record.id,
    fields: record.fields as AirtableFields,
  });
}

export async function patchAllocation(
  recordId: string,
  fields: AirtableFields,
): Promise<Allocation> {
  if (getAllocationsMode() === "job_partners") {
    const current = await findAllocationFromJobPartners(recordId);
    if (!current) {
      throw new Error(`Allocation ${recordId} not found`);
    }
    // Client Jobs.Partners has no allocation status / counters.
    // Return a merged in-memory view so callers do not fail.
    const statusRaw = fields.Status;
    const status =
      typeof statusRaw === "string"
        ? (statusRaw.toLowerCase().replace(/\s+/g, "_") as Allocation["status"])
        : current.status;
    const profilesSubmitted =
      typeof fields["Profiles Submitted"] === "number"
        ? fields["Profiles Submitted"]
        : current.profilesSubmitted;
    const expectedProfiles =
      typeof fields["Expected Profiles"] === "number"
        ? fields["Expected Profiles"]
        : current.expectedProfiles;
    const notes =
      typeof fields.Notes === "string" ? fields.Notes : current.notes;

    if (status === "archived" || status === "cancelled") {
      const parsed = parseJobPartnerAllocationId(recordId);
      if (parsed) {
        const job = await findRecord(getJobsTableName(), parsed.jobId);
        const partners = jobPartnerIds(job.fields as AirtableFields).filter(
          (id) => id !== parsed.partnerId,
        );
        await updateRecord(getJobsTableName(), parsed.jobId, {
          [JOBS_TABLE_FIELDS.partners]: partners,
        });
      }
    }

    return {
      ...current,
      status: ["assigned", "working", "completed", "cancelled", "archived"].includes(
        status,
      )
        ? status
        : current.status,
      profilesSubmitted,
      expectedProfiles,
      notes,
    };
  }

  const record = await updateRecord(getTableName(), recordId, fields);
  return mapAllocationRecord({
    id: record.id,
    fields: record.fields as AirtableFields,
  });
}
