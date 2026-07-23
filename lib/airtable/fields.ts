/**
 * Airtable table field name mappings.
 *
 * Default values match the client's Partner Relationship Manager base
 * (`AIRTABLE_COMPAT_MODE=client`). Set `AIRTABLE_COMPAT_MODE=app` only when
 * pointing at a normalized app base that uses the original Title Case names.
 *
 * See docs/AIRTABLE_ALIGNMENT_REPORT.md for the full audit.
 */

export const USERS_TABLE_FIELDS = {
  fullName: "Full Name",
  email: "Email",
  role: "Role",
  status: "Status",
  phone: "Phone",
  clerkUserId: "Clerk User ID",
  partner: "Partner",
  accountManager: "Account Manager",
  createdAt: "Created At",
  lastLogin: "Last Login",
  registrationStatus: "Registration Status",
  identityVisibility: "Identity Visibility",
  city: "City",
  state: "State",
  skills: "Skills",
  experience: "Experience",
  bankDetails: "Bank Details",
  approvalDate: "Approval Date",
  approvedBy: "Approved By",
  rejectedReason: "Rejected Reason",
  invitationToken: "Invitation Token",
  invitationExpiry: "Invitation Expiry",
} as const;

/** Client Account Managers table (staff AM directory — not auth Users). */
export const ACCOUNT_MANAGERS_TABLE_FIELDS = {
  name: "Name",
  email: "Email",
  status: "Status",
  phone: "Mobile Number",
  comments: "Comments",
  clients: "Clients",
} as const;

export const CLIENTS_TABLE_FIELDS = {
  clientId: "Client ID",
  name: "Client Name",
  industry: "Industry",
  website: "Website",
  /** Client base has no Primary Contact — kept for app-schema writes only. */
  primaryContact: "Primary Contact",
  /** Client base: Account Owner → Account Managers. App base: Account Manager → Users. */
  accountManager: "Account Owner",
  status: "Status",
  notes: "Notes",
} as const;

export const AIRTABLE_CLIENT_STATUS = {
  Active: "active",
  Inactive: "inactive",
  Archived: "archived",
  /** Client base option → treat as inactive prospect. */
  Prospect: "inactive",
} as const;

export const DOMAIN_CLIENT_STATUS_TO_AIRTABLE = {
  active: "Active",
  inactive: "Inactive",
  /** Client base has no Archived — persist as Inactive. */
  archived: "Inactive",
} as const;

export const PARTNERS_TABLE_FIELDS = {
  partnerId: "Partner Code",
  name: "Contact Name",
  companyName: "Company Name",
  email: "Official Email ID",
  phone: "Phone Number",
  specialization: "Specialization",
  revenueShare: "Partners Revenue",
  rating: "Rating",
  status: "Status",
  /** App-only — absent on client base; soft-skipped on write in client mode. */
  verificationStatus: "Verification Status",
  notes: "Performance Notes",
  identityVisibility: "Identity Visibility",
  city: "Location",
  state: "State",
  skills: "Skills",
  experience: "Experience",
  bankDetails: "Bank Details",
  personalEmail: "Personal Email",
  jobs: "Jobs",
  clients: "Clients",
  candidates: "Candidates",
} as const;

export const AIRTABLE_PARTNER_STATUS = {
  Active: "active",
  Inactive: "inactive",
  Pending: "pending",
  Archived: "archived",
  /** Client base options */
  Probation: "pending",
  Preferred: "active",
} as const;

export const DOMAIN_PARTNER_STATUS_TO_AIRTABLE = {
  active: "Active",
  inactive: "Inactive",
  /** Client base has Probation instead of Pending. */
  pending: "Probation",
  archived: "Inactive",
} as const;

export const AIRTABLE_PARTNER_VERIFICATION = {
  Pending: "pending",
  Verified: "verified",
  Rejected: "rejected",
} as const;

export const DOMAIN_PARTNER_VERIFICATION_TO_AIRTABLE = {
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
} as const;

export const JOBS_TABLE_FIELDS = {
  jobId: "Job ID",
  title: "Job Title",
  client: "Client",
  /** Absent on client Jobs — AM ownership lives on Clients.Account Owner. */
  accountManager: "Assigned Account Manager",
  hiringManager: "Hiring Manager",
  /**
   * Client: Job Description is multipleAttachments (files).
   * Text description is stored in Comments when writing in client mode.
   */
  description: "Job Description",
  location: "Location",
  employmentType: "Employment Type",
  experience: "Years of Exp",
  salary: "Salary Range",
  priority: "Priority",
  openPositions: "Open Positions",
  skills: "Skills",
  status: "Status",
  notes: "Comments",
  department: "Department",
  submissionDeadline: "Submission Deadline",
  createdBy: "Created By",
  createdAt: "Created At",
  /** Client multi-link used as allocation source in job_partners mode. */
  partners: "Partners",
  candidates: "Candidates",
  seniorityLevel: "Seniority Level",
  payoutPercent: "Payout",
  startDate: "Start Date",
  postedDate: "Posted Date",
  interviewProcess: "Interview Process , R1 - KYC",
} as const;

