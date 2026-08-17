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
      <p className="mt-1 whitespace-pre-wrap text-sm text-[#0F172A]">
        {value || "—"}
      </p>
    </div>
  );
}

function formatWfoWfhDays(
  workDaysInWeek: number | null | undefined,
  modeOfWork: string | null | undefined,
) {
  const days =
    workDaysInWeek != null ? `${workDaysInWeek} day${workDaysInWeek === 1 ? "" : "s"}` : null;
  const mode = modeOfWork?.trim() || null;
  return [days, mode].filter(Boolean).join(" · ") || "—";
}

interface ClientOverviewTabProps {
  client: Client;
  stats: ClientWorkspaceStats;
  /** Account Managers see Client ID, not commercial name. */
  hideClientName?: boolean;
  jobsHref?: string;
  partnersHref?: string;
  candidatesHref?: string;
  activityHref?: string;
}

export function ClientOverviewTab({
  client,
  stats,
  hideClientName = false,
  jobsHref,
  partnersHref,
  candidatesHref,
  activityHref,
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
          href={jobsHref}
        />
        <WorkspaceMetricCard
          label="Jobs"
          value={stats.jobCount}
          hint="Calculated from Jobs"
          href={jobsHref}
        />
        <WorkspaceMetricCard
          label="Talent Partners"
          value={stats.partnerCount}
          hint="Allocated to this client's jobs"
          href={partnersHref}
        />
        <WorkspaceMetricCard
          label="Candidates"
          value={stats.candidateCount}
          href={candidatesHref}
        />
        <WorkspaceMetricCard
          label="Activity"
          value="View"
          hint="Workspace timeline"
          href={activityHref}
        />
      </div>

      <WorkspaceSection title="Client Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Detail label="Client ID" value={client.clientCode} />
          {!hideClientName ? (
            <Detail label="Client Name" value={client.name} />
          ) : null}
          <Detail label="Industry" value={client.industry} />
          <Detail
            label="Primary address of work"
            value={client.primaryAddress || client.addresses}
          />
          <Detail label="Employee Size" value={client.employeeSize} />
          <Detail
            label="No of days WFO/WFH"
            value={formatWfoWfhDays(client.workDaysInWeek, client.modeOfWork)}
          />
          {!hideClientName ? (
            <Detail label="Primary Contact" value={client.primaryContact} />
          ) : null}
          {!hideClientName ? (
            <Detail label="Account Manager" value={client.accountManagerName} />
          ) : null}
          <Detail label="Website" value={client.website} />
          <Detail label="Status" value={client.status} />
        </div>
      </WorkspaceSection>

      <WorkspaceSection title="Key Notes">
        <p className="whitespace-pre-wrap text-sm text-[#0F172A]">
          {client.notes?.trim() || "—"}
        </p>
      </WorkspaceSection>

      <WorkspaceSection title="Client Information Kit">
        {(client.briefDeck?.length ?? 0) > 0 ? (
          <ul className="space-y-2">
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
        ) : (
          <p className="text-sm text-[#64748B]">No kit uploaded yet.</p>
        )}
      </WorkspaceSection>
    </div>
  );
}
