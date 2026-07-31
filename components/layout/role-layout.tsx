import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { listNotificationsForUser } from "@/features/notifications/services";
import { requireRole } from "@/lib/auth";
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

  // One notifications list query — unread badge comes from the same result.
  const recent = await listNotificationsForUser({
    recipientUserId: session.userId,
    archived: false,
    page: 1,
    pageSize: 8,
  });

  return (
    <DashboardShell
      role={session.role}
      notificationUnreadCount={recent.unreadCount}
      recentNotifications={recent.items}
    >
      {children}
    </DashboardShell>
  );
}
