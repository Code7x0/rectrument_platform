import type { AirtableFields } from "@/lib/airtable/client";
import {
  AIRTABLE_ALLOCATION_STATUS,
  ALLOCATIONS_TABLE_FIELDS,
  DOMAIN_ALLOCATION_STATUS_TO_AIRTABLE,
} from "@/lib/airtable/fields";
import type {
  Allocation,
  AllocationStatus,
  CreateAllocationInput,
  UpdateAllocationInput,
} from "@/features/allocations/types";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function asLinkedId(value: unknown): string | null {
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return null;
}

function mapStatus(value: unknown): AllocationStatus {
  const raw = asString(value);
  if (!raw) {
    return "assigned";
  }
  return (
    AIRTABLE_ALLOCATION_STATUS[raw as keyof typeof AIRTABLE_ALLOCATION_STATUS] ??
    "assigned"
  );
}

export function mapAllocationRecord(record: {
  id: string;
  fields: AirtableFields;
}): Allocation {
  const fields = record.fields;
  const jobId = asLinkedId(fields[ALLOCATIONS_TABLE_FIELDS.job]);
  const partnerId = asLinkedId(fields[ALLOCATIONS_TABLE_FIELDS.partner]);

  if (!jobId) {
    throw new Error(`Allocation ${record.id} is missing Job`);
  }
  if (!partnerId) {
    throw new Error(`Allocation ${record.id} is missing Partner`);
  }

  return {
    id: record.id,
    allocationCode:
      asString(fields[ALLOCATIONS_TABLE_FIELDS.allocationId]) ??
      record.id.replace(/^rec/, "ALL-"),
    jobId,
    jobTitle: null,
    jobCode: null,
    partnerId,
    partnerCode: null,
    partnerName: null,
    accountManagerId: asLinkedId(
      fields[ALLOCATIONS_TABLE_FIELDS.accountManager],
    ),
    assignedById: asLinkedId(fields[ALLOCATIONS_TABLE_FIELDS.assignedBy]),
    assignedDate: asString(fields[ALLOCATIONS_TABLE_FIELDS.assignedDate]),
    status: mapStatus(fields[ALLOCATIONS_TABLE_FIELDS.status]),
    expectedProfiles: asNumber(
      fields[ALLOCATIONS_TABLE_FIELDS.expectedProfiles],
      1,
    ),
    profilesSubmitted: asNumber(
      fields[ALLOCATIONS_TABLE_FIELDS.profilesSubmitted],
      0,
    ),
    notes: asString(fields[ALLOCATIONS_TABLE_FIELDS.notes]),
  };
}

export function toAirtableCreateFields(
  input: CreateAllocationInput,
): AirtableFields {
  const fields: AirtableFields = {
    [ALLOCATIONS_TABLE_FIELDS.job]: [input.jobId],
    [ALLOCATIONS_TABLE_FIELDS.partner]: [input.partnerId],
    [ALLOCATIONS_TABLE_FIELDS.expectedProfiles]: input.expectedProfiles,
    [ALLOCATIONS_TABLE_FIELDS.profilesSubmitted]: 0,
    [ALLOCATIONS_TABLE_FIELDS.status]:
      DOMAIN_ALLOCATION_STATUS_TO_AIRTABLE[input.status ?? "assigned"],
    [ALLOCATIONS_TABLE_FIELDS.assignedDate]:
      input.assignedDate ?? new Date().toISOString().slice(0, 10),
  };

  if (input.accountManagerId) {
    fields[ALLOCATIONS_TABLE_FIELDS.accountManager] = [input.accountManagerId];
  }
  if (input.assignedById) {
    fields[ALLOCATIONS_TABLE_FIELDS.assignedBy] = [input.assignedById];
  }
  if (input.notes) {
    fields[ALLOCATIONS_TABLE_FIELDS.notes] = input.notes;
  }

  return fields;
}

export function toAirtableUpdateFields(
  input: UpdateAllocationInput,
): AirtableFields {
  const fields: AirtableFields = {};

  if (input.expectedProfiles !== undefined) {
    fields[ALLOCATIONS_TABLE_FIELDS.expectedProfiles] = input.expectedProfiles;
  }
  if (input.profilesSubmitted !== undefined) {
    fields[ALLOCATIONS_TABLE_FIELDS.profilesSubmitted] =
      input.profilesSubmitted;
  }
  if (input.status !== undefined) {
    fields[ALLOCATIONS_TABLE_FIELDS.status] =
      DOMAIN_ALLOCATION_STATUS_TO_AIRTABLE[input.status];
  }
  if (input.notes !== undefined) {
    fields[ALLOCATIONS_TABLE_FIELDS.notes] = input.notes || "";
  }
  if (input.assignedDate !== undefined) {
    fields[ALLOCATIONS_TABLE_FIELDS.assignedDate] = input.assignedDate;
  }

  return fields;
}
