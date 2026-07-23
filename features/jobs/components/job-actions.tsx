"use client";

import { Eye, Pencil, Archive, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Job } from "@/features/jobs/types";

interface JobActionsProps {
  job: Job;
  canManage: boolean;
  canAllocate?: boolean;
  onView: (job: Job) => void;
  onEdit: (job: Job) => void;
  onArchive: (job: Job) => void;
  onAllocate?: (job: Job) => void;
}

export function JobActions({
  job,
  canManage,
  canAllocate = false,
  onView,
  onEdit,
  onArchive,
  onAllocate,
}: JobActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => onView(job)}
        aria-label="View job"
      >
        <Eye className="h-4 w-4" />
      </Button>
      {canAllocate && job.status !== "archived" && onAllocate ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onAllocate(job)}
          aria-label="Allocate talent partner"
          className="gap-1 px-2"
        >
          <UserPlus className="h-4 w-4" />
          <span className="hidden xl:inline">Allocate</span>
        </Button>
      ) : null}
      {canManage ? (
        <>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => onEdit(job)}
            aria-label="Edit job"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {job.status !== "archived" ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onArchive(job)}
              aria-label="Archive job"
            >
              <Archive className="h-4 w-4" />
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
