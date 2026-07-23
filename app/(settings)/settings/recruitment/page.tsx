import {
  RecruitmentSettingsForm,
  SettingsShell,
} from "@/features/settings/components";
import {
  canManageCompanySettings,
  canManageOperationalSettings,
  getPlatformSettings,
} from "@/features/settings/services";
import { requireAuth } from "@/lib/auth";

export default async function RecruitmentSettingsPage() {
  const session = await requireAuth();
  const settings = await getPlatformSettings();

  return (
    <SettingsShell
      title="Recruitment"
      description="Configurable defaults for documents and allocations."
      canManageCompany={canManageCompanySettings(session.role)}
    >
      <RecruitmentSettingsForm
        initial={settings.recruitment}
        canEdit={canManageOperationalSettings(session.role)}
      />
    </SettingsShell>
  );
}
