"use client";

import { useMemo } from "react";

import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { AllocationActions } from "@/features/allocations/components/allocation-actions";
import { AllocationStatusBadge } from "@/features/allocations/components/allocation-status-badge";
import type { Allocation } from "@/features/allocations/types";
import { formatDate } from "@/lib/utils";

interface AllocationTableProps {
  allocations: Allocation[];
  loading?: boolean;
  canManage: boolean;
  canArchive: boolean;
  /** When set, further restricts which rows show Unassign. */
  canArchiveRow?: (row: Allocation) => boolean;
  onView: (allocation: Allocation) => void;
  onEdit: (allocation: Allocation) => void;
  onArchive: (allocation: Allocation) => void;
}

export function AllocationTable({
  allocations,
  loading = false,
  canManage,
  canArchive,
  canArchiveRow,
  onView,
  onEdit,
  onArchive,
}: AllocationTableProps) {
  const columns = useMemo<DataTableColumn<Allocation>[]>(
    () => [
      {
        id: "code",
        header: "Allocation",
        cell: (row) => (
          <span className="font-medium text-[#0F172A]">
            {row.allocationCode?.trim() ||
              [row.jobCode, row.partnerCode].filter(Boolean).join("-") ||
              "—"}
          </span>
        ),
      },
      {
        id: "job",
        header: "Job",
        cell: (row) => (
          <div>
            <p className="text-[#0F172A]">{row.jobTitle ?? "—"}</p>
            <p className="text-xs text-[#64748B]">{row.jobCode ?? ""}</p>
          </div>
        ),
      },
      {
        id: "partner",
        header: "Talent Partner",
        className: "text-[#64748B]",
        cell: (row) => {
          const code = row.partnerCode?.trim();
          const name = row.partnerName?.trim();
          if (code && name && name !== code) {
            return (
              <div>
                <p className="text-[#0F172A]">{code}</p>
                <p className="text-xs text-[#64748B]">{name}</p>
              </div>
            );
          }
          if (code) {
            return <span className="font-medium text-[#0F172A]">{code}</span>;
          }
          if (name) {
            return name;
          }
          // Last resort — show short record id so multi-partner rows stay distinct.
          const shortId = row.partnerId?.slice(-6) || "—";
          return <span className="font-mono text-xs text-[#64748B]">{shortId}</span>;
        },
      },
      {
        id: "submitted",
        header: "Submitted",
        className: "text-[#64748B]",
        cell: (row) => row.profilesSubmitted,
      },
      {
        id: "status",
        header: "On job",
        cell: (row) => <AllocationStatusBadge status={row.status} />,
      },
      {
        id: "assignedDate",
        header: "Since",
        className: "text-[#64748B]",
        cell: (row) =>
          row.assignedDate ? formatDate(row.assignedDate) : "—",
      },
      {
        id: "actions",
        header: "Actions",
        align: "right",
        sticky: "right",
        className: "whitespace-nowrap",
        headerClassName: "whitespace-nowrap",
        cell: (row) => (
          <AllocationActions
            allocation={row}
            canManage={canManage}
            canArchive={
              canArchive && (canArchiveRow ? canArchiveRow(row) : true)
            }
            onView={onView}
            onEdit={onEdit}
            onArchive={onArchive}
          />
        ),
      },
    ],
    [canArchive, canArchiveRow, canManage, onArchive, onEdit, onView],
  );

  return (
    <DataTable
      columns={columns}
      data={allocations}
      getRowId={(row) => row.id}
      loading={loading}
      emptyTitle="No Allocations Found"
      emptyDescription="Allocate a talent partner from a Job row action. Account Managers create allocations; Admin can view only."
    />
  );
}
