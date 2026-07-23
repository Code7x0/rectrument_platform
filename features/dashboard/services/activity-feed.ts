import type { Activity } from "@/features/workflows/types";
import type { DashboardActivityItem } from "@/features/dashboard/types";

const ACTION_TITLES: Record<string, string> = {
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

function activityHref(activity: Activity): string | undefined {
  switch (activity.entityType) {
    case "user":
      if (
        activity.action === "registration_submitted" ||
        activity.action === "partner_approved" ||
        activity.action === "partner_rejected"
      ) {
        return "/admin/approvals";
      }
      return "/super-admin/users";
    case "partner_document":
      return "/admin/documents";
    case "payout":
      return "/admin/payouts";
    case "submission":
      return "/admin/candidates";
    default:
      return undefined;
  }
}

export function toDashboardActivityItem(
  activity: Activity,
): DashboardActivityItem {
  const fromTo =
    activity.fromStatus && activity.toStatus
      ? `${activity.fromStatus} → ${activity.toStatus}`
      : (activity.toStatus ?? activity.fromStatus);

  return {
    id: activity.id,
    title: ACTION_TITLES[activity.action] ?? activity.action,
    description: activity.note ?? fromTo,
    timestamp: activity.createdAt,
    href: activityHref(activity),
  };
}

export function mapActivitiesToFeed(
  activities: Activity[],
): DashboardActivityItem[] {
  return activities.map(toDashboardActivityItem);
}
