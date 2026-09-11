"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Clock3 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  PartnerJobPriorityFilter,
  type PartnerJobPriorityFilterValue,
} from "@/features/jobs/components/partner-job-priority-filter";
import { compareJobsByPriorityThenOpenDate } from "@/features/jobs/lib/job-priority-sort";
import { claimJobAction } from "@/features/job-claims/actions/job-claims.actions";
import { AvailableJobCard } from "@/features/job-claims/components/available-job-card";
import type { PartnerAvailableJob } from "@/features/job-claims/types";

interface PartnerAvailableJobsPageClientProps {
  jobs: PartnerAvailableJob[];
  showPageHeader?: boolean;
}

export function PartnerAvailableJobsPageClient({
  jobs: initialJobs,
  showPageHeader = false,
}: PartnerAvailableJobsPageClientProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] =
    useState<PartnerJobPriorityFilterValue>("all");

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  const sortJobs = (rows: PartnerAvailableJob[]) =>
    [...rows].sort((a, b) => compareJobsByPriorityThenOpenDate(a, b));

  const filterByPriority = (rows: PartnerAvailableJob[]) => {
    if (priorityFilter === "all") {
      return rows;
    }
    return rows.filter((job) => job.priority === priorityFilter);
  };

  const pendingJobs = useMemo(
    () => sortJobs(filterByPriority(jobs.filter((job) => job.claimState === "pending"))),
    [jobs, priorityFilter],
  );
  const rejectedJobs = useMemo(
    () =>
      sortJobs(
        filterByPriority(
          jobs.filter(
            (job) => job.claimState === "rejected" || job.claimState === "cooling",
          ),
        ),
      ),
    [jobs, priorityFilter],
  );
  const openJobs = useMemo(
    () =>
      sortJobs(filterByPriority(jobs.filter((job) => job.claimState === "available"))),
    [jobs, priorityFilter],
  );

  const visibleCount = pendingJobs.length + openJobs.length + rejectedJobs.length;
  const headerTitle =
    priorityFilter === "all" || visibleCount === jobs.length
      ? `Available Jobs (${jobs.length})`
      : `Available Jobs (${visibleCount} of ${jobs.length})`;

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
      {showPageHeader ? (
        <PageHeader
          title={headerTitle}
          description="Browse open jobs and request to work on them. Pending claims stay highlighted until approval, then move to Assigned Jobs. Client details unlock only after approval."
        />
      ) : null}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-[#64748B]">
          {priorityFilter === "all"
            ? `Showing all ${jobs.length} open roles sorted by priority, then posted date.`
            : `Showing ${visibleCount} of ${jobs.length} roles matching your priority filter.`}
        </p>
        <PartnerJobPriorityFilter
          value={priorityFilter}
          onChange={setPriorityFilter}
          id="partner-available-priority-filter"
          className="w-full max-w-xs space-y-1.5"
        />
      </div>

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
