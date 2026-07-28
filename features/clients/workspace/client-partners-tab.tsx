"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { archiveAllocationAction } from "@/features/allocations/actions/allocations.actions";
import {
  ALLOCATION_STATUS_LABELS,
  type Allocation,
} from "@/features/allocations/types";
import { formatDate } from "@/lib/utils";

interface ClientPartnersTabProps {
  allocations: Allocation[];
  canUnassign?: boolean;
}

export function ClientPartnersTab({
  allocations,
  canUnassign = false,
}: ClientPartnersTabProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (allocations.length === 0) {
    return (
      <EmptyState
        title="No talent partners allocated"
        description="Open the Jobs tab and use Allocate / Partners on a job."
        icon={<Users className="h-5 w-5" />}
      />
    );
  }

  return (
    <div className="space-y-3">
      {allocations.map((row) => (
        <article
          key={row.id}
          className="rounded-2xl border border-[#E2E8F0] bg-white p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-[#0F172A]">
                {row.partnerName ?? "Talent Partner"}
              </h3>
              <p className="text-sm text-[#64748B]">
                {row.jobTitle ?? "Job"}
                {row.allocationCode ? ` · ${row.allocationCode}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-medium text-[#334155]">
                {ALLOCATION_STATUS_LABELS[row.status]}
              </span>
              {canUnassign ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending && pendingId === row.id}
                  onClick={() => {
                    setPendingId(row.id);
                    startTransition(async () => {
                      const result = await archiveAllocationAction(row.id);
                      setPendingId(null);
                      if (!result.success) {
                        toast.error(result.message);
                        return;
                      }
                      toast.success("Partner unassigned from job");
                      router.refresh();
                    });
                  }}
                >
                  Unassign
                </Button>
              ) : null}
            </div>
          </div>
          <p className="mt-3 text-xs text-[#94A3B8]">
            Assigned{" "}
            {row.assignedDate ? formatDate(row.assignedDate) : "—"}
            {typeof row.profilesSubmitted === "number"
              ? ` · ${row.profilesSubmitted}/${row.expectedProfiles} profiles`
              : null}
          </p>
        </article>
      ))}
    </div>
  );
}
