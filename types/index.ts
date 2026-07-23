export type UserRole =
  | "super_admin"
  | "admin"
  | "account_manager"
  | "partner";

export type UserStatus = "active" | "inactive" | "suspended";

/**
 * Onboarding / invitation lifecycle (independent of login Status).
 * Only Active registration + Active status may authenticate.
 */
export type RegistrationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "invitation_pending"
  | "active"
  | "inactive";

export type IdentityVisibility = "public" | "private";

/**
 * Domain user from Airtable (identity + business linkage).
 * Permissions are NOT stored here — they are derived in the application.
 */
export interface User {
  id: string;
  clerkUserId: string | null;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  registrationStatus: RegistrationStatus;
  identityVisibility: IdentityVisibility | null;
  partnerId: string | null;
  accountManagerId: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  skills: string | null;
  experience: string | null;
  bankDetails: string | null;
  approvalDate: string | null;
  approvedById: string | null;
  rejectedReason: string | null;
  invitationToken: string | null;
  invitationExpiry: string | null;
  createdAt: string | null;
  lastLogin: string | null;
}

/**
 * Lightweight application session.
 * Permissions are derived from role via ROLE_PERMISSIONS — never stored here.
 */
export interface AppSession {
  userId: string;
  clerkId: string;
  role: UserRole;
  status: UserStatus;
  partnerId: string | null;
  accountManagerId: string | null;
}

export type Permission =
  | "manage_users"
  | "invite_staff"
  | "manage_roles"
  | "approve_partners"
  | "manage_identity_visibility"
  | "manage_company_settings"
  | "manage_clients"
  | "archive_clients"
  | "view_jobs"
  | "manage_jobs"
  | "manage_partners"
  | "archive_partners"
  | "view_allocations"
  | "manage_allocations"
  | "archive_allocations"
  | "view_own_allocations"
  | "review_candidates"
  | "view_submissions"
  | "view_documents"
  | "verify_documents"
  | "archive_documents"
  | "submit_candidates"
  | "manage_own_documents"
  | "view_payouts"
  | "update_payouts"
  | "manage_payouts"
  | "view_own_payouts"
  | "view_dashboard"
  | "view_own_notifications"
  | "manage_own_notification_preferences";

export interface Partner {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: "active" | "inactive" | "pending";
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  industry?: string;
  contactEmail?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

/** @deprecated Prefer `features/jobs/types` Job model for new code. */
export interface Job {
  id: string;
  title: string;
  clientId: string;
  status: "open" | "closed" | "on_hold" | "cancelled" | "filled" | "archived";
  location?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: "new" | "screening" | "submitted" | "hired" | "rejected";
  createdAt: string;
  updatedAt: string;
}

export interface Allocation {
  id: string;
  jobId: string;
  partnerId: string;
  candidateId?: string;
  status: "assigned" | "in_progress" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface Payout {
  id: string;
  partnerId: string;
  amount: number;
  currency: string;
  status: "pending" | "approved" | "paid" | "rejected";
  periodStart?: string;
  periodEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerDocument {
  id: string;
  partnerId: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
  updatedAt: string;
}
