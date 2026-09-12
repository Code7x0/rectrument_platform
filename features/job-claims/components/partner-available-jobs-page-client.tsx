"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Clock3 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  const sortJobs = (rows: PartnerAvailableJob[]) =>
    [...rows].sort((a, b) => compareJobsByPriorityThenOpenDate(a, b));

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filterJobs = (rows: PartnerAvailableJob[]) => {
    let next = rows;
    if (priorityFilter !== "all") {
      next = next.filter((job) => job.priority === priorityFilter);
    }
    if (!normalizedSearch) {
      return next;
    }
    return next.filter((job) => {
      const haystack = [
        job.title,
        job.jobCode,
        job.location,
        job.experience,
        job.workMode,
        job.salary,
        job.description,
        job.interviewProcess,
        job.skills.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  };

  const activeJobs = useMemo(
    () =>
      sortJobs(
        filterJobs(
          jobs.filter(
            (job) =>
              job.claimState === "pending" || job.claimState === "available",
          ),
        ),
      ),
    [jobs, priorityFilter, normalizedSearch],
  );
  const rejectedJobs = useMemo(
    () =>
      sortJobs(
        filterJobs(
          jobs.filter(
            (job) => job.claimState === "rejected" || job.claimState === "cooling",
          ),
        ),
      ),
    [jobs, priorityFilter, normalizedSearch],
  );

  const visibleCount = activeJobs.length + rejectedJobs.length;
  const filtersActive =
    priorityFilter !== "all" || normalizedSearch.length > 0;
  const headerTitle =
    !filtersActive || visibleCount === jobs.length
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
      <div className="mb-6 space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-1.5">
            <Label htmlFor="partner-available-search">
              Search roles (skills, title, tech)
            </Label>
            <Input
              id="partner-available-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="e.g. .NET, Java, React, Bangalore"
            />
          </div>
          <PartnerJobPriorityFilter
            value={priorityFilter}
            onChange={setPriorityFilter}
            id="partner-available-priority-filter"
            className="space-y-1.5"
          />
        </div>
        <p className="text-sm text-[#64748B]">
          {!filtersActive
            ? `Showing all ${jobs.length} open roles sorted by priority (Super High first), then newest posted date.`
            : `Showing ${visibleCount} of ${jobs.length} roles matching your filters.`}
        </p>
      </div>

      {visibleCount === 0 && filtersActive ? (
        <EmptyState
          title="No roles match your search"
          description="Try a different skill, technology, or location. Clear filters to see all open roles again."
          icon={<Briefcase className="h-5 w-5" />}
        />
      ) : null}

      <div className="space-y-8">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-[#C2410C]" />
            <div>
              <h2 className="text-sm font-semibold text-[#0F172A]">
                Available roles ({activeJobs.length})
              </h2>
              <p className="text-xs text-[#64748B]">
                Sorted by priority, then newest date. Pending claims stay in
                this list until approved.
              </p>
            </div>
          </div>
          {activeJobs.length === 0 ? (
            <EmptyState
              title="No open jobs to claim"
              description="Check rejected claims below, or your Assigned Jobs."
              icon={<Briefcase className="h-5 w-5" />}
            />
          ) : (
            <div className="space-y-4">
              {activeJobs.map((job) => (
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
