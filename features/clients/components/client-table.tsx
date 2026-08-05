"use client";

import { useMemo } from "react";
import { Eye, Pencil, Archive, UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ClientStatusBadge } from "@/features/clients/components/client-status-badge";
import type { Client } from "@/features/clients/types";

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

function clientDisplayCode(client: Client): string {
  return client.clientCode?.trim() || "—";
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
  const columns = useMemo<DataTableColumn<Client>[]>(
    () => {
      const cols: DataTableColumn<Client>[] = [
        {
          id: "code",
          header: "Client ID",
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
          cell: (row) => (
            <button
              type="button"
              className="text-left font-medium text-[#2563EB] hover:underline"
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
          className: "text-[#64748B]",
          cell: (row) => row.industry ?? "—",
        },
        {
          id: "address",
          header: "Address",
          className: "text-[#64748B]",
          cell: (row) => row.primaryAddress || row.addresses || "—",
        },
        {
          id: "employeeSize",
          header: "Employee Size",
          className: "text-[#64748B]",
          cell: (row) => row.employeeSize ?? "—",
        },
        {
          id: "workMode",
          header: "Mode of Work",
          className: "text-[#64748B]",
          cell: (row) => row.modeOfWork ?? "—",
        },
        {
          id: "workDays",
          header: "Work Days",
          className: "text-[#64748B]",
          cell: (row) => row.workDaysInWeek ?? "—",
        },
      );

      if (!hideClientName) {
        cols.push({
          id: "contact",
          header: "Primary Contact",
          className: "text-[#64748B]",
          cell: (row) => row.primaryContact ?? "—",
        });
      }

      if (!hideClientName) {
        cols.push({
          id: "am",
          header: "Account Manager",
          className: "text-[#64748B]",
          cell: (row) => row.accountManagerName ?? "—",
        });
      }

      cols.push(
        {
          id: "status",
          header: "Status",
          cell: (row) => <ClientStatusBadge status={row.status} />,
        },
        {
          id: "actions",
          header: "Actions",
          align: "right",
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
                  className="gap-1 px-2"
                  onClick={() => onAssignAm(row)}
                >
                  <UserCog className="h-4 w-4" />
                  <span className="hidden xl:inline">Assign AM</span>
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
      emptyTitle="No Clients Found"
      emptyDescription="Create a client to start managing jobs and allocations."
    />
  );
}
