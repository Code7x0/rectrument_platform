"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Clock3 } from "lucide-react";
import { toast } from "sonner";

import { DetailDrawer } from "@/components/shared/detail-drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { claimJobAction } from "@/features/job-claims/actions/job-claims.actions";
import {
  AvailableJobCard,
  AvailableJobDetailBody,
} from "@/features/job-claims/components/available-job-card";
import type { PartnerAvailableJob } from "@/features/job-claims/types";

interface PartnerAvailableJobsPageClientProps {
  jobs: PartnerAvailableJob[];
}

export function PartnerAvailableJobsPageClient({
  jobs: initialJobs,
}: PartnerAvailableJobsPageClientProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [selected, setSelected] = useState<PartnerAvailableJob | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  const pendingJobs = jobs.filter((job) => job.claimState === "pending");
  const openJobs = jobs.filter((job) => job.claimState !== "pending");

  async function handleClaim(job: PartnerAvailableJob) {
    if (claimingId) {
      return;
    }
    setClaimingId(job.id);
    try {
      const result = await claimJobAction(job.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Claim request submitted", {
        description:
          "Status is Claim Pending until an Account Manager reviews it.",
      });
      setJobs((current) =>
        current.map((row) =>
          row.id === job.id
            ? {
                ...row,
                claimState: "pending",
                claimId: result.data.id,
                claimRequestedAt: result.data.requestedAt,
                claimRejectionReason: null,
              }
            : row,
        ),
      );
      setSelected((current) =>
        current?.id === job.id
          ? {
              ...current,
              claimState: "pending",
              claimId: result.data.id,
              claimRequestedAt: result.data.requestedAt,
              claimRejectionReason: null,
            }
          : current,
      );
      router.refresh();
    } finally {
      setClaimingId(null);
    }
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        title="No available jobs right now"
        description="When open roles are ready to claim, they appear here. Your authorized work stays under Assigned Jobs."
        icon={<Briefcase className="h-5 w-5" />}
      />
    );
  }

  return (
    <>
      <div className="space-y-8">
        {pendingJobs.length > 0 ? (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-[#C2410C]" />
              <div>
                <h2 className="text-sm font-semibold text-[#0F172A]">
                  Claims pending approval
                </h2>
                <p className="text-xs text-[#64748B]">
                  Waiting for Account Manager / Admin review. These stay
                  highlighted until approved or rejected.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {pendingJobs.map((job) => (
                <AvailableJobCard
                  key={job.id}
                  job={job}
                  claiming={claimingId === job.id}
                  onView={setSelected}
                  onClaim={handleClaim}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          {pendingJobs.length > 0 ? (
            <div>
              <h2 className="text-sm font-semibold text-[#0F172A]">
                Open jobs to claim
              </h2>
              <p className="text-xs text-[#64748B]">
                Request access here. Approved jobs move to Assigned Jobs.
              </p>
            </div>
          ) : null}
          {openJobs.length === 0 ? (
            <EmptyState
              title="No other open jobs"
              description="Your pending claim requests are listed above."
              icon={<Briefcase className="h-5 w-5" />}
            />
          ) : (
            <div className="space-y-4">
              {openJobs.map((job) => (
                <AvailableJobCard
                  key={job.id}
                  job={job}
                  claiming={claimingId === job.id}
                  onView={setSelected}
                  onClaim={handleClaim}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
          }
        }}
        title={selected?.title ?? "Job details"}
        stickyFooter={
          selected ? (
            selected.claimState === "available" ||
            selected.claimState === "rejected" ? (
              <Button
                type="button"
                className="w-full"
                disabled={claimingId === selected.id}
                aria-busy={claimingId === selected.id}
                onClick={() => void handleClaim(selected)}
              >
                {claimingId === selected.id ? "Submitting…" : "Claim Job"}
              </Button>
            ) : (
              <Button
                type="button"
                className="w-full"
                variant="secondary"
                disabled
              >
                {selected.claimState === "pending"
                  ? "Claim Pending"
                  : "Assigned"}
              </Button>
            )
          ) : null
        }
      >
        {selected ? (
          <AvailableJobDetailBody
            job={selected}
            claiming={claimingId === selected.id}
            onClaim={handleClaim}
            hideInlineClaim
          />
        ) : null}
      </DetailDrawer>
    </>
  );
}
