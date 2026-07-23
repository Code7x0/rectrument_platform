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
  return (
    <ContentContainer>
      <div className="space-y-8">
        <DashboardHeader
          title={`Welcome back${data.partnerName ? `, ${data.partnerName.split(" ")[0]}` : ""}`}
          description="What should I work on today? Jobs, candidates, and earnings — transparent and up to date."
          breadcrumbs={[{ label: "Talent Partner" }, { label: "My Work" }]}
        />

        <DashboardSection
          title="Today’s work"
          description="Assigned jobs that still need profiles."
        >
          <DashboardList
            items={data.todaysWork}
            emptyTitle="No open work"
            emptyDescription="New job allocations will show up here."
            emptyActionHref="/partner/jobs"
            emptyActionLabel="View assigned jobs"
          />
        </DashboardSection>

        <DashboardSection title="Pipeline">
          <DashboardGrid columns={6}>
            {data.metrics.map((metric) => (
              <DashboardMetricCard key={metric.id} {...metric} />
            ))}
          </DashboardGrid>
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
                item.id === "jobs"
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
