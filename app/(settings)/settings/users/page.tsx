import { SettingsShell, UsersDefaultsForm } from "@/features/settings/components";
import {
  canManageCompanySettings,
  canManageOperationalSettings,
  getPlatformSettings,
  getUserCountsSummary,
} from "@/features/settings/services";
import { requireAuth } from "@/lib/auth";

export default async function UsersSettingsPage() {
  const session = await requireAuth();
  const [settings, counts] = await Promise.all([
    getPlatformSettings(),
    getUserCountsSummary(),
  ]);

  return (
    <SettingsShell
      title="Users & Roles"
      description="Registration and invitation defaults. Role management stays separate."
      canManageCompany={canManageCompanySettings(session.role)}
    >
      <UsersDefaultsForm
        initial={settings.users}
        counts={counts}
        canEdit={canManageOperationalSettings(session.role)}
        canEnableAutoApprove={canManageCompanySettings(session.role)}
        roleManagementHref={
          session.role === "super_admin" ? "/super-admin/users" : null
        }
      />
    </SettingsShell>
  );
}
