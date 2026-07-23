import { SettingsLandingClient } from "@/features/settings/components";
import {
  getPlatformSettings,
  getSystemDiagnostics,
} from "@/features/settings/services";

export default async function SettingsPage() {
  const [settings, diagnostics] = await Promise.all([
    getPlatformSettings(),
    getSystemDiagnostics(),
  ]);

  return (
    <SettingsLandingClient
      companyName={settings.company.companyName}
      persistenceLabel={
        diagnostics.settingsPersistence === "airtable"
          ? "Airtable Settings table"
          : "In-memory defaults (configure AIRTABLE_SETTINGS_TABLE to persist)"
      }
    />
  );
}
