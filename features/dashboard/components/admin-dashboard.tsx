import { ContentContainer } from "@/components/shared/content-container";
import { DashboardGrid } from "@/features/dashboard/components/dashboard-card";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DashboardList } from "@/features/dashboard/components/dashboard-list";
import { DashboardMetricCard } from "@/features/dashboard/components/dashboard-metric-card";
import { DashboardQuickActionGrid } from "@/features/dashboard/components/dashboard-quick-action";
import { DashboardRecentActivity } from "@/features/dashboard/components/dashboard-recent-activity";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import type { AdminDashboardData } from "@/features/dashboard/types";

interface AdminDashboardProps {
  data: AdminDashboardData;
}

export function AdminDashboard({ data }: AdminDashboardProps) {
  return (
    <ContentContainer>
      <div className="space-y-8">
        <DashboardHeader
          title="Command Center"
          description="Track business operations that need Admin attention today."
          breadcrumbs={[{ label: "Admin" }, { label: "Dashboard" }]}
        />

        <DashboardSection title="Operations snapshot">
          <DashboardGrid columns={4}>
            {data.metrics.map((metric) => (
              <DashboardMetricCard key={metric.id} {...metric} />
            ))}
          </DashboardGrid>
        </DashboardSection>

        <DashboardSection title="Quick actions">
          <DashboardQuickActionGrid
            items={data.quickActions.map((item) => ({
              ...item,
              iconKey:
                item.id === "create-client"
                  ? "client"
                  : item.id === "create-job"
                    ? "job"
                    : item.id === "review-docs"
                      ? "documents"
                      : "partners",
            }))}
          />
        </DashboardSection>

        <div className="grid gap-6 lg:grid-cols-2">
          <DashboardSection title="Recent jobs">
            <DashboardList
              items={data.recentJobs}
              emptyTitle="No jobs yet"
              emptyDescription="Create a job to start allocations."
              emptyActionHref="/admin/jobs"
              emptyActionLabel="Create job"
            />
          </DashboardSection>
          <DashboardSection title="Recent candidates">
            <DashboardList
              items={data.recentCandidates}
              emptyTitle="No candidate submissions"
              emptyDescription="Submissions appear as partners work allocations."
              emptyActionHref="/admin/candidates"
              emptyActionLabel="View candidates"
            />
          </DashboardSection>
          <DashboardSection title="Recent documents">
            <DashboardList
              items={data.recentDocuments}
              emptyTitle="No documents"
              emptyDescription="Partner KYC uploads show up here for verification."
              emptyActionHref="/admin/documents"
              emptyActionLabel="Review documents"
            />
          </DashboardSection>
          <DashboardSection title="Recent payouts">
            <DashboardList
              items={data.recentPayouts}
              emptyTitle="No payouts yet"
              emptyDescription="Payouts are created per submission."
              emptyActionHref="/admin/payouts"
              emptyActionLabel="Open payouts"
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
