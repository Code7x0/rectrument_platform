"use client";

import { Badge } from "@/components/ui/badge";
import type { SystemDiagnostics } from "@/features/settings/types";

interface SystemDiagnosticsPanelProps {
  diagnostics: SystemDiagnostics;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9] py-3 last:border-0">
      <span className="text-sm text-[#64748B]">{label}</span>
      <span className="font-mono text-xs text-[#0F172A]">{value}</span>
    </div>
  );
}

export function SystemDiagnosticsPanel({
  diagnostics,
}: SystemDiagnosticsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{diagnostics.platformName}</Badge>
        <Badge variant="outline">v{diagnostics.platformVersion}</Badge>
        <Badge
          variant={
            diagnostics.databaseStatus === "configured" ? "success" : "warning"
          }
        >
          DB {diagnostics.databaseStatus}
        </Badge>
      </div>

      <div className="rounded-xl border border-[#E2E8F0] px-4">
        <Row label="Environment" value={diagnostics.environment} />
        <Row label="NODE_ENV" value={diagnostics.nodeEnv} />
        <Row label="Email provider" value={diagnostics.emailProvider} />
        <Row label="Upload provider" value={diagnostics.uploadProvider} />
        <Row label="Activity service" value={diagnostics.activityService} />
        <Row
          label="Notification service"
          value={diagnostics.notificationService}
        />
        <Row
          label="Settings persistence"
          value={diagnostics.settingsPersistence}
        />
        <Row label="Build / commit" value={diagnostics.buildTimestamp} />
        <Row label="TypeScript mode" value={diagnostics.typescriptMode} />
      </div>
    </div>
  );
}
