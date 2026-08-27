"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Eye, Pencil, Archive, UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FilePreviewLink } from "@/components/shared/file-preview-link";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ClientStatusBadge } from "@/features/clients/components/client-status-badge";
import type { Client } from "@/features/clients/types";
import { cn } from "@/lib/utils";

interface ClientTableProps {
  clients: Client[];
  loading?: boolean;
  canUpdate: boolean;
  canArchive: boolean;
  /** Account Managers see Client ID only — not the commercial client name. */
  hideClientName?: boolean;
  onOpenWorkspace: (client: Client) => void;
  onEdit: (client: Client) => void;
  onArchive: (client: Client) => void;
  onAssignAm?: (client: Client) => void;
}

const EXPAND_COL_WIDTH = "2.75rem";
const CODE_COL_WIDTH = "7rem";

function clientDisplayCode(client: Client): string {
  return client.clientCode?.trim() || "—";
}

function workDaysLabel(client: Client): string {
  const days =
    client.workDaysInWeek != null
      ? `${client.workDaysInWeek} day${client.workDaysInWeek === 1 ? "" : "s"}`
      : null;
  const mode = client.modeOfWork?.trim() || null;
  return [days, mode].filter(Boolean).join(" · ") || "—";
}

function DetailField({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#94A3B8]">
        {label}
      </p>
      <p className="mt-1 text-sm text-[#0F172A] break-words">{value || "—"}</p>
    </div>
  );
}

