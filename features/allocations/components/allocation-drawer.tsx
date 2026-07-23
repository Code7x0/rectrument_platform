"use client";

import { DetailDrawer } from "@/components/shared/detail-drawer";
import { EntityActivityInline } from "@/features/activity/components/entity-activity-inline";
import { AllocationStatusBadge } from "@/features/allocations/components/allocation-status-badge";
import type { Allocation } from "@/features/allocations/types";
import { formatDate } from "@/lib/utils";

interface AllocationDrawerProps {
  allocation: Allocation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
        {label}
      </p>
      <p className="mt-1 text-sm text-[#0F172A]">{value || "—"}</p>
    </div>
  );
}

export function AllocationDrawer({
  allocation,
  open,
  onOpenChange,
}: AllocationDrawerProps) {
  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={
        allocation
          ? `${allocation.allocationCode ?? "Allocation"}`
          : "Allocation details"
      }
    >
      {allocation ? (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <AllocationStatusBadge status={allocation.status} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Detail label="Job ID" value={allocation.jobCode} />
            <Detail label="Job Title" value={allocation.jobTitle} />
            <Detail
              label="Talent Partner"
              value={allocation.partnerName ?? allocation.partnerCode}
            />
            <Detail
              label="Assigned Date"
              value={
                allocation.assignedDate
                  ? formatDate(allocation.assignedDate)
                  : null
              }
            />
            <Detail
              label="Expected Profiles"
              value={allocation.expectedProfiles}
            />
            <Detail
              label="Profiles Submitted"
              value={allocation.profilesSubmitted}
            />
          </div>

          <Detail label="Notes" value={allocation.notes} />

          <div className="border-t border-[#E2E8F0] pt-5">
            <EntityActivityInline
              entityRef={{ kind: "allocation", id: allocation.id }}
              title="Allocation activity"
            />
          </div>
        </div>
      ) : null}
    </DetailDrawer>
  );
}
