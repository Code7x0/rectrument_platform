import type { AirtableFields } from "@/lib/airtable/client";
import {
  asLinkedId,
  asLinkedIds,
  asString,
  isClientCompatMode,
} from "@/lib/airtable/compat";
import {
  AIRTABLE_EMPLOYMENT_TYPE,
  AIRTABLE_JOB_PRIORITY,
  AIRTABLE_JOB_STATUS,
  JOBS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import type {
  CreateJobInput,
  EmploymentType,
  Job,
  JobPriority,
  JobStatus,
  UpdateJobInput,
} from "@/features/jobs/types";

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

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
}

function mapEnum<T extends string>(
  value: unknown,
  map: Record<string, T>,
): T | null {
  const raw = asString(value);
  if (!raw) {
    return null;
  }
  return map[raw] ?? null;
}

function descriptionFromFields(fields: AirtableFields): string | null {
  const notes = asString(fields[JOBS_TABLE_FIELDS.notes]);
  if (notes) {
    return notes;
  }
  const raw = fields[JOBS_TABLE_FIELDS.description];
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0] as { filename?: string; url?: string };
    if (typeof first.filename === "string" && first.filename.trim()) {
      return first.filename.trim();
    }
  }
  return asString(raw);
}

export function mapJobRecord(record: {
  id: string;
  fields: AirtableFields;
}): Job {
  const fields = record.fields;
  const title = asString(fields[JOBS_TABLE_FIELDS.title]) ?? "Untitled Job";
  const jobCode =
    asString(fields[JOBS_TABLE_FIELDS.jobId]) ??
    record.id.replace(/^rec/, "JOB-");

  return {
    id: record.id,
    jobCode,
    title,
    clientId: asLinkedId(fields[JOBS_TABLE_FIELDS.client]),
    clientName: null,
    accountManagerId: asLinkedId(fields[JOBS_TABLE_FIELDS.accountManager]),
    accountManagerName: null,
    hiringManager: asString(fields[JOBS_TABLE_FIELDS.hiringManager]),
    description: descriptionFromFields(fields),
    location: asString(fields[JOBS_TABLE_FIELDS.location]),
    employmentType: mapEnum(
      fields[JOBS_TABLE_FIELDS.employmentType],
      AIRTABLE_EMPLOYMENT_TYPE,
    ),
    experience: asString(fields[JOBS_TABLE_FIELDS.experience]),
    salary: asString(fields[JOBS_TABLE_FIELDS.salary]),
    priority: mapEnum(fields[JOBS_TABLE_FIELDS.priority], AIRTABLE_JOB_PRIORITY),
    openPositions: asNumber(fields[JOBS_TABLE_FIELDS.openPositions], 1),
    skills: asStringArray(fields[JOBS_TABLE_FIELDS.skills]),
    status:
      mapEnum(fields[JOBS_TABLE_FIELDS.status], AIRTABLE_JOB_STATUS) ?? "open",
    notes: asString(fields[JOBS_TABLE_FIELDS.notes]),
    department: asString(fields[JOBS_TABLE_FIELDS.department]),
    createdById: asLinkedId(fields[JOBS_TABLE_FIELDS.createdBy]),
    createdAt: asString(fields[JOBS_TABLE_FIELDS.createdAt]),
  };
}

/** Partner record ids linked on Jobs.Partners (client allocation source). */
export function jobPartnerIds(fields: AirtableFields): string[] {
  return asLinkedIds(fields[JOBS_TABLE_FIELDS.partners]);
}