export const AIRTABLE_ROLE_MAP = {
  "Super Admin": "super_admin",
  Admin: "admin",
  "Account Manager": "account_manager",
  Partner: "partner",
} as const;

export const DOMAIN_ROLE_TO_AIRTABLE = {
  super_admin: "Super Admin",
  admin: "Admin",
  account_manager: "Account Manager",
  partner: "Partner",
} as const;

export const AIRTABLE_STATUS_MAP = {
  Active: "active",
  Inactive: "inactive",
  Suspended: "suspended",
} as const;

export const AIRTABLE_REGISTRATION_STATUS = {
  Pending: "pending",
  Approved: "approved",
  Rejected: "rejected",
  "Invitation Pending": "invitation_pending",
  Active: "active",
  Inactive: "inactive",
} as const;

export const DOMAIN_REGISTRATION_STATUS_TO_AIRTABLE = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  invitation_pending: "Invitation Pending",
  active: "Active",
  inactive: "Inactive",
} as const;

export const AIRTABLE_IDENTITY_VISIBILITY = {
  PUBLIC: "public",
  PRIVATE: "private",
} as const;

export const DOMAIN_IDENTITY_VISIBILITY_TO_AIRTABLE = {
  public: "PUBLIC",
  private: "PRIVATE",
} as const;

export const AIRTABLE_JOB_STATUS = {
  Open: "open",
  "On Hold": "on_hold",
  Closed: "closed",
  Cancelled: "cancelled",
  Filled: "filled",
  Archived: "archived",
} as const;

export const DOMAIN_JOB_STATUS_TO_AIRTABLE = {
  open: "Open",
  on_hold: "On Hold",
  closed: "Closed",
  /** Client Jobs has no Cancelled — persist as Closed. */
  cancelled: "Closed",
  filled: "Filled",
  /** Client Jobs has no Archived — persist as Closed. */
  archived: "Closed",
} as const;

export const AIRTABLE_JOB_PRIORITY = {
  Low: "low",
  Medium: "medium",
  High: "high",
  Urgent: "urgent",
} as const;

export const DOMAIN_JOB_PRIORITY_TO_AIRTABLE = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
} as const;

export const AIRTABLE_EMPLOYMENT_TYPE = {
  "Full-time": "full_time",
  "Part-time": "part_time",
  Contract: "contract",
  Internship: "internship",
} as const;

export const DOMAIN_EMPLOYMENT_TYPE_TO_AIRTABLE = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
} as const;

/**
 * Allocations — prepared for Feature 4 / Partner Work Queue (Feature 5).
 */
export const ALLOCATIONS_TABLE_FIELDS = {
  allocationId: "Allocation ID",
  job: "Job",
  partner: "Partner",
  accountManager: "Assigned Account Manager",
  assignedBy: "Assigned By",
  assignedDate: "Assigned Date",
  status: "Status",
  expectedProfiles: "Expected Profiles",
  profilesSubmitted: "Profiles Submitted",
  notes: "Notes",
} as const;

export const AIRTABLE_ALLOCATION_STATUS = {
  Assigned: "assigned",
  Working: "working",
  Completed: "completed",
  Cancelled: "cancelled",
  Archived: "archived",
} as const;

export const DOMAIN_ALLOCATION_STATUS_TO_AIRTABLE = {
  assigned: "Assigned",
  working: "Working",
  completed: "Completed",
  cancelled: "Cancelled",
  archived: "Archived",
} as const;

/**
 * Candidates — person fields on the client Candidates table.
 * Note: client "Current CTC " has a trailing space in Airtable.
 */
export const CANDIDATES_TABLE_FIELDS = {
  fullName: "Candidate Name",
  email: "Email",
  phone: "Phone Number",
  resume: "Resume",
  currentCompany: "Current Company",
  currentLocation: "Current Location",
  experience: "Experience",
  currentCtc: "Current CTC ",
  expectedCtc: "Expected CTC",
  noticePeriod: "Notice Period",
  skills: "Skills",
  remarks: "Screening Matrix Notes.",
  createdAt: "Submission Date",
  linkedIn: "LinkedIn Profile",
  workLocation: "Work Location",
  job: "Job",
  partner: "Submitted By (Partner)",
  submissionStatus: "Submission Status",
  interviewStage: "Interview Stage",
  internalFeedback: "Internal Feedback",
  candidateId: "Candidate ID",
} as const;

