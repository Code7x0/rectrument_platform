import type { AirtableFields } from "@/lib/airtable/client";
import { asString, isClientCompatMode } from "@/lib/airtable/compat";
import { CANDIDATES_TABLE_FIELDS } from "@/lib/airtable/fields";
import type {
  Candidate,
  CreateCandidateInput,
} from "@/features/candidates/types";

function asSkills(value: unknown): string[] {
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

function asAttachment(value: unknown): {
  url: string | null;
  filename: string | null;
} {
  if (!Array.isArray(value) || value.length === 0) {
    return { url: null, filename: null };
  }
  const first = value[0] as { url?: string; filename?: string };
  return {
    url: typeof first.url === "string" ? first.url : null,
    filename: typeof first.filename === "string" ? first.filename : null,
  };
}

/** Client field has trailing space: "Current CTC ". */
function readCurrentCtc(fields: AirtableFields): string | null {
  return (
    asString(fields[CANDIDATES_TABLE_FIELDS.currentCtc]) ??
    asString(fields["Current CTC"])
  );
}

export function mapCandidateRecord(record: {
  id: string;
  fields: AirtableFields;
}): Candidate {
  const fields = record.fields;
  const resume = asAttachment(fields[CANDIDATES_TABLE_FIELDS.resume]);
  const fullName =
    asString(fields[CANDIDATES_TABLE_FIELDS.fullName]) ??
    asString(fields["Full Name"]) ??
    "Unnamed Candidate";
  const email = asString(fields[CANDIDATES_TABLE_FIELDS.email]) ?? "";

  return {
    id: record.id,
    fullName,
    email,
    phone:
      asString(fields[CANDIDATES_TABLE_FIELDS.phone]) ??
      asString(fields["Phone"]),
    resumeUrl: resume.url,
    resumeFilename: resume.filename,
    currentCompany: asString(fields[CANDIDATES_TABLE_FIELDS.currentCompany]),
    currentLocation: asString(fields[CANDIDATES_TABLE_FIELDS.currentLocation]),
    experience: asString(fields[CANDIDATES_TABLE_FIELDS.experience]),
    currentCtc: readCurrentCtc(fields),
    expectedCtc: asString(fields[CANDIDATES_TABLE_FIELDS.expectedCtc]),
    noticePeriod: asString(fields[CANDIDATES_TABLE_FIELDS.noticePeriod]),
    skills: asSkills(fields[CANDIDATES_TABLE_FIELDS.skills]),
    remarks:
      asString(fields[CANDIDATES_TABLE_FIELDS.remarks]) ??
      asString(fields["Remarks"]),
    createdAt: asString(fields[CANDIDATES_TABLE_FIELDS.createdAt]),
  };
}

export function toAirtableCreateFields(
  input: CreateCandidateInput,
): AirtableFields {
  const fields: AirtableFields = {
    [CANDIDATES_TABLE_FIELDS.fullName]: input.fullName,
    [CANDIDATES_TABLE_FIELDS.email]: input.email,
  };

  if (input.phone) {
    fields[CANDIDATES_TABLE_FIELDS.phone] = input.phone;
  }
  if (!isClientCompatMode() && input.currentCompany) {
    fields[CANDIDATES_TABLE_FIELDS.currentCompany] = input.currentCompany;
  }
  if (input.currentLocation) {
    fields[CANDIDATES_TABLE_FIELDS.currentLocation] = input.currentLocation;
  }
  if (!isClientCompatMode() && input.experience) {
    fields[CANDIDATES_TABLE_FIELDS.experience] = input.experience;
  }
  if (input.currentCtc) {
    fields[CANDIDATES_TABLE_FIELDS.currentCtc] = input.currentCtc;
  }
  if (input.expectedCtc) {
    fields[CANDIDATES_TABLE_FIELDS.expectedCtc] = input.expectedCtc;
  }
  if (input.noticePeriod) {
    fields[CANDIDATES_TABLE_FIELDS.noticePeriod] = input.noticePeriod;
  }
  if (!isClientCompatMode() && input.skills?.length) {
    fields[CANDIDATES_TABLE_FIELDS.skills] = input.skills.join(", ");
  }
  if (input.remarks) {
    fields[CANDIDATES_TABLE_FIELDS.remarks] = input.remarks;
  }

  return fields;
}

export function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function buildCandidateLookupFormula(input: {
  email?: string;
  phone?: string;
}): string {
  const clauses: string[] = [];

  if (input.email?.trim()) {
    clauses.push(
      `LOWER({${CANDIDATES_TABLE_FIELDS.email}}) = '${escapeFormulaValue(input.email.trim().toLowerCase())}'`,
    );
  }

  if (input.phone?.trim()) {
    const phone = escapeFormulaValue(input.phone.trim());
    clauses.push(`{${CANDIDATES_TABLE_FIELDS.phone}} = '${phone}'`);
  }

  if (clauses.length === 0) {
    return "";
  }

  if (clauses.length === 1) {
    return clauses[0] ?? "";
  }

  return `OR(${clauses.join(",")})`;
}
