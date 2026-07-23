import { CANDIDATES_TABLE_FIELDS } from "@/lib/airtable/fields";
import {
  findCandidateById,
  findCandidates,
  insertCandidate,
} from "@/features/candidates/repositories/candidates.repository";
import {
  buildCandidateLookupFormula,
  normalizePhone,
  toAirtableCreateFields,
} from "@/features/candidates/services/candidates.mapper";
import type {
  Candidate,
  CreateCandidateInput,
} from "@/features/candidates/types";
import { getUploadService, type UploadedFile } from "@/services/uploads";

export async function getCandidateById(
  candidateId: string,
): Promise<Candidate | null> {
  return findCandidateById(candidateId);
}

/**
 * Duplicate detection by email and/or phone.
 * Prefers exact email match; phone match is secondary.
 */
export async function findDuplicateCandidates(input: {
  email?: string;
  phone?: string;
}): Promise<Candidate[]> {
  const formula = buildCandidateLookupFormula(input);
  if (!formula) {
    return [];
  }

  const rows = await findCandidates({
    filterByFormula: formula,
    maxRecords: 10,
  });

  const email = input.email?.trim().toLowerCase();
  const phone = input.phone ? normalizePhone(input.phone) : "";

  return rows.filter((row) => {
    const emailMatch =
      Boolean(email) && row.email.trim().toLowerCase() === email;
    const phoneMatch =
      Boolean(phone) &&
      row.phone != null &&
      normalizePhone(row.phone) === phone;
    return emailMatch || phoneMatch;
  });
}

export async function createCandidate(
  input: CreateCandidateInput,
): Promise<Candidate> {
  const duplicates = await findDuplicateCandidates({
    email: input.email,
    phone: input.phone,
  });

  if (duplicates.length > 0) {
    throw new Error(
      "A candidate with this email or phone already exists. Reuse the existing record.",
    );
  }

  return insertCandidate(toAirtableCreateFields(input));
}

export async function attachResumeToCandidate(
  candidateId: string,
  upload: UploadedFile,
): Promise<Candidate> {
  const uploader = getUploadService();
  await uploader.bindToEntity(upload, {
    entityId: candidateId,
    fieldName: CANDIDATES_TABLE_FIELDS.resume,
  });

  const refreshed = await findCandidateById(candidateId);
  if (!refreshed) {
    throw new Error("Candidate not found after resume upload");
  }
  return refreshed;
}

export function parseSkillsInput(value?: string): string[] {
  if (!value?.trim()) {
    return [];
  }
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
