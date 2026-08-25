"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Clock3 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { claimJobAction } from "@/features/job-claims/actions/job-claims.actions";
import { AvailableJobCard } from "@/features/job-claims/components/available-job-card";
import type { PartnerAvailableJob } from "@/features/job-claims/types";

interface PartnerAvailableJobsPageClientProps {
  jobs: PartnerAvailableJob[];
}

export function PartnerAvailableJobsPageClient({
  jobs: initialJobs,
}: PartnerAvailableJobsPageClientProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  const pendingJobs = jobs.filter((job) => job.claimState === "pending");
  const rejectedJobs = jobs.filter(
    (job) => job.claimState === "rejected" || job.claimState === "cooling",
  );
  const openJobs = jobs.filter((job) => job.claimState === "available");

  async function handleClaim(job: PartnerAvailableJob) {
    if (claimingId) {
      return;
    }
    if (job.claimState === "cooling") {
      toast.error("You cannot reclaim this job yet.");
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
                claimReclaimAvailableAt: null,
              }
            : row,
        ),
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
                  Pending claims ({pendingJobs.length})
                </h2>
                <p className="text-xs text-[#64748B]">
                  Waiting for Account Manager / Admin review.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {pendingJobs.map((job) => (
                <AvailableJobCard
                  key={job.id}
                  job={job}
                  claiming={claimingId === job.id}
                  onClaim={handleClaim}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-[#0F172A]">
              Open jobs to claim ({openJobs.length})
            </h2>
            <p className="text-xs text-[#64748B]">
              Request access here. Approved jobs move to Assigned Jobs.
            </p>
          </div>
          {openJobs.length === 0 ? (
            <EmptyState
              title="No open jobs to claim"
              description="Check pending or rejected claims below, or your Assigned Jobs."
              icon={<Briefcase className="h-5 w-5" />}
            />
          ) : (
            <div className="space-y-4">
              {openJobs.map((job) => (
                <AvailableJobCard
                  key={job.id}
                  job={job}
                  claiming={claimingId === job.id}
                  onClaim={handleClaim}
                />
              ))}
            </div>
          )}
        </section>

        {rejectedJobs.length > 0 ? (
          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-[#0F172A]">
                Rejected claims ({rejectedJobs.length})
              </h2>
              <p className="text-xs text-[#64748B]">
                Historical rejections. Claim Again creates a new claim after the
                waiting period.
              </p>
            </div>
            <div className="space-y-4">
              {rejectedJobs.map((job) => (
                <AvailableJobCard
                  key={job.id}
                  job={job}
                  claiming={claimingId === job.id}
                  onClaim={handleClaim}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>

    </>
  );
}
