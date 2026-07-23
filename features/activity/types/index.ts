/**
 * Activity Timeline — presentation + aggregation over workflows Activity Service.
 * Does not own persistence. Activities remain the audit log.
 */

import type {
  Activity,
  ActivityAction,
  ActivityEntityType,
} from "@/features/workflows/types";
import type { UserRole } from "@/types";

export type TimelineEntityKind =
  | "submission"
  | "partner_document"
  | "payout"
  | "user"
  | "partner"
  | "job"
  | "client"
  | "allocation"
  | "candidate"
  | "document"
  | "notification";

export interface TimelineEntityRef {
  kind: TimelineEntityKind;
  id: string;
}

export type TimelineDateBucket =
  | "today"
  | "yesterday"
  | "earlier_this_week"
  | "earlier_this_month"
  | "older";

export interface TimelineItem {
  id: string;
  entityType: ActivityEntityType;
  entityId: string;
  action: ActivityAction;
  fromStatus: string | null;
  toStatus: string | null;
  actorUserId: string | null;
  actorName: string | null;
  actorRole: UserRole | null;
  note: string | null;
  createdAt: string | null;
  title: string;
  summary: string | null;
  href: string | null;
  entityLabel: string;
}

export interface TimelineGroup {
  bucket: TimelineDateBucket;
  label: string;
  items: TimelineItem[];
}

export interface TimelineListFilters {
  entityType?: ActivityEntityType | "all";
  action?: ActivityAction | "all";
  actorUserId?: string | "all";
  actorRole?: UserRole | "all";
  search?: string;
  fromDate?: string | null;
  toDate?: string | null;
  /** Future-ready; ignored until unread tracking exists on activities. */
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface TimelineListResult {
  items: TimelineItem[];
  groups: TimelineGroup[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export type ActivitySource = Activity;

export const TIMELINE_DATE_BUCKET_LABELS: Record<TimelineDateBucket, string> = {
  today: "Today",
  yesterday: "Yesterday",
  earlier_this_week: "Earlier This Week",
  earlier_this_month: "Earlier This Month",
  older: "Older",
};

export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  status_change: "Status updated",
  document_verification: "Document verification",
  payout_status_change: "Payout status updated",
  registration_submitted: "Registration submitted",
  partner_approved: "Partner approved",
  partner_rejected: "Partner rejected",
  invitation_sent: "Invitation sent",
  invitation_accepted: "Invitation accepted",
  role_changed: "Role changed",
  identity_visibility_changed: "Identity visibility changed",
};

export const ACTIVITY_ENTITY_LABELS: Record<ActivityEntityType, string> = {
  submission: "Submission",
  partner_document: "Document",
  payout: "Payout",
  user: "User",
};

export const ALL_ACTIVITY_ACTIONS = Object.keys(
  ACTIVITY_ACTION_LABELS,
) as ActivityAction[];

export const ALL_ACTIVITY_ENTITY_TYPES = Object.keys(
  ACTIVITY_ENTITY_LABELS,
) as ActivityEntityType[];
