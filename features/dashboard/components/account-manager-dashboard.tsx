import { ContentContainer } from "@/components/shared/content-container";
import { DashboardGrid } from "@/features/dashboard/components/dashboard-card";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DashboardList } from "@/features/dashboard/components/dashboard-list";
import { DashboardMetricCard } from "@/features/dashboard/components/dashboard-metric-card";
import { DashboardQuickActionGrid } from "@/features/dashboard/components/dashboard-quick-action";
import { DashboardRecentActivity } from "@/features/dashboard/components/dashboard-recent-activity";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import type { AccountManagerDashboardData } from "@/features/dashboard/types";

interface AccountManagerDashboardProps {
  data: AccountManagerDashboardData;
}

export function AccountManagerDashboard({
  data,
}: AccountManagerDashboardProps) {
  return (
    <ContentContainer>
      <div className="space-y-8">
        <DashboardHeader
          title="Today’s work"
          description="What should I work on today? Reviews, allocations, and pipeline movement."
          breadcrumbs={[
            { label: "Account Manager" },
            { label: "Dashboard" },
          ]}
        />

        <DashboardSection title="Needs attention">
          <DashboardGrid columns={4}>
            {data.metrics.map((metric) => (
              <DashboardMetricCard key={metric.id} {...metric} />
            ))}
          </DashboardGrid>
        </DashboardSection>

        <DashboardSection title="Recruitment pipeline">
          <DashboardGrid columns={3}>
            {data.pipeline.map((metric) => (
              <DashboardMetricCard key={metric.id} {...metric} />
            ))}
          </DashboardGrid>
        </DashboardSection>

        <DashboardSection title="Quick actions">
          <DashboardQuickActionGrid
            items={data.quickActions.map((item) => ({
              ...item,
              iconKey:
                item.id === "review-queue"
                  ? "review"
                  : item.id === "allocate"
                    ? "partners"
                    : item.id === "jobs"
                      ? "job"
                      : "client",
            }))}
          />
        </DashboardSection>

        <div className="grid gap-6 lg:grid-cols-2">
          <DashboardSection title="Candidates awaiting action">
            <DashboardList
              items={data.awaitingAction}
              emptyTitle="Inbox clear"
              emptyDescription="No candidates need your review right now."
              emptyActionHref="/account-manager/candidates"
              emptyActionLabel="Open review queue"
            />
          </DashboardSection>
          <DashboardSection title="Recent candidate activity">
            <DashboardList
              items={data.recentCandidateActivity}
              emptyTitle="No candidate activity"
              emptyDescription="Submissions on your jobs will appear here."
            />
          </DashboardSection>
          <DashboardSection title="Recent partner activity">
            <DashboardList
              items={data.recentPartnerActivity}
              emptyTitle="No partner allocations"
              emptyDescription="Allocate Talent Partners to your jobs to get started."
              emptyActionHref="/account-manager/allocations"
              emptyActionLabel="Allocate partner"
            />
          </DashboardSection>
          <DashboardSection title="Recent activity">
            <DashboardRecentActivity items={data.recentActivity} />
          </DashboardSection>
        </div>
      </div>
    </ContentContainer>
  );
}
