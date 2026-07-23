"use client";

import { Eye, Pencil, Archive } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Allocation } from "@/features/allocations/types";

interface AllocationActionsProps {
  allocation: Allocation;
  canManage: boolean;
  canArchive: boolean;
  onView: (allocation: Allocation) => void;
  onEdit: (allocation: Allocation) => void;
  onArchive: (allocation: Allocation) => void;
}

export function AllocationActions({
  allocation,
  canManage,
  canArchive,
  onView,
  onEdit,
  onArchive,
}: AllocationActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => onView(allocation)}
        aria-label="View allocation"
      >
        <Eye className="h-4 w-4" />
      </Button>
      {canManage && allocation.status !== "archived" ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => onEdit(allocation)}
          aria-label="Edit allocation"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ) : null}
      {canArchive && allocation.status !== "archived" ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => onArchive(allocation)}
          aria-label="Unassign partner"
        >
          <Archive className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
