import { ClientStatusBadge } from "@/features/clients/components/client-status-badge";
import {
  WorkspaceMetricCard,
  WorkspaceSection,
} from "@/features/shared/workspace";
import type { Client, ClientWorkspaceStats } from "@/features/clients/types";

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
        {label}
      </p>
      <p className="mt-1 text-sm text-[#0F172A]">{value || "—"}</p>
    </div>
  );
}

interface ClientOverviewTabProps {
  client: Client;
  stats: ClientWorkspaceStats;
}

export function ClientOverviewTab({ client, stats }: ClientOverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <ClientStatusBadge status={client.status} />
        <span className="text-sm text-[#64748B]">{client.clientCode}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <WorkspaceMetricCard
          label="Jobs"
          value={stats.jobCount}
          hint="Calculated from Jobs"
        />
        <WorkspaceMetricCard
          label="Partners"
          value={stats.partnerCount}
          hint="Coming with Partner Workspace"
        />
        <WorkspaceMetricCard
          label="Candidates"
          value={stats.candidateCount}
          hint="Via submissions on client jobs"
        />
      </div>

      <WorkspaceSection title="Client Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Detail label="Industry" value={client.industry} />
          <Detail label="Primary Contact" value={client.primaryContact} />
          <Detail label="Account Manager" value={client.accountManagerName} />
          <Detail label="Website" value={client.website} />
          <Detail label="Status" value={client.status} />
        </div>
        <div className="mt-4">
          <Detail label="Notes" value={client.notes} />
        </div>
      </WorkspaceSection>
    </div>
  );
}
