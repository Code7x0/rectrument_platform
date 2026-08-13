import { ContentContainer } from "@/components/shared/content-container";
import { DashboardGrid } from "@/features/dashboard/components/dashboard-card";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DashboardList } from "@/features/dashboard/components/dashboard-list";
import { DashboardMetricCard } from "@/features/dashboard/components/dashboard-metric-card";
import { DashboardQuickActionGrid } from "@/features/dashboard/components/dashboard-quick-action";
import { DashboardRecentActivity } from "@/features/dashboard/components/dashboard-recent-activity";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import type { PartnerDashboardData } from "@/features/dashboard/types";

interface PartnerDashboardProps {
  data: PartnerDashboardData;
}

export function PartnerDashboard({ data }: PartnerDashboardProps) {
  const topPipeline = data.metrics.slice(0, 4);
  const bottomPipeline = data.metrics.slice(4, 7);

  return (
    <ContentContainer>
      <div className="space-y-8">
        <DashboardHeader
          title={`Welcome back${data.partnerName ? `, ${data.partnerName.split(" ")[0]}` : ""}`}
          description="What should I work on today? Jobs, candidates, and earnings — transparent and up to date."
          breadcrumbs={[{ label: "Talent Partner" }, { label: "My Work" }]}
        />

        <DashboardSection
          title="Today's Priority Work"
          description="High-priority jobs that need your attention."
        >
          <DashboardList
            items={data.todaysWork}
            emptyTitle="No priority work right now"
            emptyDescription="Approved high-priority jobs appear here. Browse Available Jobs to request new work."
            emptyActionHref="/partner/available-jobs"
            emptyActionLabel="Browse available jobs"
          />
        </DashboardSection>

        <DashboardSection title="Pipeline">
          <div className="space-y-3">
            <DashboardGrid columns={4}>
              {topPipeline.map((metric) => (
                <DashboardMetricCard key={metric.id} {...metric} />
              ))}
            </DashboardGrid>
            <DashboardGrid columns={3}>
              {bottomPipeline.map((metric) => (
                <DashboardMetricCard key={metric.id} {...metric} />
              ))}
            </DashboardGrid>
          </div>
        </DashboardSection>

        <DashboardSection title="Earnings">
          <DashboardGrid columns={2}>
            {data.earnings.map((metric) => (
              <DashboardMetricCard key={metric.id} {...metric} />
            ))}
          </DashboardGrid>
        </DashboardSection>

        <DashboardSection title="Quick actions">
          <DashboardQuickActionGrid
            items={data.quickActions.map((item) => ({
              ...item,
              iconKey:
                item.id === "available" || item.id === "jobs"
                  ? "job"
                  : item.id === "submit"
                    ? "review"
                    : item.id === "earnings"
                      ? "earnings"
                      : "documents",
            }))}
          />
        </DashboardSection>

        <div className="grid gap-6 lg:grid-cols-2">
          <DashboardSection title="Recent earnings">
            <DashboardList
              items={data.recentEarnings}
              emptyTitle="No earnings yet"
              emptyDescription="Payouts appear as your candidates progress."
              emptyActionHref="/partner/payments"
              emptyActionLabel="Open My Earnings"
            />
          </DashboardSection>
          <DashboardSection title="Recent candidate updates">
            <DashboardList
              items={data.recentCandidateUpdates}
              emptyTitle="No candidate updates"
              emptyDescription="Submit candidates to track recruitment status here."
              emptyActionHref="/partner/candidates"
              emptyActionLabel="My candidates"
            />
          </DashboardSection>
        </div>

        <DashboardSection title="Recent activity">
          <DashboardRecentActivity items={data.recentActivity} />
        </DashboardSection>
      </div>
    </ContentContainer>
  );
}
