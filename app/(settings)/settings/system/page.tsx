import {
  SettingsShell,
  SystemDiagnosticsPanel,
} from "@/features/settings/components";
import {
  canManageCompanySettings,
  getSystemDiagnostics,
} from "@/features/settings/services";
import { requireAuth } from "@/lib/auth";

export default async function SystemSettingsPage() {
  const session = await requireAuth();
  const diagnostics = await getSystemDiagnostics();

  return (
    <SettingsShell
      title="System"
      description="Production diagnostics for debugging."
      canManageCompany={canManageCompanySettings(session.role)}
      badge="Read-only"
    >
      <SystemDiagnosticsPanel diagnostics={diagnostics} />
    </SettingsShell>
  );
}
