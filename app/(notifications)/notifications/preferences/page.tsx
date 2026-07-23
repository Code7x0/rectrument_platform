import { redirect } from "next/navigation";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { NotificationPreferencesPageClient } from "@/features/notifications/components";
import { getOrCreatePreferences } from "@/features/notifications/services";

export default async function NotificationPreferencesPage() {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (
    !roleHasPermission(session.role, "manage_own_notification_preferences")
  ) {
    redirect("/forbidden");
  }

  const preferences = await getOrCreatePreferences(session.userId);

  return (
    <NotificationPreferencesPageClient
      preferences={preferences}
      breadcrumbs={[
        { label: "Notifications", href: "/notifications" },
        { label: "Preferences" },
      ]}
    />
  );
}
