"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sendTestEmailAction } from "@/features/settings/actions/settings.actions";
import type { SystemDiagnostics } from "@/features/settings/types";

interface SystemDiagnosticsPanelProps {
  diagnostics: SystemDiagnostics;
  canSendTestEmail?: boolean;
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
  canSendTestEmail = false,
}: SystemDiagnosticsPanelProps) {
  const [pending, startTransition] = useTransition();
  const [lastTestProvider, setLastTestProvider] = useState<string | null>(null);

  function onSendTestEmail() {
    startTransition(async () => {
      const result = await sendTestEmailAction();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setLastTestProvider(result.data.provider);
      toast.success(
        diagnostics.emailDelivery === "resend"
          ? "Test email sent — check your inbox"
          : "Test email logged to server console (Resend not configured)",
      );
    });
  }

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
        <Badge
          variant={
            diagnostics.emailDelivery === "resend" ? "success" : "warning"
          }
        >
          Email {diagnostics.emailDelivery}
        </Badge>
      </div>

      <div className="rounded-xl border border-[#E2E8F0] px-4">
        <Row label="Environment" value={diagnostics.environment} />
        <Row label="NODE_ENV" value={diagnostics.nodeEnv} />
        <Row label="Email provider" value={diagnostics.emailProvider} />
        <Row label="Email delivery" value={diagnostics.emailDelivery} />
        <Row
          label="EMAIL_FROM configured"
          value={diagnostics.emailFromConfigured ? "yes" : "no"}
        />
        <Row
          label="Super Admin recipients"
          value={String(diagnostics.superAdminRecipients)}
        />
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

      {canSendTestEmail ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onSendTestEmail}
          >
            {pending ? "Sending…" : "Send test email to me"}
          </Button>
          {lastTestProvider ? (
            <span className="text-xs text-[#64748B]">
              Last provider: {lastTestProvider}
            </span>
          ) : null}
        </div>
      ) : null}

      {diagnostics.emailDelivery === "console" ? (
        <p className="text-sm text-[#64748B]">
          Emails are not delivered yet. Set{" "}
          <code className="text-xs">EMAIL_PROVIDER=resend</code>,{" "}
          <code className="text-xs">RESEND_API_KEY</code>, and{" "}
          <code className="text-xs">EMAIL_FROM</code> in Vercel, then redeploy.
          Also set <code className="text-xs">AIRTABLE_SUPER_ADMIN_EMAILS</code>{" "}
          so registration alerts have a recipient.
        </p>
      ) : null}
    </div>
  );
}
