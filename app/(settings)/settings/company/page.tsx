import { CompanySettingsForm, SettingsShell } from "@/features/settings/components";
import {
  canManageCompanySettings,
  getPlatformSettings,
} from "@/features/settings/services";
import { requireAuth } from "@/lib/auth";

export default async function CompanySettingsPage() {
  const session = await requireAuth();
  const settings = await getPlatformSettings();
  const canEdit = canManageCompanySettings(session.role);

  return (
    <SettingsShell
      title="Company"
      description="Organization identity, contact, and locale defaults."
      canManageCompany={canEdit}
    >
      <CompanySettingsForm initial={settings.company} canEdit={canEdit} />
    </SettingsShell>
  );
}
