import type { Activity, ActivityEntityType } from "@/features/workflows/types";
import type { UserRole } from "@/types";
import {
  ACTIVITY_ACTION_LABELS,
  ACTIVITY_ENTITY_LABELS,
  type TimelineItem,
} from "@/features/activity/types";

export function activityEntityKey(
  entityType: ActivityEntityType,
  entityId: string,
): string {
  return `${entityType}:${entityId}`;
}

export function formatStatusLabel(status: string | null): string | null {
  if (!status) {
    return null;
  }
  return status.replace(/_/g, " ");
}

export function buildActivitySummary(activity: Activity): string | null {
  if (activity.note?.trim()) {
    return activity.note.trim();
  }
  const from = formatStatusLabel(activity.fromStatus);
  const to = formatStatusLabel(activity.toStatus);
  if (from && to) {
    return `${from} → ${to}`;
  }
  return to ?? from;
}

export function resolveActivityHref(
  activity: Activity,
  viewerRole: UserRole,
): string | null {
  switch (activity.entityType) {
    case "submission":
      if (viewerRole === "partner") {
        return "/partner/candidates";
      }
      if (viewerRole === "account_manager") {
        return "/account-manager/candidates";
      }
      return "/admin/candidates";
    case "payout":
      if (viewerRole === "partner") {
        return "/partner/payments";
      }
      if (viewerRole === "account_manager") {
        return "/account-manager/payouts";
      }
      return "/admin/payouts";
    case "partner_document":
      if (viewerRole === "partner") {
        return "/partner/documents";
      }
      if (viewerRole === "account_manager") {
        return "/account-manager/documents";
      }
      return "/admin/documents";
    case "user":
      if (
        activity.action === "registration_submitted" ||
        activity.action === "partner_approved" ||
        activity.action === "partner_rejected"
      ) {
        return viewerRole === "super_admin" || viewerRole === "admin"
          ? "/admin/approvals"
          : null;
      }
      return viewerRole === "super_admin" ? "/super-admin/users" : null;
    default:
      return null;
  }
}

export function toTimelineItem(
  activity: Activity,
  viewerRole: UserRole,
  actors: Map<
    string,
    { name: string; role: UserRole | null }
  >,
): TimelineItem {
  const actor = activity.actorUserId
    ? actors.get(activity.actorUserId)
    : undefined;

  return {
    id: activity.id,
    entityType: activity.entityType,
    entityId: activity.entityId,
    action: activity.action,
    fromStatus: activity.fromStatus,
    toStatus: activity.toStatus,
    actorUserId: activity.actorUserId,
    actorName: actor?.name ?? null,
    actorRole: actor?.role ?? null,
    note: activity.note,
    createdAt: activity.createdAt,
    title: ACTIVITY_ACTION_LABELS[activity.action] ?? activity.action,
    summary: buildActivitySummary(activity),
    href: resolveActivityHref(activity, viewerRole),
    entityLabel: ACTIVITY_ENTITY_LABELS[activity.entityType] ?? activity.entityType,
  };
}