/**
 * Submissions — on client base these map onto the Candidates table
 * (person + job + partner + status in one row). Dedicated Submissions
 * table field names remain available when AIRTABLE_SUBMISSIONS_MODE=table.
 */
export const SUBMISSIONS_TABLE_FIELDS = {
  submissionId: "Candidate ID",
  candidate: "Candidate",
  job: "Job",
  allocation: "Allocation",
  partner: "Submitted By (Partner)",
  submissionDate: "Submission Date",
  status: "Submission Status",
  remarks: "Screening Matrix Notes.",
  /** Person fields written on create in candidates mode. */
  candidateName: "Candidate Name",
  email: "Email",
  phone: "Phone Number",
  resume: "Resume",
  currentLocation: "Current Location",
  currentCtc: "Current CTC ",
  expectedCtc: "Expected CTC",
  noticePeriod: "Notice Period",
  linkedIn: "LinkedIn Profile",
  interviewStage: "Interview Stage",
  internalFeedback: "Internal Feedback",
} as const;

/**
 * Client Submission Status → domain SubmissionStatus.
 * Trailing spaces in Airtable option names are preserved as keys.
 */
export const AIRTABLE_SUBMISSION_STATUS = {
  Submitted: "submitted",
  "Internal Review": "internal_review",
  "Client Review": "client_review",
  "Submitted to Client": "client_review",
  Interview: "interview",
  "Interview L1": "interview",
  "Interview L2": "interview",
  Offer: "offer",
  Joined: "joined",
  Rejected: "rejected",
  /** Client Partner Relationship Manager options */
  "Pending Review": "submitted",
  "Internal Screening in Progress": "internal_review",
  "Being Submitted to Client ": "client_review",
  "Being Submitted to Client": "client_review",
  Interviewing: "interview",
  Offered: "offer",
  Selected: "offer",
  Hold: "internal_review",
  "Client Duplicate": "rejected",
  "Internal Duplicate": "rejected",
  "Rejected - Internal Screening - TS": "rejected",
  "Rejected Interview Process": "rejected",
  "Rejected Resume Review-Client": "rejected",
  "Rejected Resume Review-TS": "rejected",
  "Rejected by client": "rejected",
  "Internal Review Reject": "rejected",
  "Not Responding": "rejected",
} as const;

export const DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE = {
  submitted: "Pending Review",
  internal_review: "Internal Screening in Progress",
  client_review: "Being Submitted to Client ",
  interview: "Interviewing",
  offer: "Offered",
  joined: "Joined",
  rejected: "Rejected Resume Review-TS",
} as const;

/**
 * Partner Documents — KYC / compliance files (Feature 10).
 */
export const DOCUMENTS_TABLE_FIELDS = {
  documentId: "Document ID",
  partner: "Partner",
  documentType: "Document Type",
  file: "File",
  uploadedAt: "Uploaded At",
  verificationStatus: "Verification Status",
  verifiedBy: "Verified By",
  verifiedAt: "Verified At",
  rejectionReason: "Rejection Reason",
  notes: "Notes",
  status: "Status",
} as const;

export const AIRTABLE_DOCUMENT_TYPE = {
  "PAN Card": "pan",
  "Aadhaar Card": "aadhaar",
  Agreement: "agreement",
} as const;

export const DOMAIN_DOCUMENT_TYPE_TO_AIRTABLE = {
  pan: "PAN Card",
  aadhaar: "Aadhaar Card",
  agreement: "Agreement",
} as const;

export const AIRTABLE_DOCUMENT_VERIFICATION = {
  Pending: "pending",
  Verified: "verified",
  Rejected: "rejected",
} as const;

export const DOMAIN_DOCUMENT_VERIFICATION_TO_AIRTABLE = {
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
} as const;

export const AIRTABLE_DOCUMENT_RECORD_STATUS = {
  Active: "active",
  Archived: "archived",
} as const;

export const DOMAIN_DOCUMENT_RECORD_STATUS_TO_AIRTABLE = {
  active: "Active",
  archived: "Archived",
} as const;

/**
 * Payouts — one record per Submission (Feature 11).
 */
export const PAYOUTS_TABLE_FIELDS = {
  payoutId: "Payout ID",
  submission: "Submission",
  partner: "Partner",
  job: "Job",
  candidate: "Candidate",
  amount: "Amount",
  currency: "Currency",
  eligibleDate: "Eligible Date",
  paidDate: "Paid Date",
  payoutStatus: "Payout Status",
  notes: "Notes",
  lastUpdated: "Last Updated",
} as const;

