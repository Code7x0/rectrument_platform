import {
  SecurityOverviewPanel,
  SettingsShell,
} from "@/features/settings/components";
import {
  canManageCompanySettings,
  getSecurityOverview,
} from "@/features/settings/services";
import { requireAuth } from "@/lib/auth";

export default async function SecuritySettingsPage() {
  const session = await requireAuth();
  const overview = getSecurityOverview();

  return (
    <SettingsShell
      title="Security"
      description="Session and audit overview — future-ready, read-only."
      canManageCompany={canManageCompanySettings(session.role)}
      badge="Read-only"
    >
      <SecurityOverviewPanel overview={overview} />
    </SettingsShell>
  );
}
