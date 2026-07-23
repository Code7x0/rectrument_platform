"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ArchiveDialog } from "@/components/shared/archive-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { archiveAllocationAction } from "@/features/allocations/actions/allocations.actions";
import { AllocationDialog } from "@/features/allocations/components/allocation-dialog";
import { AllocationDrawer } from "@/features/allocations/components/allocation-drawer";
import { AllocationTable } from "@/features/allocations/components/allocation-table";
import type { Allocation } from "@/features/allocations/types";

interface PartnerAssignedJobsTabProps {
  allocations: Allocation[];
  canManage: boolean;
  canArchive: boolean;
}

/**
 * Reuses Allocations feature components — filtered by partner upstream.
 */
export function PartnerAssignedJobsTab({
  allocations,
  canManage,
  canArchive,
}: PartnerAssignedJobsTabProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [viewTarget, setViewTarget] = useState<Allocation | null>(null);
  const [editTarget, setEditTarget] = useState<Allocation | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Allocation | null>(null);
  const [archiving, setArchiving] = useState(false);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function confirmArchive() {
    if (!archiveTarget) {
      return;
    }
    setArchiving(true);
    try {
      const result = await archiveAllocationAction(archiveTarget.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Allocation archived");
      setArchiveTarget(null);
      refresh();
    } finally {
      setArchiving(false);
    }
  }

  if (allocations.length === 0) {
    return (
      <EmptyState
        title="No assigned jobs"
        description="Allocations for this partner will appear here when jobs are assigned."
      />
    );
  }

  return (
    <>
      <AllocationTable
        allocations={allocations}
        loading={pending}
        canManage={canManage}
        canArchive={canArchive}
        onView={setViewTarget}
        onEdit={setEditTarget}
        onArchive={setArchiveTarget}
      />

      <AllocationDrawer
        allocation={viewTarget}
        open={Boolean(viewTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setViewTarget(null);
          }
        }}
      />

      <AllocationDialog
        open={Boolean(editTarget)}
        allocation={editTarget}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
          }
        }}
        onCompleted={refresh}
      />

      <ArchiveDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveTarget(null);
          }
        }}
        entityName={
          archiveTarget
            ? `${archiveTarget.allocationCode ?? "Allocation"} (${archiveTarget.jobTitle ?? "job"})`
            : "this allocation"
        }
        entityLabel="allocation"
        loading={archiving}
        onConfirm={confirmArchive}
      />
    </>
  );
}
