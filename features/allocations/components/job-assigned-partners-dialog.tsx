"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  archiveAllocationAction,
  listJobPartnerAllocationsAction,
} from "@/features/allocations/actions/allocations.actions";
import type { Allocation } from "@/features/allocations/types";
import type { Job } from "@/features/jobs/types";
import { signalLiveDataChange } from "@/lib/live-sync";

interface JobAssignedPartnersDialogProps {
  open: boolean;
  job: Job | null;
  canUnassign: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}

/**
 * View talent partners allocated to a job; Admin/SA/AM can unassign.
 * Unassign removes Jobs.Partners link so the job leaves the partner queue immediately.
 */
export function JobAssignedPartnersDialog({
  open,
  job,
  canUnassign,
  onOpenChange,
  onCompleted,
}: JobAssignedPartnersDialogProps) {
  const [rows, setRows] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !job) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    void listJobPartnerAllocationsAction(job.id).then((result) => {
      if (cancelled) {
        return;
      }
      setLoading(false);
      if (!result.success) {
        toast.error(result.message);
        setRows([]);
        return;
      }
      setRows((result.data as Allocation[]) ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [open, job]);

  const jobLabel = job
    ? job.jobCode
      ? `${job.jobCode} — ${job.title}`
      : job.title
    : "Job";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assigned Talent Partners</DialogTitle>
          <DialogDescription>
            Partners allocated to {jobLabel}. Unassigning removes this job from
            that partner&apos;s Assigned Jobs immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[360px] space-y-2 overflow-y-auto py-2">
          {loading ? (
            <p className="text-sm text-[#64748B]">Loading partners…</p>
          ) : rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#CBD5E1] px-4 py-6 text-center text-sm text-[#64748B]">
              No talent partners assigned to this job yet.
            </p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#0F172A]">
                    {row.partnerName ?? row.partnerCode ?? "Talent Partner"}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {[row.partnerCode, row.allocationCode]
                      .filter(Boolean)
                      .join(" · ") || row.status}
                  </p>
                </div>
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
                        setRows((prev) =>
                          prev.filter((item) => item.id !== row.id),
                        );
                        signalLiveDataChange();
                        onCompleted?.();
                      });
                    }}
                  >
                    Unassign
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
