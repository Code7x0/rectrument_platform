/**
 * Partner Document — compliance file linked to a Partner.
 */

export type PartnerDocumentType = "pan" | "aadhaar" | "agreement";

export type DocumentVerificationStatus = "pending" | "verified" | "rejected";

export type DocumentRecordStatus = "active" | "archived";

export interface PartnerDocument {
  id: string;
  documentCode: string | null;
  partnerId: string;
  partnerName: string | null;
  documentType: PartnerDocumentType;
  fileUrl: string | null;
  fileName: string | null;
  uploadedAt: string | null;
  verificationStatus: DocumentVerificationStatus;
  verifiedById: string | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  status: DocumentRecordStatus;
}

export const REQUIRED_DOCUMENT_TYPES: PartnerDocumentType[] = [
  "pan",
  "aadhaar",
  "agreement",
];

export const DOCUMENT_TYPE_LABELS: Record<PartnerDocumentType, string> = {
  pan: "PAN Card",
  aadhaar: "Aadhaar Card",
  agreement: "Agreement",
};

export const DOCUMENT_VERIFICATION_LABELS: Record<
  DocumentVerificationStatus,
  string
> = {
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
};

export interface PartnerDocumentSlot {
  documentType: PartnerDocumentType;
  label: string;
  document: PartnerDocument | null;
}

export interface CreatePartnerDocumentInput {
  partnerId: string;
  documentType: PartnerDocumentType;
  verificationStatus?: DocumentVerificationStatus;
  status?: DocumentRecordStatus;
  uploadedAt?: string;
  notes?: string;
}

export interface UpdatePartnerDocumentInput {
  verificationStatus?: DocumentVerificationStatus;
  verifiedById?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
  status?: DocumentRecordStatus;
  uploadedAt?: string | null;
}

export interface PartnerDocumentListFilters {
  partnerId?: string;
  documentType?: PartnerDocumentType;
  verificationStatus?: DocumentVerificationStatus;
  includeArchived?: boolean;
}

export interface PartnerDocumentSummary {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
}
