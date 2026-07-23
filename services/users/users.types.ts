import type {
  IdentityVisibility,
  RegistrationStatus,
  UserRole,
  UserStatus,
} from "@/types";

export interface CreateUserInput {
  fullName: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  registrationStatus?: RegistrationStatus;
  identityVisibility?: IdentityVisibility | null;
  partnerId?: string;
  accountManagerId?: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  skills?: string | null;
  experience?: string | null;
  bankDetails?: string | null;
  invitationToken?: string | null;
  invitationExpiry?: string | null;
}

export interface UpdateUserInput {
  fullName?: string;
  phone?: string | null;
  status?: UserStatus;
  registrationStatus?: RegistrationStatus;
  identityVisibility?: IdentityVisibility | null;
  role?: UserRole;
  partnerId?: string | null;
  accountManagerId?: string | null;
  city?: string | null;
  state?: string | null;
  skills?: string | null;
  experience?: string | null;
  bankDetails?: string | null;
  approvalDate?: string | null;
  approvedById?: string | null;
  rejectedReason?: string | null;
  invitationToken?: string | null;
  invitationExpiry?: string | null;
  clerkUserId?: string | null;
}

export interface ResolveClerkIdentityInput {
  clerkUserId: string;
  email: string;
}

export interface ListUsersFilters {
  role?: UserRole | UserRole[];
  registrationStatus?: RegistrationStatus | RegistrationStatus[];
  status?: UserStatus | UserStatus[];
  search?: string;
}
