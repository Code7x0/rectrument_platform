import { redirect } from "next/navigation";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { NotificationsPageClient } from "@/features/notifications/components";
import { listNotificationsForUser } from "@/features/notifications/services";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (!roleHasPermission(session.role, "view_own_notifications")) {
    redirect("/forbidden");
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const result = await listNotificationsForUser({
    recipientUserId: session.userId,
    archived: "all",
    page,
    pageSize: 40,
  });

  return (
    <NotificationsPageClient
      initialItems={result.items}
      unreadCount={result.unreadCount}
      total={result.total}
      page={result.page}
      hasMore={result.hasMore}
      breadcrumbs={[{ label: "Notifications" }]}
    />
  );
}
