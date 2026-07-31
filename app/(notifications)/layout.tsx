import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireAuth } from "@/lib/auth";
import { listNotificationsForUser } from "@/features/notifications/services";

export default async function NotificationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAuth();

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
