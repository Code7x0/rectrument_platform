import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ContentContainer } from "@/components/shared/content-container";
import { getAppSession } from "@/lib/auth";
import {
  DashboardSkeleton,
  SuperAdminDashboard,
} from "@/features/dashboard/components";
import { getSuperAdminDashboardData } from "@/features/dashboard/services";

async function SuperAdminDashboardLoader() {
  const data = await getSuperAdminDashboardData();
  return <SuperAdminDashboard data={data} />;
}

export default async function SuperAdminHomePage() {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (session.role !== "super_admin") {
    redirect("/forbidden");
  }

  return (
    <Suspense
      fallback={
        <ContentContainer>
          <DashboardSkeleton metricCount={6} />
        </ContentContainer>
      }
    >
      <SuperAdminDashboardLoader />
    </Suspense>
  );
}
