import { FilePreviewLink } from "@/components/shared/file-preview-link";
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
  /** Account Managers see Client ID, not commercial name. */
  hideClientName?: boolean;
}

export function ClientOverviewTab({
  client,
  stats,
  hideClientName = false,
}: ClientOverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <ClientStatusBadge status={client.status} />
        <span className="text-sm font-medium text-[#0F172A]">
          {client.clientCode ?? "—"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <WorkspaceMetricCard
          label="Active Roles"
          value={stats.activeRoleCount ?? stats.jobCount}
          hint="Open / on-hold jobs"
        />
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
          {!hideClientName ? (
            <Detail label="Client Name" value={client.name} />
          ) : null}
          <Detail label="Industry" value={client.industry} />
          <Detail
            label="Address"
            value={client.primaryAddress || client.addresses}
          />
          <Detail label="Employee Size" value={client.employeeSize} />
          <Detail label="Mode of Work" value={client.modeOfWork} />
          <Detail label="Work Days" value={client.workDaysInWeek} />
          {!hideClientName ? (
            <Detail label="Primary Contact" value={client.primaryContact} />
          ) : null}
          {!hideClientName ? (
            <Detail label="Account Manager" value={client.accountManagerName} />
          ) : null}
          <Detail label="Website" value={client.website} />
          <Detail label="Status" value={client.status} />
        </div>
        <div className="mt-4">
          <Detail label="Notes" value={client.notes} />
        </div>
        {(client.briefDeck?.length ?? 0) > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
              Client Brief PPT
            </p>
            <ul className="mt-2 space-y-2">
              {client.briefDeck!.map((file) => (
                <li key={`${file.filename}-${file.url}`}>
                  <FilePreviewLink
                    url={file.url}
                    filename={file.filename}
                    title={file.filename}
                    className="text-sm font-medium text-[#0F766E] underline-offset-2 hover:underline"
                  >
                    {file.filename}
                  </FilePreviewLink>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-4">
            <Detail label="Client Brief PPT" value={null} />
          </div>
        )}
      </WorkspaceSection>
    </div>
  );
}
