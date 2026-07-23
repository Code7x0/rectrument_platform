"use client";

import Link from "next/link";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { WorkspaceMetricCard } from "@/features/shared/workspace/workspace-metric-card";
import type { UsersSummary } from "@/features/users/types";

interface SuperAdminHomeClientProps {
  summary: UsersSummary;
  breadcrumbs: Array<{ label: string; href?: string }>;
}

export function SuperAdminHomeClient({
  summary,
  breadcrumbs,
}: SuperAdminHomeClientProps) {
  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader
        title="Super Admin Workspace"
        description="Manage Admins, Account Managers, Talent Partners, and platform access."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/super-admin/users">Role Management</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/approvals">Pending Approvals</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin">Business Admin</Link>
            </Button>
          </div>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <WorkspaceMetricCard label="Total users" value={summary.totalUsers} />
        <WorkspaceMetricCard
          label="Pending approvals"
          value={summary.pendingApprovals}
        />
        <WorkspaceMetricCard
          label="Invitations pending"
          value={summary.invitationPending}
        />
        <WorkspaceMetricCard
          label="Active partners"
          value={summary.activePartners}
        />
        <WorkspaceMetricCard label="Admins" value={summary.admins} />
        <WorkspaceMetricCard
          label="Account Managers"
          value={summary.accountManagers}
        />
      </div>

      <section className="mt-8 rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <h2 className="text-base font-semibold text-[#0F172A]">Capabilities</h2>
        <ul className="mt-3 space-y-2 text-sm text-[#475569]">
          <li>Invite Admins and Account Managers (never another Super Admin)</li>
          <li>Promote Talent Partners to Admin or Account Manager</li>
          <li>Deactivate users and reset access with a fresh invitation</li>
          <li>Manage company settings and full business administration</li>
        </ul>
      </section>
    </ContentContainer>
  );
}
