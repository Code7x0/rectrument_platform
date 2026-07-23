"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ArchiveDialog } from "@/components/shared/archive-dialog";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { archiveAllocationAction } from "@/features/allocations/actions/allocations.actions";
import { AllocationDialog } from "@/features/allocations/components/allocation-dialog";
import { AllocationDrawer } from "@/features/allocations/components/allocation-drawer";
import { AllocationFilters } from "@/features/allocations/components/allocation-filters";
import { AllocationTable } from "@/features/allocations/components/allocation-table";
import type {
  Allocation,
  AllocationListFilters,
} from "@/features/allocations/types";
import type { LookupOption } from "@/services/lookups";

interface AllocationsPageClientProps {
  initialAllocations: Allocation[];
  partners: LookupOption[];
  canManage: boolean;
  canArchive: boolean;
  breadcrumbs: Array<{ label: string; href?: string }>;
}

function applyClientFilters(
  rows: Allocation[],
  filters: AllocationListFilters,
): Allocation[] {
  return rows.filter((row) => {
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      const matches =
        (row.allocationCode?.toLowerCase().includes(q) ?? false) ||
        (row.jobTitle?.toLowerCase().includes(q) ?? false) ||
        (row.jobCode?.toLowerCase().includes(q) ?? false) ||
        (row.partnerName?.toLowerCase().includes(q) ?? false) ||
        (row.partnerCode?.toLowerCase().includes(q) ?? false);
      if (!matches) {
        return false;
      }
    }

    if (
      filters.status &&
      filters.status !== "all" &&
      row.status !== filters.status
    ) {
      return false;
    }

    if (
      filters.partnerId &&
      filters.partnerId !== "all" &&
      row.partnerId !== filters.partnerId
    ) {
      return false;
    }

    if (!filters.includeArchived && filters.status !== "archived") {
      if (row.status === "archived") {
        return false;
      }
    }

    return true;
  });
}

export function AllocationsPageClient({
  initialAllocations,
  partners,
  canManage,
  canArchive,
  breadcrumbs,
}: AllocationsPageClientProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<AllocationListFilters>({
    status: "all",
    partnerId: "all",
  });
  const [viewTarget, setViewTarget] = useState<Allocation | null>(null);
  const [editTarget, setEditTarget] = useState<Allocation | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Allocation | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () => applyClientFilters(initialAllocations, filters),
    [initialAllocations, filters],
  );

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
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

  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader
        title="Allocations"
        description="Inspect talent partner allocations. Account Managers allocate from Jobs; Admin has view-only access."
      />

      <AllocationFilters
        filters={filters}
        partners={partners}
        onChange={setFilters}
      />

      <AllocationTable
        allocations={filtered}
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
            ? `${archiveTarget.allocationCode ?? "Allocation"} (${archiveTarget.partnerName ?? archiveTarget.partnerCode ?? "talent partner"})`
            : "this allocation"
        }
        entityLabel="allocation"
        loading={archiving}
        onConfirm={confirmArchive}
      />
    </ContentContainer>
  );
}
