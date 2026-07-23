import {
  IntegrationsOverviewPanel,
  SettingsShell,
} from "@/features/settings/components";
import {
  canManageCompanySettings,
  getIntegrationsOverview,
} from "@/features/settings/services";
import { requireAuth } from "@/lib/auth";

export default async function IntegrationsSettingsPage() {
  const session = await requireAuth();
  const items = getIntegrationsOverview();

  return (
    <SettingsShell
      title="Integrations"
      description="Connector status without credential management."
      canManageCompany={canManageCompanySettings(session.role)}
      badge="Read-only"
    >
      <IntegrationsOverviewPanel items={items} />
    </SettingsShell>
  );
}
