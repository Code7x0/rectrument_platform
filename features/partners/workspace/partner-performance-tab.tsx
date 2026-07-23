import { WorkspaceMetricCard } from "@/features/shared/workspace";
import type { PartnerPerformanceStats } from "@/features/partners/types";

interface PartnerPerformanceTabProps {
  stats: PartnerPerformanceStats;
}

/**
 * Calculated metrics only — never stored on Partner.
 */
export function PartnerPerformanceTab({ stats }: PartnerPerformanceTabProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <WorkspaceMetricCard label="Active Jobs" value={stats.activeJobs} />
      <WorkspaceMetricCard
        label="Profiles Submitted"
        value={stats.profilesSubmitted}
      />
      <WorkspaceMetricCard label="Interviews" value={stats.interviews} />
      <WorkspaceMetricCard label="Offers" value={stats.offers} />
      <WorkspaceMetricCard
        label="Joined Candidates"
        value={stats.joinedCandidates}
      />
    </div>
  );
}
