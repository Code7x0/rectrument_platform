import type {
  Partner,
  PartnerStatus,
  PartnerVerificationStatus,
} from "@/features/partners/types";
import { displayBusinessId } from "@/lib/business-ids";

/**
 * Operational partner view for Account Managers.
 * PUBLIC partners expose name; PRIVATE partners expose Partner Code only.
 */
export interface OperationalPartnerView {
  id: string;
  partnerCode: string;
  /** Present only when identityVisibility === public */
  displayName: string | null;
  specialization: string | null;
  rating: number | null;
  verificationStatus: PartnerVerificationStatus;
  status: PartnerStatus;
  identityVisibility: Partner["identityVisibility"];
}

/**
 * Strip Talent Partner identity for Account Manager consumers.
 * Server-side only — do not rely on UI hiding.
 */
export function toOperationalPartnerView(
  partner: Partner,
): OperationalPartnerView {
  const partnerCode = displayBusinessId(partner.partnerCode, "—");
  const isPublic = partner.identityVisibility === "public";

  return {
    id: partner.id,
    partnerCode,
    displayName: isPublic
      ? (partner.contactName ?? partner.companyName)
      : null,
    specialization: partner.specialization,
    rating: partner.rating,
    verificationStatus: partner.verificationStatus,
    status: partner.status,
    identityVisibility: partner.identityVisibility,
  };
}

/**
 * Display label safe for Account Managers.
 * PUBLIC → name; PRIVATE → Partner Code (+ specialization).
 */
export function operationalPartnerLabel(partner: {
  partnerCode: string | null;
  id: string;
  specialization?: string | null;
  identityVisibility?: Partner["identityVisibility"];
  contactName?: string | null;
  companyName?: string | null;
}): string {
  if (partner.identityVisibility === "public") {
    return (
      partner.contactName?.trim() ||
      partner.companyName?.trim() ||
      displayBusinessId(partner.partnerCode)
    );
  }

  const code = displayBusinessId(partner.partnerCode);
  if (partner.specialization?.trim()) {
    return `${code} · ${partner.specialization.trim()}`;
  }
  return code;
}