export const AIRTABLE_PAYOUT_STATUS = {
  "Not Eligible": "not_eligible",
  Eligible: "eligible",
  Processing: "processing",
  Paid: "paid",
  Completed: "completed",
} as const;

export const DOMAIN_PAYOUT_STATUS_TO_AIRTABLE = {
  not_eligible: "Not Eligible",
  eligible: "Eligible",
  processing: "Processing",
  paid: "Paid",
  completed: "Completed",
} as const;

/**
 * Activities — status transitions (Activity Timeline feature later).
 */
export const ACTIVITIES_TABLE_FIELDS = {
  entityType: "Entity Type",
  entityId: "Entity ID",
  action: "Action",
  fromStatus: "From Status",
  toStatus: "To Status",
  actor: "Actor",
  note: "Note",
  createdAt: "Created At",
} as const;

/**
 * Notifications — user-facing communications (separate from Activities).
 */
export const NOTIFICATIONS_TABLE_FIELDS = {
  notificationId: "Notification ID",
  recipient: "Recipient User",
  title: "Title",
  description: "Description",
  type: "Type",
  priority: "Priority",
  entityType: "Entity Type",
  entityId: "Entity ID",
  actionUrl: "Action URL",
  readStatus: "Read Status",
  createdAt: "Created At",
  readAt: "Read At",
  archived: "Archived",
  metadata: "Metadata",
  activityId: "Activity ID",
  category: "Category",
} as const;

export const AIRTABLE_NOTIFICATION_TYPE = {
  Registration: "registration",
  Approval: "approval",
  Invitation: "invitation",
  Job: "job",
  Allocation: "allocation",
  Candidate: "candidate",
  Interview: "interview",
  Offer: "offer",
  Joined: "joined",
  Rejected: "rejected",
  Documents: "documents",
  Payout: "payout",
  System: "system",
  Role: "role",
  Settings: "settings",
  Security: "security",
} as const;

export const DOMAIN_NOTIFICATION_TYPE_TO_AIRTABLE = {
  registration: "Registration",
  approval: "Approval",
  invitation: "Invitation",
  job: "Job",
  allocation: "Allocation",
  candidate: "Candidate",
  interview: "Interview",
  offer: "Offer",
  joined: "Joined",
  rejected: "Rejected",
  documents: "Documents",
  payout: "Payout",
  system: "System",
  role: "Role",
  settings: "Settings",
  security: "Security",
} as const;

export const AIRTABLE_NOTIFICATION_PRIORITY = {
  Low: "low",
  Medium: "medium",
  High: "high",
  Critical: "critical",
} as const;

export const DOMAIN_NOTIFICATION_PRIORITY_TO_AIRTABLE = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
} as const;

export const AIRTABLE_NOTIFICATION_READ = {
  Unread: "unread",
  Read: "read",
} as const;

export const DOMAIN_NOTIFICATION_READ_TO_AIRTABLE = {
  unread: "Unread",
  read: "Read",
} as const;

export const AIRTABLE_NOTIFICATION_CATEGORY = {
  Jobs: "jobs",
  Candidates: "candidates",
  Payouts: "payouts",
  Documents: "documents",
  System: "system",
  Security: "security",
  "Role Changes": "role_changes",
} as const;

export const DOMAIN_NOTIFICATION_CATEGORY_TO_AIRTABLE = {
  jobs: "Jobs",
  candidates: "Candidates",
  payouts: "Payouts",
  documents: "Documents",
  system: "System",
  security: "Security",
  role_changes: "Role Changes",
} as const;

export const NOTIFICATION_PREFERENCES_TABLE_FIELDS = {
  user: "User",
  defaultChannel: "Default Channel",
  categoryChannels: "Category Channels",
  updatedAt: "Updated At",
} as const;

export const AIRTABLE_NOTIFICATION_CHANNEL = {
  "In-App": "in_app",
  Email: "email",
  Both: "both",
  None: "none",
} as const;

export const DOMAIN_NOTIFICATION_CHANNEL_TO_AIRTABLE = {
  in_app: "In-App",
  email: "Email",
  both: "Both",
  none: "None",
} as const;

/**
 * Platform Settings — singleton JSON document (Settings Key = platform).
 */
export const SETTINGS_TABLE_FIELDS = {
  settingsKey: "Settings Key",
  payload: "Payload",
  updatedAt: "Updated At",
  updatedBy: "Updated By",
} as const;
