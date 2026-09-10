"use client";

import { Fragment, type ReactNode } from "react";

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
  /** Horizontal offset for stacked left-sticky columns (e.g. "2.5rem"). */
  stickyOffset?: string;
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
  /** Max height for the scroll body — keeps the header visible while scrolling down. */
  maxBodyHeight?: string;
  isSubRowExpanded?: (row: T) => boolean;
  renderSubRow?: (row: T) => ReactNode;
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

function stickyStyle(
  sticky?: "left" | "right",
  stickyOffset?: string,
): { left?: string; right?: string } | undefined {
  if (!sticky) {
    return undefined;
  }
  if (sticky === "left") {
    return { left: stickyOffset ?? "0" };
  }
  return { right: stickyOffset ?? "0" };
}

function stickyClass(sticky?: "left" | "right", isHeader = false) {
  if (!sticky) {
    return undefined;
  }
  return cn(
    "sticky z-20",
    // Opaque backgrounds only — translucent hover lets scrolled cells bleed
    // through sticky Actions (salary text / “strange shadow”).
    isHeader
      ? "bg-muted"
      : "bg-card group-hover:bg-[color-mix(in_srgb,var(--muted)_50%,var(--card))]",
    // Hard edge separator instead of soft drop-shadow blur.
    sticky === "right" && "border-l border-border",
    sticky === "left" && "border-r border-border",
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
  maxBodyHeight,
  isSubRowExpanded,
  renderSubRow,
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
      <div
        className={cn(
          "overflow-x-auto",
          maxBodyHeight && "overflow-y-auto",
        )}
        style={maxBodyHeight ? { maxHeight: maxBodyHeight } : undefined}
      >
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
                  style={stickyStyle(column.sticky, column.stickyOffset)}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const rowId = getRowId(row);
              const expanded =
                Boolean(renderSubRow && isSubRowExpanded?.(row));
              return (
                <Fragment key={rowId}>
                  <tr
                    className={cn(
                      "group border-t border-border transition-colors hover:bg-muted/50",
                      onRowClick && "cursor-pointer",
                      expanded && "bg-muted/30",
                    )}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={cn(
                          "px-4 py-3 align-middle text-foreground",
                          alignClass(column.align),
                          stickyClass(column.sticky, false),
                          column.className,
                        )}
                        style={stickyStyle(column.sticky, column.stickyOffset)}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                  {expanded ? (
                    <tr key={`${rowId}-details`} className="border-t border-border">
                      <td colSpan={columns.length} className="p-0">
                        {renderSubRow?.(row)}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
