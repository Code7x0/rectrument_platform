import type { AirtableFields } from "@/lib/airtable/client";
import {
  asLinkedId,
  asString,
  buildJobPartnerAllocationId,
  getSubmissionsMode,
} from "@/lib/airtable/compat";
import {
  AIRTABLE_SUBMISSION_STATUS,
  CANDIDATES_TABLE_FIELDS,
  DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE,
  SUBMISSIONS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import type {
  CreateSubmissionInput,
  Submission,
  SubmissionStatus,
} from "@/features/submissions/types";

/** Internal key — stripped before Airtable write in candidates mode. */
export const SUBMISSION_PATCH_CANDIDATE_ID = "_patchCandidateRecordId";

function mapStatus(value: unknown): SubmissionStatus {
  const raw = asString(value);
  if (!raw) {
    return "submitted";
  }
  return (
    AIRTABLE_SUBMISSION_STATUS[
      raw as keyof typeof AIRTABLE_SUBMISSION_STATUS
    ] ?? "submitted"
  );
}

export function mapSubmissionRecord(record: {
  id: string;
  fields: AirtableFields;
}): Submission {
  const fields = record.fields;
  const mode = getSubmissionsMode();

  // Locked client data often has Role populated and Job empty (same Jobs table).
  const jobId =
    asLinkedId(fields[SUBMISSIONS_TABLE_FIELDS.job]) ??
    asLinkedId(fields[SUBMISSIONS_TABLE_FIELDS.role]);
  const partnerId = asLinkedId(fields[SUBMISSIONS_TABLE_FIELDS.partner]);

  if (mode === "candidates") {
    if (!jobId || !partnerId) {
      throw new Error(
        `Submission ${record.id} is missing Job/Role or Submitted By (Partner)`,
      );
    }
    return {
      id: record.id,
      submissionCode: (() => {
        const raw = fields[SUBMISSIONS_TABLE_FIELDS.submissionId];
        if (typeof raw === "number") {
          return String(raw);
        }
        // Keep Airtable autoNumber when present; never invent SUB-rec… codes.
        return asString(raw);
      })(),
      candidateId: record.id,
      candidateName: asString(fields[SUBMISSIONS_TABLE_FIELDS.candidateName]),
      jobId,
      jobTitle: null,
      jobCode: null,
      allocationId: buildJobPartnerAllocationId(jobId, partnerId),
      partnerId,
      partnerName: null,
      partnerCode: null,
      submissionDate: asString(fields[SUBMISSIONS_TABLE_FIELDS.submissionDate]),
      status: mapStatus(fields[SUBMISSIONS_TABLE_FIELDS.status]),
      remarks: asString(fields[SUBMISSIONS_TABLE_FIELDS.remarks]),
      jobPriority: null,
    };
  }

  const candidateId = asLinkedId(fields[SUBMISSIONS_TABLE_FIELDS.candidate]);
  const allocationId = asLinkedId(fields[SUBMISSIONS_TABLE_FIELDS.allocation]);

  if (!candidateId || !jobId || !allocationId || !partnerId) {
    throw new Error(`Submission ${record.id} is missing required links`);
  }

  return {
    id: record.id,
    submissionCode: asString(fields[SUBMISSIONS_TABLE_FIELDS.submissionId]),
    candidateId,
    candidateName: null,
    jobId,
    jobTitle: null,
    jobCode: null,
    allocationId,
    partnerId,
    partnerName: null,
    partnerCode: null,
    submissionDate: asString(fields[SUBMISSIONS_TABLE_FIELDS.submissionDate]),
    status: mapStatus(fields[SUBMISSIONS_TABLE_FIELDS.status]),
    remarks: asString(fields[SUBMISSIONS_TABLE_FIELDS.remarks]),
    jobPriority: null,
  };
}

export function toAirtableCreateFields(
  input: CreateSubmissionInput,
): AirtableFields {
  if (getSubmissionsMode() === "candidates") {
    const fields: AirtableFields = {
      [SUBMISSION_PATCH_CANDIDATE_ID]: input.candidateId,
      /**
       * Locked client base: Role is the populated Jobs link. Writing Job as well
       * often fails (empty/read-only/duplicate link) and leaves resume-only orphans.
       */
      [SUBMISSIONS_TABLE_FIELDS.role]: [input.jobId],
      [SUBMISSIONS_TABLE_FIELDS.partner]: [input.partnerId],
      [SUBMISSIONS_TABLE_FIELDS.submissionDate]:
        input.submissionDate ?? new Date().toISOString().slice(0, 10),
      [SUBMISSIONS_TABLE_FIELDS.status]:
        DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE[input.status ?? "submitted"],
    };
    if (input.remarks) {
      fields[SUBMISSIONS_TABLE_FIELDS.remarks] = input.remarks;
    }
    return fields;
  }

  const fields: AirtableFields = {
    [SUBMISSIONS_TABLE_FIELDS.candidate]: [input.candidateId],
    [SUBMISSIONS_TABLE_FIELDS.job]: [input.jobId],
    [SUBMISSIONS_TABLE_FIELDS.allocation]: [input.allocationId],
    [SUBMISSIONS_TABLE_FIELDS.partner]: [input.partnerId],
    [SUBMISSIONS_TABLE_FIELDS.submissionDate]:
      input.submissionDate ?? new Date().toISOString().slice(0, 10),
    [SUBMISSIONS_TABLE_FIELDS.status]:
      DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE[input.status ?? "submitted"],
  };

  if (input.remarks) {
    fields[SUBMISSIONS_TABLE_FIELDS.remarks] = input.remarks;
  }

  return fields;
}

/**
 * Atomic Candidates-row create for client mode: person + Role + Partner + status
 * in one write so lists never see resume-only orphans.
 */
export function toAirtableCandidateSubmissionCreateFields(input: {
  fullName: string;
  email: string;
  phone?: string;
  currentCompany?: string;
  currentLocation?: string;
  experience?: string;
  currentCtc?: string;
  expectedCtc?: string;
  noticePeriod?: string;
  skills?: string[];
  remarks?: string;
  jobId: string;
  partnerId: string;
  status?: SubmissionStatus;
  submissionDate?: string;
}): AirtableFields {
  const fields: AirtableFields = {
    [SUBMISSIONS_TABLE_FIELDS.candidateName]: input.fullName,
    [SUBMISSIONS_TABLE_FIELDS.email]: input.email,
    [SUBMISSIONS_TABLE_FIELDS.role]: [input.jobId],
    [SUBMISSIONS_TABLE_FIELDS.partner]: [input.partnerId],
    [SUBMISSIONS_TABLE_FIELDS.submissionDate]:
      input.submissionDate ?? new Date().toISOString().slice(0, 10),
    [SUBMISSIONS_TABLE_FIELDS.status]:
      DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE[input.status ?? "submitted"],
  };

  if (input.phone) {
    fields[SUBMISSIONS_TABLE_FIELDS.phone] = input.phone;
  }
  if (input.currentLocation) {
    fields[SUBMISSIONS_TABLE_FIELDS.currentLocation] = input.currentLocation;
  }
  if (input.currentCtc) {
    fields[SUBMISSIONS_TABLE_FIELDS.currentCtc] = input.currentCtc;
  }
  if (input.expectedCtc) {
    fields[SUBMISSIONS_TABLE_FIELDS.expectedCtc] = input.expectedCtc;
  }
  if (input.noticePeriod) {
    fields[SUBMISSIONS_TABLE_FIELDS.noticePeriod] = input.noticePeriod;
  }
  if (input.remarks) {
    fields[SUBMISSIONS_TABLE_FIELDS.remarks] = input.remarks;
  }

  // Native person columns that exist on Candidates but are not aliases above.
  if (input.currentCompany) {
    fields[CANDIDATES_TABLE_FIELDS.currentCompany] = input.currentCompany;
  }
  if (input.experience) {
    fields[CANDIDATES_TABLE_FIELDS.experience] = input.experience;
  }
  if (input.skills?.length) {
    fields[CANDIDATES_TABLE_FIELDS.skills] = input.skills.join(", ");
  }

  return fields;
}

export function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

export function buildSubmissionsFilterFormula(filters: {
  partnerId?: string;
  jobId?: string;
  allocationId?: string;
}): string {
  const clauses: string[] = [];
  const mode = getSubmissionsMode();

  if (filters.partnerId) {
    clauses.push(
      `FIND('${escapeFormulaValue(filters.partnerId)}', ARRAYJOIN({${SUBMISSIONS_TABLE_FIELDS.partner}}))`,
    );
  }
  if (filters.jobId) {
    clauses.push(
      `OR(FIND('${escapeFormulaValue(filters.jobId)}', ARRAYJOIN({${SUBMISSIONS_TABLE_FIELDS.job}})),FIND('${escapeFormulaValue(filters.jobId)}', ARRAYJOIN({${SUBMISSIONS_TABLE_FIELDS.role}})))`,
    );
  }
  if (filters.allocationId && mode === "table") {
    clauses.push(
      `FIND('${escapeFormulaValue(filters.allocationId)}', ARRAYJOIN({${SUBMISSIONS_TABLE_FIELDS.allocation}}))`,
    );
  }

  if (clauses.length === 0) {
    return "";
  }
  if (clauses.length === 1) {
    return clauses[0] ?? "";
  }
  return `AND(${clauses.join(",")})`;
}
