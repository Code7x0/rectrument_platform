import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  getUnreadNotificationCount,
  listNotificationsForUser,
} from "@/features/notifications/services";
import { requireRole } from "@/lib/auth";
import { getNavigationForRole } from "@/lib/navigation";
import type { UserRole } from "@/types";

interface RoleLayoutProps {
  children: ReactNode;
  role: UserRole | UserRole[];
}

/**
 * Shared authenticated role layout.
 * Authentication + role validation happen here once per role group.
 */
export async function RoleLayout({ children, role }: RoleLayoutProps) {
  const session = await requireRole(role);
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
