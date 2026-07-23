"use client";

import { useMemo } from "react";
import { Eye, Pencil, Archive } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ClientStatusBadge } from "@/features/clients/components/client-status-badge";
import type { Client } from "@/features/clients/types";

interface ClientTableProps {
  clients: Client[];
  loading?: boolean;
  canUpdate: boolean;
  canArchive: boolean;
  onOpenWorkspace: (client: Client) => void;
  onEdit: (client: Client) => void;
  onArchive: (client: Client) => void;
}

export function ClientTable({
  clients,
  loading = false,
  canUpdate,
  canArchive,
  onOpenWorkspace,
  onEdit,
  onArchive,
}: ClientTableProps) {
  const columns = useMemo<DataTableColumn<Client>[]>(
    () => [
      {
        id: "code",
        header: "Client ID",
        cell: (row) => (
          <span className="font-medium text-[#0F172A]">
            {row.clientCode ?? "—"}
          </span>
        ),
      },
      {
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
      },
      {
        id: "industry",
        header: "Industry",
        className: "text-[#64748B]",
        cell: (row) => row.industry ?? "—",
      },
      {
        id: "contact",
        header: "Primary Contact",
        className: "text-[#64748B]",
        cell: (row) => row.primaryContact ?? "—",
      },
      {
        id: "am",
        header: "Account Manager",
        className: "text-[#64748B]",
        cell: (row) => row.accountManagerName ?? "—",
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
    ],
    [canArchive, canUpdate, onArchive, onEdit, onOpenWorkspace],
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
