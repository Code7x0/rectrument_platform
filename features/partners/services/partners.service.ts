import { ACTIVE_ALLOCATION_STATUSES } from "@/features/shared/entities";
import { listAllocations } from "@/features/allocations/services";
import { getPartnerDocumentSummary as summarizePartnerDocuments } from "@/features/partner-documents/services/documents.service";
import { listSubmissions } from "@/features/submissions/services";
import {
  destroyPartner,
  findPartnerById,
  findPartners,
  insertPartner,
  patchPartner,
} from "@/features/partners/repositories/partners.repository";
import {
  buildPartnersFilterFormula,
  toAirtableCreateFields,
  toAirtableUpdateFields,
} from "@/features/partners/services/partners.mapper";
import type {
  CreatePartnerInput,
  Partner,
  PartnerDocumentSummary,
  PartnerListFilters,
  PartnerPerformanceStats,
  UpdatePartnerInput,
} from "@/features/partners/types";
import { PARTNERS_TABLE_FIELDS } from "@/lib/airtable/fields";

function applySearch(partners: Partner[], search?: string): Partner[] {
  if (!search?.trim()) {
    return partners;
  }
  const q = search.trim().toLowerCase();
  return partners.filter(
    (p) =>
      p.companyName.toLowerCase().includes(q) ||
      (p.partnerCode?.toLowerCase().includes(q) ?? false) ||
      (p.contactName?.toLowerCase().includes(q) ?? false) ||
      (p.email?.toLowerCase().includes(q) ?? false) ||
      (p.specialization?.toLowerCase().includes(q) ?? false),
  );
}

export async function listPartners(
  filters: PartnerListFilters = {},
): Promise<Partner[]> {
  const { search, ...airtableFilters } = filters;
  const formula = buildPartnersFilterFormula(airtableFilters);

  const rows = await findPartners({
    ...(formula ? { filterByFormula: formula } : {}),
    sort: [{ field: PARTNERS_TABLE_FIELDS.companyName, direction: "asc" }],
  });

  return applySearch(rows, search);
}

export async function getPartnerById(
  partnerId: string,
): Promise<Partner | null> {
  return findPartnerById(partnerId);
}

function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

/** Lookup by Official Email ID or Personal Email (case-insensitive). */
export async function findPartnerByEmail(
  email: string,
): Promise<Partner | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const escaped = escapeFormulaValue(normalized);
  const rows = await findPartners({
    filterByFormula: `OR(LOWER({${PARTNERS_TABLE_FIELDS.email}}) = '${escaped}', LOWER({${PARTNERS_TABLE_FIELDS.personalEmail}}) = '${escaped}')`,
    maxRecords: 5,
  });
  return (
    rows.find((p) => p.email?.trim().toLowerCase() === normalized) ??
    rows[0] ??
    null
  );
}

export async function createPartner(
  input: CreatePartnerInput,
): Promise<Partner> {
  if (input.email?.trim()) {
    const existing = await findPartnerByEmail(input.email);
    if (existing) {
      throw new Error("A talent partner with this email already exists");
    }
    const { findUserByEmail } = await import("@/services/users");
    const user = await findUserByEmail(input.email);
    if (user && user.role !== "partner") {
      throw new Error("This email is already registered to another account");
    }
    if (user?.role === "partner" && user.partnerId) {
      throw new Error("A talent partner with this email already exists");
    }
  }
  return insertPartner(toAirtableCreateFields(input));
}

export async function updatePartner(
  partnerId: string,
  input: UpdatePartnerInput,
): Promise<Partner> {
  if (input.email?.trim()) {
    const existing = await findPartnerByEmail(input.email);
    if (existing && existing.id !== partnerId) {
      throw new Error("A talent partner with this email already exists");
    }
  }
  return patchPartner(partnerId, toAirtableUpdateFields(input));
}

export async function archivePartner(partnerId: string): Promise<Partner> {
  return updatePartner(partnerId, { status: "archived" });
}

/** Permanently remove the partner record from Airtable. */
export async function deletePartner(partnerId: string): Promise<void> {
  const existing = await findPartnerById(partnerId);
  if (!existing) {
    throw new Error("Partner not found");
  }
  await destroyPartner(partnerId);
}

/**
 * Performance metrics — calculated from Allocations + Submissions.
 * Never stored on the Partner record.
 */
export async function getPartnerPerformanceStats(
  partnerId: string,
): Promise<PartnerPerformanceStats> {
  const [allocations, submissions] = await Promise.all([
    listAllocations({ partnerId, includeArchived: false }),
    listSubmissions({ partnerId }),
  ]);

  const activeJobs = allocations.filter((row) =>
    ACTIVE_ALLOCATION_STATUSES.includes(row.status),
  ).length;

  const profilesSubmitted = submissions.length;
  const interviews = submissions.filter((s) => s.status === "interview").length;
  const offers = submissions.filter((s) => s.status === "offer").length;
  const joinedCandidates = submissions.filter(
    (s) => s.status === "joined",
  ).length;

  return {
    activeJobs,
    profilesSubmitted,
    interviews,
    offers,
    joinedCandidates,
  };
}

/**
 * Document counts for Partner Workspace — delegated to partner-documents.
 */
export async function getPartnerDocumentSummary(
  partnerId: string,
): Promise<PartnerDocumentSummary> {
  return summarizePartnerDocuments(partnerId);
}
