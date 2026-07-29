import { getRecords, type AirtableFields } from "@/lib/airtable/client";
import {
  asSelectList,
  getAllocationsMode,
  isClientCompatMode,
} from "@/lib/airtable/compat";
import {
  ALLOCATIONS_TABLE_FIELDS,
  PARTNERS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import {
  displayBusinessId,
  isSyntheticDisplayId,
  isValidPartnerCode,
} from "@/lib/business-ids";
import { getAirtableTableName } from "@/lib/airtable/tables";
import { getClientById } from "@/features/clients/services";
import { getJobById, listJobs } from "@/features/jobs/services";
import {
  findAllocationById,
  findAllocations,
  insertAllocation,
  patchAllocation,
} from "@/features/allocations/repositories/allocations.repository";
import {
  toAirtableCreateFields,
  toAirtableUpdateFields,
} from "@/features/allocations/services/allocations.mapper";
import { buildAllocationsFilterFormula } from "@/features/allocations/services/allocations.validation";
import {
  ACTIVE_ALLOCATION_STATUSES,
  type Allocation,
  type AllocationListFilters,
  type CreateAllocationInput,
  type UpdateAllocationInput,
} from "@/features/allocations/types";
import { operationalPartnerLabel } from "@/features/partners/services/partner-privacy";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

type PartnerMeta = {
  partnerCode: string;
  specialization: string | null;
  identityLabel: string | null;
  identityVisibility: "public" | "private";
};

async function loadPartnerMetaMap(
  partnerIds: string[],
): Promise<Map<string, PartnerMeta>> {
  const unique = [...new Set(partnerIds.filter(Boolean))];
  const map = new Map<string, PartnerMeta>();
  if (unique.length === 0) {
    return map;
  }

  const records = await getRecords(getAirtableTableName("partnersTable"), {
    filterByFormula: `OR(${unique
      .map((id) => `RECORD_ID() = '${id}'`)
      .join(",")})`,
  });

  for (const record of records) {
    const fields = record.fields as AirtableFields;
    const rawCode = asString(fields[PARTNERS_TABLE_FIELDS.partnerId]);
    const partnerCode = isValidPartnerCode(rawCode)
      ? rawCode!.trim().toUpperCase()
      : displayBusinessId(rawCode);
    const company = asString(fields[PARTNERS_TABLE_FIELDS.companyName]);
    const contact = asString(fields[PARTNERS_TABLE_FIELDS.name]);
    const specialization = asSelectList(
      fields[PARTNERS_TABLE_FIELDS.specialization],
    );
    const visibilityRaw = asString(
      fields[PARTNERS_TABLE_FIELDS.identityVisibility],
    );
    const identityVisibility =
      visibilityRaw === "PUBLIC" ? "public" : "private";
    const identityLabel =
      company && contact
        ? `${company} — ${contact}`
        : (company ?? contact ?? null);

    map.set(record.id, {
      partnerCode,
      specialization,
      identityLabel,
      identityVisibility,
    });
  }

  return map;
}

async function withEnrichment(
  allocations: Allocation[],
  includePartnerIdentity: boolean,
): Promise<Allocation[]> {
  if (allocations.length === 0) {
    return allocations;
  }

  const [jobs, partnerMeta, submissionCounts] = await Promise.all([
    listJobs({ includeArchived: true }),
    loadPartnerMetaMap(allocations.map((row) => row.partnerId)),
    getAllocationsMode() === "job_partners"
      ? import("@/features/submissions/services").then(async ({ listSubmissions }) => {
          const rows = await listSubmissions();
          const counts = new Map<string, number>();
          for (const row of rows) {
            const key = `${row.jobId}::${row.partnerId}`;
            counts.set(key, (counts.get(key) ?? 0) + 1);
          }
          return counts;
        })
      : Promise.resolve(null as Map<string, number> | null),
  ]);

  const jobMap = new Map(jobs.map((job) => [job.id, job]));

  return allocations.map((allocation) => {
    const job = jobMap.get(allocation.jobId);
    const meta = partnerMeta.get(allocation.partnerId);
    const partnerCode =
      meta?.partnerCode ?? displayBusinessId(null);
    const showIdentity =
      includePartnerIdentity || meta?.identityVisibility === "public";
    const partnerName = showIdentity
      ? (meta?.identityLabel ?? null)
      : null;
    const jobCode = job?.jobCode ?? null;
    const jobTitle = job?.title ?? null;
    const allocationCode = formatAllocationDisplayCode(jobCode, partnerCode, {
      jobTitle,
      partnerLabel: meta?.identityLabel ?? null,
    });

    const derivedCount = submissionCounts?.get(
      `${allocation.jobId}::${allocation.partnerId}`,
    );

    return {
      ...allocation,
      allocationCode,
      jobTitle,
      jobCode,
      accountManagerId:
        allocation.accountManagerId ?? job?.accountManagerId ?? null,
      partnerCode,
      partnerName,
      profilesSubmitted:
        derivedCount !== undefined
          ? derivedCount
          : allocation.profilesSubmitted,
    };
  });
}

function shortCodePart(
  value: string | null | undefined,
  fallback: string,
): string {
  if (!value?.trim() || value.trim() === "—" || isSyntheticDisplayId(value)) {
    return fallback;
  }
  return value.trim().toUpperCase().slice(0, 16);
}

function shortFromJobTitle(title: string | null | undefined): string | null {
  if (!title?.trim()) {
    return null;
  }
  const words = title
    .trim()
    .split(/[\s/-]+/)
    .filter((w) => w.length > 0 && !/^(to|of|the|and|a|an)$/i.test(w));
  if (words.length === 0) {
    return null;
  }
  if (words.length === 1) {
    const only = words[0] ?? "";
    return only.slice(0, 4).toUpperCase();
  }
  return words
    .slice(0, 3)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function initialsFromLabel(label: string | null | undefined): string | null {
  if (!label?.trim()) {
    return null;
  }
  const name = label.includes("—")
    ? (label.split("—").pop()?.trim() ?? label.trim())
    : label.trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  if (parts.length === 1) {
    const only = parts[0] ?? "";
    return only.slice(0, 3).toUpperCase();
  }
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? "";
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

/**
 * Human-readable code: JOBCODE-PARTNERCODE (never raw Airtable / jp_ ids).
 * Falls back to short job title + partner initials when business codes are missing.
 */
export function formatAllocationDisplayCode(
  jobCode: string | null | undefined,
  partnerCode: string | null | undefined,
  options?: {
    jobTitle?: string | null;
    partnerLabel?: string | null;
  },
): string {
  const job = shortCodePart(
    jobCode,
    shortFromJobTitle(options?.jobTitle) ?? "JOB",
  );
  const partner = shortCodePart(
    partnerCode,
    initialsFromLabel(options?.partnerLabel) ?? "TP",
  );
  return `${job}-${partner}`;
}

function applySearchFilter(
  allocations: Allocation[],
  search?: string,
): Allocation[] {
  if (!search?.trim()) {
    return allocations;
  }

  const q = search.trim().toLowerCase();
  return allocations.filter(
    (row) =>
      (row.allocationCode?.toLowerCase().includes(q) ?? false) ||
      (row.jobTitle?.toLowerCase().includes(q) ?? false) ||
      (row.jobCode?.toLowerCase().includes(q) ?? false) ||
      (row.partnerCode?.toLowerCase().includes(q) ?? false) ||
      (row.partnerName?.toLowerCase().includes(q) ?? false) ||
      (row.notes?.toLowerCase().includes(q) ?? false),
  );
}

export async function listAllocations(
  filters: AllocationListFilters = {},
): Promise<Allocation[]> {
  const {
    search,
    includePartnerIdentity = false,
    jobIds,
    jobId,
    partnerId,
    ...airtableFilters
  } = filters;

  // Do not FIND(recId) via ARRAYJOIN — linked fields join display names, not ids.
  // Filter jobId / partnerId in memory after fetch (works in table + job_partners modes).
  const formula = buildAllocationsFilterFormula({
    ...airtableFilters,
    jobId: undefined,
    partnerId: undefined,
    search: undefined,
  });

  const rows = await findAllocations({
    ...(formula ? { filterByFormula: formula } : {}),
    sort: [{ field: ALLOCATIONS_TABLE_FIELDS.assignedDate, direction: "desc" }],
  });

  let scoped = rows;
  if (jobId && jobId !== "all") {
    scoped = scoped.filter((row) => row.jobId === jobId);
  }
  if (partnerId && partnerId !== "all") {
    scoped = scoped.filter((row) => row.partnerId === partnerId);
  }
  if (jobIds) {
    if (jobIds.length === 0) {
      return [];
    }
    const allowed = new Set(jobIds);
    scoped = scoped.filter((row) => allowed.has(row.jobId));
  }

  return applySearchFilter(
    await withEnrichment(scoped, includePartnerIdentity),
    search,
  );
}

export async function getAllocationById(
  allocationId: string,
  options: { includePartnerIdentity?: boolean } = {},
): Promise<Allocation | null> {
  const row = await findAllocationById(allocationId);
  if (!row) {
    return null;
  }

  const [enriched] = await withEnrichment(
    [row],
    options.includePartnerIdentity ?? false,
  );
  return enriched ?? null;
}

/**
 * Create an allocation from a Job. Job id is required — never orphan allocations.
 * One job may have many partners; the same active partner cannot be allocated twice.
 */
export async function allocatePartner(
  input: CreateAllocationInput,
): Promise<Allocation> {
  const job = await getJobById(input.jobId);
  if (!job) {
    throw new Error("Job not found — allocations must originate from a Job");
  }
  if (job.status === "archived") {
    throw new Error("Cannot allocate talent partners to an archived job");
  }

  let accountManagerId = input.accountManagerId ?? job.accountManagerId;
  if (!accountManagerId && job.clientId && isClientCompatMode()) {
    const client = await getClientById(job.clientId);
    accountManagerId = client?.accountManagerId ?? null;
  }
  if (!accountManagerId && !isClientCompatMode()) {
    throw new Error(
      "Job must have an Assigned Account Manager before allocating partners",
    );
  }

  const existing = await listAllocations({
    jobId: input.jobId,
    partnerId: input.partnerId,
    includeArchived: false,
  });
  if (existing.length > 0) {
    throw new Error(
      "This talent partner is already allocated to the job",
    );
  }

  const created = await insertAllocation(
    toAirtableCreateFields({
      ...input,
      accountManagerId: accountManagerId ?? undefined,
      assignedById: input.assignedById,
    }),
  );
  const [allocation] = await withEnrichment([created], false);

  if (!allocation) {
    throw new Error("Failed to create allocation");
  }

  try {
    const {
      notifyAllocationCreated,
      notifyJobAssigned,
    } = await import("@/features/notifications/services/notification-events");
    await notifyJobAssigned({
      partnerId: allocation.partnerId,
      jobTitle: allocation.jobTitle ?? job.title,
      jobId: allocation.jobId,
      allocationId: allocation.id,
    });
    await notifyAllocationCreated({
      accountManagerId: allocation.accountManagerId,
      partnerCode: allocation.partnerCode ?? allocation.partnerId,
      jobTitle: allocation.jobTitle ?? job.title,
      allocationId: allocation.id,
    });
  } catch (error) {
    console.error("Failed to publish allocation notifications", error);
  }

  return allocation;
}

export async function updateAllocation(
  allocationId: string,
  input: UpdateAllocationInput,
): Promise<Allocation> {
  const updated = await patchAllocation(
    allocationId,
    toAirtableUpdateFields(input),
  );
  const [allocation] = await withEnrichment([updated], false);

  if (!allocation) {
    throw new Error("Failed to update allocation");
  }

  return allocation;
}

/** Soft-delete: Status = Archived. */
export async function archiveAllocation(
  allocationId: string,
): Promise<Allocation> {
  return updateAllocation(allocationId, { status: "archived" });
}

/**
 * Feature 5+: Partner Work Queue / Tasks sources active allocations for a partner.
 */
export async function listActiveAllocationsForPartner(
  partnerId: string,
): Promise<Allocation[]> {
  if (!partnerId) {
    return [];
  }

  const allocations = await listAllocations({
    partnerId,
    includeArchived: false,
    includePartnerIdentity: false,
  });

  return allocations.filter((row) =>
    ACTIVE_ALLOCATION_STATUSES.includes(row.status),
  );
}

/** Safe display helper for tables. */
export function allocationPartnerDisplay(row: Allocation): string {
  if (row.partnerName) {
    return row.partnerName;
  }
  return operationalPartnerLabel({
    id: row.partnerId,
    partnerCode: row.partnerCode,
  });
}
