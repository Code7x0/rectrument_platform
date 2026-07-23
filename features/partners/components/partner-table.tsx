"use client";

import { useMemo } from "react";
import { Eye, Pencil, Archive } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import {
  PartnerStatusBadge,
  PartnerVerificationBadge,
} from "@/features/partners/components/partner-status-badge";
import type { Partner } from "@/features/partners/types";

interface PartnerTableProps {
  partners: Partner[];
  loading?: boolean;
  canUpdate: boolean;
  canArchive: boolean;
  onOpenWorkspace: (partner: Partner) => void;
  onEdit: (partner: Partner) => void;
  onArchive: (partner: Partner) => void;
}

export function PartnerTable({
  partners,
  loading = false,
  canUpdate,
  canArchive,
  onOpenWorkspace,
  onEdit,
  onArchive,
}: PartnerTableProps) {
  const columns = useMemo<DataTableColumn<Partner>[]>(
    () => [
      {
        id: "code",
        header: "Partner ID",
        cell: (row) => (
          <span className="font-medium text-[#0F172A]">
            {row.partnerCode ?? "—"}
          </span>
        ),
      },
      {
        id: "company",
        header: "Company Name",
        cell: (row) => (
          <button
            type="button"
            className="text-left font-medium text-[#2563EB] hover:underline"
            onClick={() => onOpenWorkspace(row)}
          >
            {row.companyName}
          </button>
        ),
      },
      {
        id: "contact",
        header: "Contact Person",
        className: "text-[#64748B]",
        cell: (row) => row.contactName ?? "—",
      },
      {
        id: "specialization",
        header: "Specialization",
        className: "text-[#64748B]",
        cell: (row) => row.specialization ?? "—",
      },
      {
        id: "verification",
        header: "Verification Status",
        cell: (row) => (
          <PartnerVerificationBadge status={row.verificationStatus} />
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => <PartnerStatusBadge status={row.status} />,
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
                aria-label="Edit partner"
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
                aria-label="Archive partner"
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
      data={partners}
      getRowId={(row) => row.id}
      loading={loading}
      emptyTitle="No Partners Found"
      emptyDescription="Create a partner to allocate jobs and track submissions."
    />
  );
}
