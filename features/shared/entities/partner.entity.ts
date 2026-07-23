/**
 * Canonical Partner entity — independent of Airtable field names.
 */

export type PartnerStatus = "active" | "inactive" | "pending" | "archived";

export type PartnerVerificationStatus =
  | "pending"
  | "verified"
  | "rejected";

export type IdentityVisibility = "public" | "private";

export interface PartnerEntity {
  id: string;
  partnerCode: string | null;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  specialization: string | null;
  revenueShare: string | null;
  rating: number | null;
  status: PartnerStatus;
  verificationStatus: PartnerVerificationStatus;
  identityVisibility: IdentityVisibility;
  city: string | null;
  state: string | null;
  skills: string | null;
  experience: string | null;
  bankDetails: string | null;
  notes: string | null;
}

export const PARTNER_STATUS_LABELS: Record<PartnerStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  pending: "Pending",
  archived: "Archived",
};

export const PARTNER_VERIFICATION_LABELS: Record<
  PartnerVerificationStatus,
  string
> = {
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
};

export const IDENTITY_VISIBILITY_LABELS: Record<IdentityVisibility, string> = {
  public: "Public",
  private: "Private",
};
