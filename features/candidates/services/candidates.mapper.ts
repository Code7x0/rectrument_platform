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
  const attachments = asResumeAttachments(value);
  const first = attachments[0];
  return {
    url: first?.url ?? null,
    filename: first?.filename ?? null,
  };
}

export function asResumeAttachments(
  value: unknown,
): Array<{ url: string; filename: string | null }> {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }
  const out: Array<{ url: string; filename: string | null }> = [];
  for (const item of value) {
    const row = item as { url?: string; filename?: string };
    if (typeof row.url === "string" && row.url.trim()) {
      out.push({
        url: row.url,
        filename:
          typeof row.filename === "string" && row.filename.trim()
            ? row.filename
            : null,
      });
    }
  }
  return out;
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
  const resumeAttachments = asResumeAttachments(
    fields[CANDIDATES_TABLE_FIELDS.resume],
  );
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
    resumeUrls: resumeAttachments.map((item) => item.url),
    currentCompany: asString(fields[CANDIDATES_TABLE_FIELDS.currentCompany]),
    currentLocation: asString(fields[CANDIDATES_TABLE_FIELDS.currentLocation]),
    experience: asString(fields[CANDIDATES_TABLE_FIELDS.experience]),
    currentCtc: readCurrentCtc(fields),
    expectedCtc: asString(fields[CANDIDATES_TABLE_FIELDS.expectedCtc]),
    noticePeriod: asString(fields[CANDIDATES_TABLE_FIELDS.noticePeriod]),
    linkedIn: asString(fields[CANDIDATES_TABLE_FIELDS.linkedIn]),
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
    fields[CANDIDATES_TABLE_FIELDS.phone] = normalizePhone(input.phone) || input.phone;
  }
  if (input.currentLocation) {
    fields[CANDIDATES_TABLE_FIELDS.currentLocation] = input.currentLocation;
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
  if (input.linkedIn) {
    fields[CANDIDATES_TABLE_FIELDS.linkedIn] = input.linkedIn;
  }
  if (input.remarks) {
    fields[CANDIDATES_TABLE_FIELDS.remarks] = input.remarks;
  }
  if (!isClientCompatMode()) {
    if (input.currentCompany) {
      fields[CANDIDATES_TABLE_FIELDS.currentCompany] = input.currentCompany;
    }
    if (input.experience) {
      fields[CANDIDATES_TABLE_FIELDS.experience] = input.experience;
    }
    if (input.skills?.length) {
      fields[CANDIDATES_TABLE_FIELDS.skills] = input.skills.join(", ");
    }
  }

  return fields;
}

export function toAirtableUpdateFields(
  input: CreateCandidateInput,
): AirtableFields {
  const fields = toAirtableCreateFields(input);
  fields[CANDIDATES_TABLE_FIELDS.fullName] = input.fullName;
  fields[CANDIDATES_TABLE_FIELDS.email] = input.email;
  fields[CANDIDATES_TABLE_FIELDS.phone] =
    (input.phone ? normalizePhone(input.phone) : "") || input.phone || "";
  fields[CANDIDATES_TABLE_FIELDS.currentLocation] = input.currentLocation ?? "";
  fields[CANDIDATES_TABLE_FIELDS.currentCtc] = input.currentCtc ?? "";
  fields[CANDIDATES_TABLE_FIELDS.expectedCtc] = input.expectedCtc ?? "";
  fields[CANDIDATES_TABLE_FIELDS.noticePeriod] = input.noticePeriod ?? "";
  fields[CANDIDATES_TABLE_FIELDS.linkedIn] = input.linkedIn
    ? input.linkedIn.startsWith("http")
      ? input.linkedIn
      : `https://${input.linkedIn}`
    : "";
  fields[CANDIDATES_TABLE_FIELDS.remarks] = input.remarks ?? "";
  return fields;
}

export function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

/**
 * Canonical phone digits for duplicate matching.
 * Strips punctuation and keeps the last 10 digits when a country/trunk prefix is present.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

/** Common Airtable storage shapes for the same mobile number. */
export function phoneLookupVariants(phone: string): string[] {
  const raw = phone.trim();
  const digits = normalizePhone(phone);
  const variants = new Set<string>();
  if (raw) {
    variants.add(raw);
  }
  if (!digits) {
    return [...variants];
  }
  variants.add(digits);
  if (digits.length === 10) {
    variants.add(`+91${digits}`);
    variants.add(`91${digits}`);
    variants.add(`0${digits}`);
    variants.add(
      `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`,
    );
    variants.add(
      `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`,
    );
    variants.add(
      `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`,
    );
    variants.add(
      `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`,
    );
  }
  return [...variants];
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
    const phoneClauses = phoneLookupVariants(input.phone).map(
      (variant) =>
        `{${CANDIDATES_TABLE_FIELDS.phone}} = '${escapeFormulaValue(variant)}'`,
    );
    if (phoneClauses.length === 1) {
      clauses.push(phoneClauses[0] ?? "");
    } else if (phoneClauses.length > 1) {
      clauses.push(`OR(${phoneClauses.join(",")})`);
    }
  }

  if (clauses.length === 0) {
    return "";
  }

  if (clauses.length === 1) {
    return clauses[0] ?? "";
  }

  return `OR(${clauses.join(",")})`;
}
