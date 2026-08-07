"use client";

import type { ReactNode } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  align?: "left" | "right" | "center";
  /** Pin column while the table scrolls horizontally. */
  sticky?: "left" | "right";
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  className?: string;
  onRowClick?: (row: T) => void;
}

function alignClass(align?: "left" | "right" | "center") {
  if (align === "right") {
    return "text-right";
  }
  if (align === "center") {
    return "text-center";
  }
  return "text-left";
}

function stickyClass(sticky?: "left" | "right", isHeader = false) {
  if (!sticky) {
    return undefined;
  }
  return cn(
    "sticky z-20",
    sticky === "left" ? "left-0" : "right-0",
    isHeader
      ? "bg-muted/95 backdrop-blur"
      : "bg-card group-hover:bg-muted/50 shadow-[inset_1px_0_0_0_hsl(var(--border))]",
    sticky === "right" &&
      (isHeader
        ? "shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.35)]"
        : "shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.25)]"),
    sticky === "left" &&
      (isHeader
        ? "shadow-[8px_0_12px_-12px_rgba(15,23,42,0.35)]"
        : "shadow-[8px_0_12px_-12px_rgba(15,23,42,0.25)]"),
  );
}

/**
 * Shared data table for all business modules.
 * Modules supply column definitions — no module-specific markup here.
 */
export function DataTable<T>({
  columns,
  data,
  getRowId,
  loading = false,
  emptyTitle = "No results found",
  emptyDescription,
  emptyAction,
  className,
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return <LoadingSkeleton rows={6} />;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-30 border-b border-border bg-muted/70 text-xs font-medium uppercase tracking-wide text-muted-foreground backdrop-blur">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={cn(
                    "px-4 py-3",
                    alignClass(column.align),
                    stickyClass(column.sticky, true),
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={getRowId(row)}
                className={cn(
                  "group border-t border-border transition-colors hover:bg-muted/50",
                  onRowClick && "cursor-pointer",
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn(
                      "px-4 py-3 text-foreground",
                      alignClass(column.align),
                      stickyClass(column.sticky, false),
                      column.className,
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
