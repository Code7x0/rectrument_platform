import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ContentContainer } from "@/components/shared/content-container";
import { getAppSession } from "@/lib/auth";
import {
  AdminDashboard,
  DashboardSkeleton,
} from "@/features/dashboard/components";
import { getAdminDashboardData } from "@/features/dashboard/services";

async function AdminDashboardLoader() {
  const data = await getAdminDashboardData();
  return <AdminDashboard data={data} />;
}

export default async function AdminDashboardPage() {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (session.role !== "admin" && session.role !== "super_admin") {
    redirect("/forbidden");
  }

  return (
    <Suspense
      fallback={
        <ContentContainer>
          <DashboardSkeleton metricCount={8} />
        </ContentContainer>
      }
    >
      <AdminDashboardLoader />
    </Suspense>
  );
}
