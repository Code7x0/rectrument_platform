import {
  NotificationPlatformSettingsForm,
  SettingsShell,
} from "@/features/settings/components";
import {
  canManageCompanySettings,
  canManageOperationalSettings,
  getPlatformSettings,
} from "@/features/settings/services";
import { requireAuth } from "@/lib/auth";

export default async function NotificationSettingsPage() {
  const session = await requireAuth();
  const settings = await getPlatformSettings();

  return (
    <SettingsShell
      title="Notifications"
      description="Platform-wide defaults for Feature 14. Per-user preferences remain separate."
      canManageCompany={canManageCompanySettings(session.role)}
    >
      <NotificationPlatformSettingsForm
        initial={settings.notifications}
        canEdit={canManageOperationalSettings(session.role)}
      />
    </SettingsShell>
  );
}