export function toAirtableCreateFields(
  input: CreateJobInput,
  maps: {
    status: Record<JobStatus, string>;
    priority: Record<JobPriority, string>;
    employmentType: Record<EmploymentType, string>;
  },
): AirtableFields {
  const clientMode = isClientCompatMode();
  const fields: AirtableFields = {
    [JOBS_TABLE_FIELDS.title]: input.title,
    [JOBS_TABLE_FIELDS.client]: [input.clientId],
    [JOBS_TABLE_FIELDS.status]: maps.status[input.status ?? "open"],
  };

  if (!clientMode) {
    fields[JOBS_TABLE_FIELDS.accountManager] = [input.accountManagerId];
    fields[JOBS_TABLE_FIELDS.openPositions] = input.openPositions ?? 1;
  }

  if (input.hiringManager) {
    fields[JOBS_TABLE_FIELDS.hiringManager] = input.hiringManager;
  }
  if (input.description) {
    // Client Job Description is attachments — persist text on Comments.
    fields[JOBS_TABLE_FIELDS.notes] = input.description;
  }
  if (input.location) {
    fields[JOBS_TABLE_FIELDS.location] = input.location;
  }
  if (!clientMode && input.employmentType) {
    fields[JOBS_TABLE_FIELDS.employmentType] =
      maps.employmentType[input.employmentType];
  }
  if (input.experience) {
    fields[JOBS_TABLE_FIELDS.experience] = input.experience;
  }
  if (input.salary) {
    fields[JOBS_TABLE_FIELDS.salary] = input.salary;
  }
  if (!clientMode && input.priority) {
    fields[JOBS_TABLE_FIELDS.priority] = maps.priority[input.priority];
  }
  if (!clientMode && input.skills && input.skills.length > 0) {
    fields[JOBS_TABLE_FIELDS.skills] = input.skills.join(", ");
  }
  if (input.notes && !input.description) {
    fields[JOBS_TABLE_FIELDS.notes] = input.notes;
  }
  if (input.department) {
    fields[JOBS_TABLE_FIELDS.department] = input.department;
  }
  if (!clientMode && input.createdById) {
    fields[JOBS_TABLE_FIELDS.createdBy] = [input.createdById];
  }

  return fields;
}

export function toAirtableUpdateFields(
  input: UpdateJobInput,
  maps: {
    status: Record<JobStatus, string>;
    priority: Record<JobPriority, string>;
    employmentType: Record<EmploymentType, string>;
  },
): AirtableFields {
  const fields: AirtableFields = {};
  const clientMode = isClientCompatMode();

  if (input.title !== undefined) {
    fields[JOBS_TABLE_FIELDS.title] = input.title;
  }
  if (input.clientId !== undefined) {
    fields[JOBS_TABLE_FIELDS.client] = [input.clientId];
  }
  if (!clientMode && input.accountManagerId !== undefined) {
    fields[JOBS_TABLE_FIELDS.accountManager] = [input.accountManagerId];
  }
  if (input.hiringManager !== undefined) {
    fields[JOBS_TABLE_FIELDS.hiringManager] = input.hiringManager || "";
  }
  if (input.description !== undefined) {
    fields[JOBS_TABLE_FIELDS.notes] = input.description || "";
  }
  if (input.location !== undefined) {
    fields[JOBS_TABLE_FIELDS.location] = input.location || "";
  }
  if (!clientMode && input.employmentType !== undefined) {
    fields[JOBS_TABLE_FIELDS.employmentType] = input.employmentType
      ? maps.employmentType[input.employmentType]
      : "";
  }
  if (input.experience !== undefined) {
    fields[JOBS_TABLE_FIELDS.experience] = input.experience || "";
  }
  if (input.salary !== undefined) {
    fields[JOBS_TABLE_FIELDS.salary] = input.salary || "";
  }
  if (!clientMode && input.priority !== undefined) {
    fields[JOBS_TABLE_FIELDS.priority] = input.priority
      ? maps.priority[input.priority]
      : "";
  }
  if (!clientMode && input.openPositions !== undefined) {
    fields[JOBS_TABLE_FIELDS.openPositions] = input.openPositions;
  }
  if (!clientMode && input.skills !== undefined) {
    fields[JOBS_TABLE_FIELDS.skills] =
      input.skills.length > 0 ? input.skills.join(", ") : "";
  }
  if (input.status !== undefined) {
    fields[JOBS_TABLE_FIELDS.status] = maps.status[input.status];
  }
  if (input.notes !== undefined && input.description === undefined) {
    fields[JOBS_TABLE_FIELDS.notes] = input.notes || "";
  }
  if (input.department !== undefined) {
    fields[JOBS_TABLE_FIELDS.department] = input.department || "";
  }

  return fields;
}
