import type {
  IdentityVisibility,
  RegistrationStatus,
  User,
  UserRole,
  UserStatus,
} from "@/types";
import type { Partner } from "@/features/partners/types";
import type { PartnerDocument } from "@/features/partner-documents/types";

export type {
  IdentityVisibility,
  RegistrationStatus,
  User,
  UserRole,
  UserStatus,
};

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  invitation_pending: "Invitation Pending",
  active: "Active",
  inactive: "Inactive",
};

export const IDENTITY_VISIBILITY_LABELS: Record<IdentityVisibility, string> = {
  public: "Public",
  private: "Private",
};

/** Roles Super Admin may invite (never super_admin). */
export const INVITABLE_STAFF_ROLES = ["admin", "account_manager"] as const;
export type InvitableStaffRole = (typeof INVITABLE_STAFF_ROLES)[number];

/** Roles a Talent Partner may be promoted to. */
export const PROMOTABLE_ROLES = ["admin", "account_manager"] as const;
export type PromotableRole = (typeof PROMOTABLE_ROLES)[number];

export interface PendingPartnerApplication {
  user: User;
  partner: Partner | null;
  documents: PartnerDocument[];
  appliedAt: string | null;
}

export interface UserListItem extends User {
  partnerCode: string | null;
  partnerName: string | null;
}

export interface InviteStaffInput {
  fullName: string;
  email: string;
  role: InvitableStaffRole;
  phone?: string;
}

export interface PartnerRegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  skills: string;
  experience: string;
  bankDetails?: string;
  identityVisibility: IdentityVisibility;
  agreementAccepted: boolean;
}

export interface AcceptInvitationInput {
  token: string;
  clerkUserId: string;
}

export interface ChangeRoleInput {
  userId: string;
  toRole: UserRole;
  actorUserId: string;
}

export interface UsersSummary {
  totalUsers: number;
  pendingApprovals: number;
  invitationPending: number;
  activePartners: number;
  admins: number;
  accountManagers: number;
}
