/**
 * Notifications — user-facing communications.
 * Separate from Activities (audit log).
 */

export type NotificationType =
  | "registration"
  | "approval"
  | "invitation"
  | "job"
  | "allocation"
  | "candidate"
  | "interview"
  | "offer"
  | "joined"
  | "rejected"
  | "documents"
  | "payout"
  | "system"
  | "role"
  | "settings"
  | "security";

export type NotificationPriority = "low" | "medium" | "high" | "critical";

export type NotificationReadStatus = "unread" | "read";

export type NotificationCategory =
  | "jobs"
  | "candidates"
  | "payouts"
  | "documents"
  | "system"
  | "security"
  | "role_changes";

export type NotificationChannel = "in_app" | "email" | "both" | "none";

export type NotificationEntityType =
  | "user"
  | "partner"
  | "job"
  | "allocation"
  | "submission"
  | "candidate"
  | "partner_document"
  | "payout"
  | "system";

export interface Notification {
  id: string;
  notificationCode: string | null;
  recipientUserId: string;
  title: string;
  description: string | null;
  type: NotificationType;
  priority: NotificationPriority;
  category: NotificationCategory;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  actionUrl: string | null;
  readStatus: NotificationReadStatus;
  createdAt: string | null;
  readAt: string | null;
  archived: boolean;
  metadata: Record<string, string> | null;
  activityId: string | null;
}

export interface CreateNotificationInput {
  recipientUserId: string;
  title: string;
  description?: string | null;
  type: NotificationType;
  priority?: NotificationPriority;
  category: NotificationCategory;
  entityType?: NotificationEntityType | null;
  entityId?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, string> | null;
  activityId?: string | null;
  /** When true, also attempt email if preferences allow. */
  sendEmail?: boolean;
  emailTemplate?:
    | "approval"
    | "rejection"
    | "invitation"
    | "welcome"
    | "account_activated"
    | "password_setup"
    | "candidate_joined"
    | "payout_approved";
  emailData?: Record<string, string>;
}

export interface NotificationListFilters {
  recipientUserId: string;
  readStatus?: NotificationReadStatus | "all";
  archived?: boolean | "all";
  type?: NotificationType | "all";
  category?: NotificationCategory | "all";
  priority?: NotificationPriority | "all";
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface NotificationListResult {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  unreadCount: number;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  defaultChannel: NotificationChannel;
  categories: Record<NotificationCategory, NotificationChannel>;
  updatedAt: string | null;
}

export type UpdateNotificationPreferencesInput = {
  defaultChannel?: NotificationChannel;
  categories?: Partial<Record<NotificationCategory, NotificationChannel>>;
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
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
};

export const NOTIFICATION_PRIORITY_LABELS: Record<
  NotificationPriority,
  string
> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const NOTIFICATION_CATEGORY_LABELS: Record<
  NotificationCategory,
  string
> = {
  jobs: "Jobs",
  candidates: "Candidates",
  payouts: "Payouts",
  documents: "Documents",
  system: "System",
  security: "Security",
  role_changes: "Role Changes",
};

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> =
  {
    in_app: "In-App",
    email: "Email",
    both: "Both",
    none: "None",
  };

export const DEFAULT_CATEGORY_CHANNELS: Record<
  NotificationCategory,
  NotificationChannel
> = {
  jobs: "both",
  candidates: "both",
  payouts: "both",
  documents: "both",
  system: "in_app",
  security: "both",
  role_changes: "both",
};

export const ALL_NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  "jobs",
  "candidates",
  "payouts",
  "documents",
  "system",
  "security",
  "role_changes",
];
