import type { Partner } from "@/features/partners/types";

export const PARTNER_DIGEST_NEW_ROLES_COLUMN =
  "New Roles Activated – Available to be claimed";

export const PARTNER_DIGEST_SNAPSHOT_COLUMNS = [
  "Jobs Assigned",
  "Super High Priority Jobs",
  "Candidates Pending Review",
  "Candidates Internal Screening in Progress",
  "Candidates Being Submitted to Client",
  "Candidates being Interviewed",
] as const;

/** Daily partner digest goes only to partners marked active in Airtable. */
export function buildActivePartnerIdSet(partners: Partner[]): Set<string> {
  return new Set(
    partners
      .filter((partner) => partner.status === "active")
      .map((partner) => partner.id),
  );
}

export function isPartnerEligibleForDigest(
  partnerId: string | null | undefined,
  activePartnerIds: Set<string>,
): boolean {
  const id = partnerId?.trim();
  return Boolean(id && activePartnerIds.has(id));
}