function ClientExpandedDetails({
  client,
  hideClientName,
  canUpdate,
  canArchive,
  onOpenWorkspace,
  onEdit,
  onArchive,
  onAssignAm,
}: {
  client: Client;
  hideClientName: boolean;
  canUpdate: boolean;
  canArchive: boolean;
  onOpenWorkspace: (client: Client) => void;
  onEdit: (client: Client) => void;
  onArchive: (client: Client) => void;
  onAssignAm?: (client: Client) => void;
}) {
  return (
    <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
      {hideClientName ? (
        <div className="mb-4 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]">
            Recruiter briefing kit
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="Website" value={client.website} />
            <DetailField label="Client Name" value={client.name} />
            <DetailField label="Client Code" value={client.clientCode} />
            <DetailField label="Employee size" value={client.employeeSize} />
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#94A3B8]">
              Recruiter Kit
            </p>
            {(client.briefDeck?.length ?? 0) > 0 ? (
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
            ) : (
              <p className="mt-2 text-sm text-[#64748B]">No kit uploaded yet.</p>
            )}
          </div>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DetailField label="Industry" value={client.industry} />
        <DetailField label="Employee size" value={client.employeeSize} />
        <DetailField label="WFO / WFH" value={workDaysLabel(client)} />
        <DetailField
          label="Office address"
          value={client.primaryAddress}
          className="sm:col-span-2"
        />
        <DetailField label="Work address" value={client.addresses} />
        {!hideClientName ? (
          <DetailField label="Primary contact" value={client.primaryContact} />
        ) : null}
        {!hideClientName ? (
          <DetailField
            label="Account manager"
            value={client.accountManagerName}
          />
        ) : null}
        {client.website ? (
          <DetailField label="Website" value={client.website} />
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E2E8F0] pt-4">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onOpenWorkspace(client)}
        >
          <Eye className="h-4 w-4" />
          Open workspace
        </Button>
        {canUpdate && client.status !== "archived" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onEdit(client)}
          >
            <Pencil className="h-4 w-4" />
            Edit client
          </Button>
        ) : null}
        {canUpdate && client.status !== "archived" && onAssignAm ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onAssignAm(client)}
          >
            <UserCog className="h-4 w-4" />
            Assign AM
          </Button>
        ) : null}
        {canArchive && client.status !== "archived" ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => onArchive(client)}
          >
            <Archive className="h-4 w-4" />
            Archive
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ClientTable({
  clients,
  loading = false,
  canUpdate,
  canArchive,
  hideClientName = false,
  onOpenWorkspace,
  onEdit,
  onArchive,
  onAssignAm,
}: ClientTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  function toggleExpanded(clientId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  }

  const columns = useMemo<DataTableColumn<Client>[]>(
    () => {
      const nameOffset = `calc(${EXPAND_COL_WIDTH} + ${CODE_COL_WIDTH})`;

      const cols: DataTableColumn<Client>[] = [
        {
          id: "expand",
          header: "",
          sticky: "left",
          stickyOffset: "0",
          className: "w-11 px-2",
          headerClassName: "w-11 px-2",
          cell: (row) => {
            const expanded = expandedIds.has(row.id);
            return (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label={expanded ? "Collapse client details" : "Expand client details"}
                aria-expanded={expanded}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleExpanded(row.id);
                }}
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            );
          },
        },
        {
          id: "code",
          header: "Client ID",
          sticky: "left",
          stickyOffset: EXPAND_COL_WIDTH,
          className: "w-28 whitespace-nowrap",
          headerClassName: "w-28 whitespace-nowrap",
          cell: (row) =>
            hideClientName ? (
              <button
                type="button"
                className="text-left font-medium text-[#2563EB] hover:underline"
                onClick={() => onOpenWorkspace(row)}
              >
                {clientDisplayCode(row)}
              </button>
            ) : (
              <span className="font-medium text-[#0F172A]">
                {clientDisplayCode(row)}
              </span>
            ),
        },
      ];

      if (!hideClientName) {
        cols.push({
          id: "name",
          header: "Client Name",
          sticky: "left",
          stickyOffset: nameOffset,
          className: "min-w-[9rem] max-w-[14rem]",
          headerClassName: "min-w-[9rem] max-w-[14rem]",
          cell: (row) => (
            <button
              type="button"
              className="line-clamp-2 text-left font-medium text-[#2563EB] hover:underline"
              onClick={() => onOpenWorkspace(row)}
            >
              {row.name}
            </button>
          ),
        });
      }

      cols.push(
        {
          id: "industry",
          header: "Industry",
          className: "hidden text-[#64748B] lg:table-cell",
          headerClassName: "hidden lg:table-cell",
          cell: (row) => (
            <span className="line-clamp-1">{row.industry ?? "—"}</span>
          ),
        },
        {
          id: "status",
          header: "Status",
          cell: (row) => <ClientStatusBadge status={row.status} />,
        },
        {
          id: "actions",
          header: "Actions",
          align: "right",
          sticky: "right",
          className: "whitespace-nowrap",
          headerClassName: "whitespace-nowrap",
          cell: (row) => (
            <div className="flex items-center justify-end gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Open workspace"
                onClick={() => onOpenWorkspace(row)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              {canUpdate && row.status !== "archived" && onAssignAm ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label="Assign account manager"
                  className="hidden gap-1 px-2 xl:inline-flex"
                  onClick={() => onAssignAm(row)}
                >
                  <UserCog className="h-4 w-4" />
                  <span>Assign AM</span>
                </Button>
              ) : null}
              {canUpdate && row.status !== "archived" ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Edit client"
                  onClick={() => onEdit(row)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : null}
              {canArchive && row.status !== "archived" ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Archive client"
                  onClick={() => onArchive(row)}
                >
                  <Archive className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ),
        },
      );

      return cols;
    },
    [
      canArchive,
      canUpdate,
      expandedIds,
      hideClientName,
      onArchive,
      onAssignAm,
      onEdit,
      onOpenWorkspace,
    ],
  );

  return (
    <DataTable
      columns={columns}
      data={clients}
      getRowId={(row) => row.id}
      loading={loading}
      maxBodyHeight="calc(100vh - 15rem)"
      emptyTitle="No Clients Found"
      emptyDescription="Create a client to start managing jobs and allocations."
      isSubRowExpanded={(row) => expandedIds.has(row.id)}
      renderSubRow={(row) => (
        <ClientExpandedDetails
          client={row}
          hideClientName={hideClientName}
          canUpdate={canUpdate}
          canArchive={canArchive}
          onOpenWorkspace={onOpenWorkspace}
          onEdit={onEdit}
          onArchive={onArchive}
          onAssignAm={onAssignAm}
        />
      )}
    />
  );
}
