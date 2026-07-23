import type {
  Partner,
  PartnerStatus,
  PartnerVerificationStatus,
} from "@/features/partners/types";

/**
 * Operational partner view for Account Managers.
 * PUBLIC partners expose name; PRIVATE partners expose Partner ID only.
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
  const partnerCode = partner.partnerCode ?? partner.id.replace(/^rec/, "TP-");
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
 * PUBLIC → name; PRIVATE → Partner ID (+ specialization).
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
      partner.partnerCode ||
      partner.id.replace(/^rec/, "TP-")
    );
  }

  const code = partner.partnerCode ?? partner.id.replace(/^rec/, "TP-");
  if (partner.specialization?.trim()) {
    return `${code} · ${partner.specialization.trim()}`;
  }
  return code;
}
