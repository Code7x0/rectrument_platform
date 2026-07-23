"use client";

import { Users } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import {
  ALLOCATION_STATUS_LABELS,
  type Allocation,
} from "@/features/allocations/types";
import { formatDate } from "@/lib/utils";

interface ClientPartnersTabProps {
  allocations: Allocation[];
}

export function ClientPartnersTab({ allocations }: ClientPartnersTabProps) {
  if (allocations.length === 0) {
    return (
      <EmptyState
        title="No talent partners allocated"
        description="Allocate partners from a job to see them here."
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
            <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-medium text-[#334155]">
              {ALLOCATION_STATUS_LABELS[row.status]}
            </span>
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
