"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  approveJobClaimAction,
  rejectJobClaimAction,
} from "@/features/job-claims/actions/job-claims.actions";
import type { JobClaimReviewItem } from "@/features/job-claims/types";
import { formatDateTime } from "@/lib/utils";

interface JobClaimsReviewPageClientProps {
  items: JobClaimReviewItem[];
  title?: string;
  description?: string;
}

function statusBadge(status: string) {
  if (status === "pending") {
    return <Badge variant="secondary">Pending</Badge>;
  }
  if (status === "approved") {
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Approved</Badge>;
  }
  return <Badge variant="outline">Rejected</Badge>;
}

export function JobClaimsReviewPageClient({
  items: initialItems,
  title = "Job Claims",
  description = "Review Partner requests to work on jobs. Approve to create an allocation.",
}: JobClaimsReviewPageClientProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const visible = useMemo(() => {
    if (filter === "pending") {
      return items.filter((item) => item.claim.status === "pending");
    }
    return items;
  }, [filter, items]);

  async function approve(claimId: string) {
    setBusyId(claimId);
    try {
      const result = await approveJobClaimAction(claimId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Claim approved — partner allocation created");
      setItems((current) =>
        current.map((item) =>
          item.claim.id === claimId
            ? { ...item, claim: result.data.claim }
            : item,
        ),
      );
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function reject(claimId: string) {
    const reason =
      typeof window !== "undefined"
        ? window.prompt("Optional rejection reason")
        : null;
    setBusyId(claimId);
    try {
      const result = await rejectJobClaimAction(
        claimId,
        reason?.trim() || undefined,
      );
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Claim rejected");
      setItems((current) =>
        current.map((item) =>
          item.claim.id === claimId ? { ...item, claim: result.data } : item,
        ),
      );
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${title} (${visible.length})`}
        description={description}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={filter === "pending" ? "default" : "outline"}
          onClick={() => setFilter("pending")}
        >
          Pending
        </Button>
        <Button
          type="button"
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All
        </Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={filter === "pending" ? "No pending claims" : "No job claims"}
          description="When Talent Partners claim open jobs, requests appear here for review."
          icon={<ClipboardList className="h-5 w-5" />}
        />
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <article
              key={item.claim.id}
              className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <h3 className="text-base font-semibold text-[#0F172A]">
                    {item.partnerName || item.partnerCode}
                  </h3>
                  <p className="text-sm text-[#64748B]">
                    {[item.partnerCode, item.specialization]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {statusBadge(item.claim.status)}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#94A3B8]">
                    Job
                  </p>
                  <p className="mt-0.5 text-sm text-[#0F172A]">
                    {item.jobCode ? `${item.jobCode} — ${item.jobTitle}` : item.jobTitle}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#94A3B8]">
                    Requested
                  </p>
                  <p className="mt-0.5 text-sm text-[#0F172A]">
                    {formatDateTime(item.claim.requestedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#94A3B8]">
                    Experience / Skills
                  </p>
                  <p className="mt-0.5 text-sm text-[#0F172A]">
                    {[item.experience, item.skills].filter(Boolean).join(" · ") ||
                      "—"}
                  </p>
                </div>
              </div>

              {item.claim.status === "pending" ? (
                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[#F1F5F9] pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busyId === item.claim.id}
                    onClick={() => void reject(item.claim.id)}
                  >
                    Reject
                  </Button>
                  <Button
                    type="button"
                    disabled={busyId === item.claim.id}
                    onClick={() => void approve(item.claim.id)}
                  >
                    {busyId === item.claim.id ? "Working…" : "Approve"}
                  </Button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
