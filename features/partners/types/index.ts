export type {
  IdentityVisibility,
  PartnerEntity as Partner,
  PartnerStatus,
  PartnerVerificationStatus,
} from "@/features/shared/entities";
export {
  IDENTITY_VISIBILITY_LABELS,
  PARTNER_STATUS_LABELS,
  PARTNER_VERIFICATION_LABELS,
} from "@/features/shared/entities";

import type {
  IdentityVisibility,
  PartnerStatus,
  PartnerVerificationStatus,
} from "@/features/shared/entities";

export interface CreatePartnerInput {
  companyName: string;
  /** Business Partner Code (HN_254). Written to Airtable Partner Code. */
  partnerCode?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  revenueShare?: string;
  rating?: number;
  status?: PartnerStatus;
  verificationStatus?: PartnerVerificationStatus;
  identityVisibility?: IdentityVisibility;
  city?: string;
  state?: string;
  skills?: string;
  experience?: string;
  bankDetails?: string;
  notes?: string;
}

export type UpdatePartnerInput = Partial<CreatePartnerInput>;

export interface PartnerListFilters {
  search?: string;
  status?: PartnerStatus | "all";
  verificationStatus?: PartnerVerificationStatus | "all";
  includeArchived?: boolean;
}

/** Calculated — never stored on Partner record. */
export interface PartnerPerformanceStats {
  activeJobs: number;
  profilesSubmitted: number;
  interviews: number;
  offers: number;
  joinedCandidates: number;
}

export interface PartnerDocumentSummary {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
}
