"use client";

import { Eye, Pencil, Archive, UserPlus, UserCog, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Job } from "@/features/jobs/types";

interface JobActionsProps {
  job: Job;
  canManage: boolean;
  canAllocate?: boolean;
  canViewPartners?: boolean;
  onView: (job: Job) => void;
  onEdit: (job: Job) => void;
  onArchive: (job: Job) => void;
  onAllocate?: (job: Job) => void;
  onAssignAm?: (job: Job) => void;
  onViewPartners?: (job: Job) => void;
}

export function JobActions({
  job,
  canManage,
  canAllocate = false,
  canViewPartners = false,
  onView,
  onEdit,
  onArchive,
  onAllocate,
  onAssignAm,
  onViewPartners,
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
      {canViewPartners && onViewPartners ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onViewPartners(job)}
          aria-label="Assigned talent partners"
          className="gap-1 px-2"
        >
          <Users className="h-4 w-4" />
          <span className="hidden xl:inline">Partners</span>
        </Button>
      ) : null}
      {canManage && job.status !== "archived" && onAssignAm ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onAssignAm(job)}
          aria-label="Assign account manager"
          className="gap-1 px-2"
        >
          <UserCog className="h-4 w-4" />
          <span className="hidden xl:inline">Assign AM</span>
        </Button>
      ) : null}
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
