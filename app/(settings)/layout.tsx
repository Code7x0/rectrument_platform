import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { listNotificationsForUser } from "@/features/notifications/services";
import { canAccessSettings } from "@/features/settings/services";
import { requireAuth } from "@/lib/auth";

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAuth();
  if (!canAccessSettings(session.role)) {
    redirect("/forbidden");
  }

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
