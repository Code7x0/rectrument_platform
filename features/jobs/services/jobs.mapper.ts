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
import {
  isValidJobCode,
  parseJobAmAssignment,
  parseJobIdMarker,
  stripJobSystemMarkers,
  upsertJobIdMarker,
  upsertJobAmMarker,
} from "@/lib/business-ids";
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

function asAttachments(
  value: unknown,
): Array<{ url: string; filename: string }> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      const row = item as { url?: string; filename?: string };
      if (typeof row.url !== "string" || !row.url.trim()) {
        return null;
      }
      return {
        url: row.url.trim(),
        filename:
          typeof row.filename === "string" && row.filename.trim()
            ? row.filename.trim()
            : "Attachment",
      };
    })
    .filter((row): row is { url: string; filename: string } => Boolean(row));
}

function collectJobDocuments(fields: AirtableFields): Job["documents"] {
  const groups: Array<{ label: string; field: string }> = [
    { label: "Job Description", field: JOBS_TABLE_FIELDS.description },
    { label: "Sample Profiling", field: JOBS_TABLE_FIELDS.sampleProfiling },
    {
      label: "Skill Matrix Fitment",
      field: JOBS_TABLE_FIELDS.skillMatrixFitment,
    },
  ];

  const docs: Job["documents"] = [];
  for (const group of groups) {
    for (const file of asAttachments(fields[group.field])) {
      docs.push({
        label: group.label,
        url: file.url,
        filename: file.filename,
      });
    }
  }
  return docs;
}

/**
 * Prefer readable text description (Comments after Job ID marker strip).
 * Attachment JD files are exposed separately via `documents` — do not
 * duplicate filenames into the description field.
 */
function descriptionFromFields(fields: AirtableFields): string | null {
  const notes = stripJobSystemMarkers(asString(fields[JOBS_TABLE_FIELDS.notes]));
  if (notes) {
    return notes;
  }

  const raw = fields[JOBS_TABLE_FIELDS.description];
  const asText = asString(raw);
  if (asText) {
    return asText;
  }

  return null;
}

function resolveAccountManagerIds(
  input: Pick<CreateJobInput, "accountManagerId" | "accountManagerIds">,
): string[] {
  if (input.accountManagerIds !== undefined) {
    return Array.from(
      new Set(input.accountManagerIds.map((id) => id.trim()).filter(Boolean)),
    );
  }
  const single = input.accountManagerId?.trim();
  return single ? [single] : [];
}

function resolveJobCode(fields: AirtableFields): string {
  const fromField = asString(fields[JOBS_TABLE_FIELDS.jobId]);
  if (isValidJobCode(fromField)) {
    return fromField!.trim().toUpperCase();
  }
  const fromMarker = parseJobIdMarker(asString(fields[JOBS_TABLE_FIELDS.notes]));
  if (fromMarker) {
    return fromMarker;
  }
  // No synthetic JOB-rec… fallback — migrate or create assigns a business ID.
  return "";
}

