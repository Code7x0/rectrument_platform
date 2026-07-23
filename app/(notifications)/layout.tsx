import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireAuth } from "@/lib/auth";
import { getNavigationForRole } from "@/lib/navigation";
import {
  getUnreadNotificationCount,
  listNotificationsForUser,
} from "@/features/notifications/services";

export default async function NotificationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAuth();
  const navItems = getNavigationForRole(session.role);

  const [unreadCount, recent] = await Promise.all([
    getUnreadNotificationCount(session.userId),
    listNotificationsForUser({
      recipientUserId: session.userId,
      archived: false,
      page: 1,
      pageSize: 8,
    }),
  ]);

  return (
    <DashboardShell
      navItems={navItems}
      notificationUnreadCount={unreadCount}
      recentNotifications={recent.items}
    >
      {children}
    </DashboardShell>
  );
}
