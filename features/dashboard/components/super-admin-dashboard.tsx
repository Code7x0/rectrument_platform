import { ContentContainer } from "@/components/shared/content-container";
import { DashboardCard, DashboardGrid } from "@/features/dashboard/components/dashboard-card";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DashboardList } from "@/features/dashboard/components/dashboard-list";
import { DashboardMetricCard } from "@/features/dashboard/components/dashboard-metric-card";
import { DashboardQuickActionGrid } from "@/features/dashboard/components/dashboard-quick-action";
import { DashboardRecentActivity } from "@/features/dashboard/components/dashboard-recent-activity";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import type { SuperAdminDashboardData } from "@/features/dashboard/types";

interface SuperAdminDashboardProps {
  data: SuperAdminDashboardData;
}

export function SuperAdminDashboard({ data }: SuperAdminDashboardProps) {
  return (
    <ContentContainer>
      <div className="space-y-8">
        <DashboardHeader
          title="Command Center"
          description="What needs your attention across users, invitations, and company access."
          breadcrumbs={[{ label: "Super Admin" }, { label: "Dashboard" }]}
        />

        <DashboardSection title="Users & access">
          <DashboardGrid columns={6}>
            {data.metrics.map((metric) => (
              <DashboardMetricCard key={metric.id} {...metric} />
            ))}
          </DashboardGrid>
        </DashboardSection>

        <DashboardSection
          title="Quick actions"
          description="Jump straight into staff and registration workflows."
        >
          <DashboardQuickActionGrid
            items={data.quickActions.map((item) => ({
              ...item,
              iconKey:
                item.id === "invite-admin" || item.id === "invite-am"
                  ? "invite"
                  : item.id === "review-regs"
                    ? "review"
                    : "roles",
            }))}
          />
        </DashboardSection>

        <div className="grid gap-6 lg:grid-cols-2">
          <DashboardSection title="Recent invitations">
            <DashboardList
              items={data.recentInvitations}
              emptyTitle="No pending invitations"
              emptyDescription="Invite Admins or Account Managers from Role Management."
              emptyActionHref="/super-admin/users"
              emptyActionLabel="Invite staff"
            />
          </DashboardSection>
          <DashboardSection title="Recent approvals">
            <DashboardList
              items={data.recentApprovals}
              emptyTitle="No recent approvals"
              emptyDescription="Approved Talent Partners will appear here."
              emptyActionHref="/admin/approvals"
              emptyActionLabel="Review registrations"
            />
          </DashboardSection>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <DashboardSection title="Recent user activity">
            <DashboardRecentActivity items={data.recentActivity} />
          </DashboardSection>
          <DashboardSection title="Company health">
            <DashboardGrid columns={3}>
              {data.companyHealth.map((metric) => (
                <DashboardMetricCard key={metric.id} {...metric} />
              ))}
            </DashboardGrid>
            <DashboardCard className="mt-3 text-xs text-[#64748B]">
              Active means login-enabled users. Pending registrations block
              Talent Partner access until Admin approval.
            </DashboardCard>
          </DashboardSection>
        </div>
      </div>
    </ContentContainer>
  );
}