export function mapJobRecord(record: {
  id: string;
  fields: AirtableFields;
}): Job {
  const fields = record.fields;
  const title = asString(fields[JOBS_TABLE_FIELDS.title]) ?? "Untitled Job";
  const jobCode = resolveJobCode(fields);

  const notesRaw = asString(fields[JOBS_TABLE_FIELDS.notes]);
  const amAssignment = parseJobAmAssignment(notesRaw);
  const linkedAmIds = asLinkedIds(fields[JOBS_TABLE_FIELDS.accountManager]);
  const markerAmIds =
    amAssignment?.kind === "assigned" ? amAssignment.accountManagerIds : [];
  const accountManagerIds =
    linkedAmIds.length > 0 ? linkedAmIds : markerAmIds;

  return {
    id: record.id,
    jobCode,
    title,
    clientId: asLinkedId(fields[JOBS_TABLE_FIELDS.client]),
    clientName: null,
    clientCode: null,
    accountManagerId: accountManagerIds[0] ?? null,
    accountManagerIds,
    accountManagerName: null,
    accountManagerUnassigned: amAssignment?.kind === "unassigned",
    hiringManager: asString(fields[JOBS_TABLE_FIELDS.hiringManager]),
    description: descriptionFromFields(fields),
    documents: collectJobDocuments(fields),
    location: asString(fields[JOBS_TABLE_FIELDS.location]),
    workMode: asString(fields[JOBS_TABLE_FIELDS.workMode]),
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
    notes: stripJobSystemMarkers(notesRaw),
    department: asString(fields[JOBS_TABLE_FIELDS.department]),
    interviewProcess: asString(fields[JOBS_TABLE_FIELDS.interviewProcess]),
    seniorityLevel: asString(fields[JOBS_TABLE_FIELDS.seniorityLevel]),
    createdById: asLinkedId(fields[JOBS_TABLE_FIELDS.createdBy]),
    createdAt: asString(fields[JOBS_TABLE_FIELDS.createdAt]),
    startDate: asString(fields[JOBS_TABLE_FIELDS.startDate]),
    postedDate: asString(fields[JOBS_TABLE_FIELDS.postedDate]),
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
  options?: { jobCode?: string },
): AirtableFields {
  const clientMode = isClientCompatMode();
  const fields: AirtableFields = {
    [JOBS_TABLE_FIELDS.title]: input.title,
    [JOBS_TABLE_FIELDS.client]: [input.clientId],
    [JOBS_TABLE_FIELDS.status]: maps.status[input.status ?? "open"],
  };

  if (!clientMode) {
    const amIds = resolveAccountManagerIds(input);
    if (amIds.length > 0) {
      fields[JOBS_TABLE_FIELDS.accountManager] = amIds;
    }
    fields[JOBS_TABLE_FIELDS.openPositions] = input.openPositions ?? 1;
  }

  if (input.hiringManager) {
    fields[JOBS_TABLE_FIELDS.hiringManager] = input.hiringManager;
  }
  let commentsText = "";
  if (input.description) {
    // Client Job Description is attachments — persist text on Comments.
    commentsText = input.description;
  } else if (input.notes) {
    commentsText = input.notes;
  }
  if (options?.jobCode) {
    commentsText = upsertJobIdMarker(commentsText, options.jobCode);
    if (!clientMode) {
      fields[JOBS_TABLE_FIELDS.jobId] = options.jobCode;
    }
  }
  if (clientMode) {
    const amIds = resolveAccountManagerIds(input);
    if (amIds.length > 0) {
      commentsText = upsertJobAmMarker(commentsText, amIds);
    }
  }
  if (commentsText) {
    fields[JOBS_TABLE_FIELDS.notes] = commentsText;
  }
  if (input.location) {
    fields[JOBS_TABLE_FIELDS.location] = input.location;
  }
  if (input.workMode?.trim()) {
    fields[JOBS_TABLE_FIELDS.workMode] = input.workMode.trim();
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
  if (!clientMode && input.accountManagerIds !== undefined) {
    fields[JOBS_TABLE_FIELDS.accountManager] = input.accountManagerIds.filter(
      Boolean,
    );
  } else if (!clientMode && input.accountManagerId !== undefined) {
    fields[JOBS_TABLE_FIELDS.accountManager] = input.accountManagerId
      ? [input.accountManagerId]
      : [];
  }
  if (input.hiringManager !== undefined) {
    fields[JOBS_TABLE_FIELDS.hiringManager] = input.hiringManager || "";
  }
  if (input.description !== undefined) {
    // Preserve [RP_JOBID] marker when rewriting Comments.
    fields[JOBS_TABLE_FIELDS.notes] = input.description || "";
  }
  if (input.notes !== undefined && input.description === undefined) {
    fields[JOBS_TABLE_FIELDS.notes] = input.notes || "";
  }
  if (input.location !== undefined) {
    fields[JOBS_TABLE_FIELDS.location] = input.location || "";
  }
  if (input.workMode !== undefined) {
    fields[JOBS_TABLE_FIELDS.workMode] = input.workMode?.trim() || "";
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
  if (input.department !== undefined) {
    fields[JOBS_TABLE_FIELDS.department] = input.department || "";
  }

  return fields;
}
