import {
  PayoutSettingsForm,
  SettingsShell,
} from "@/features/settings/components";
import {
  canManageCompanySettings,
  canManageOperationalSettings,
  getPlatformSettings,
} from "@/features/settings/services";
import { requireAuth } from "@/lib/auth";

export default async function PayoutSettingsPage() {
  const session = await requireAuth();
  const settings = await getPlatformSettings();

  return (
    <SettingsShell
      title="Payouts"
      description="Display currency, precision, and date format."
      canManageCompany={canManageCompanySettings(session.role)}
    >
      <PayoutSettingsForm
        initial={settings.payouts}
        canEdit={canManageOperationalSettings(session.role)}
      />
    </SettingsShell>
  );
}
