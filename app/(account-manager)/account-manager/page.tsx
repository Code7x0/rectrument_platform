import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ContentContainer } from "@/components/shared/content-container";
import { getAppSession } from "@/lib/auth";
import {
  AccountManagerDashboard,
  DashboardSkeleton,
} from "@/features/dashboard/components";
import { getAccountManagerDashboardData } from "@/features/dashboard/services";

async function AccountManagerDashboardLoader({
  accountManagerId,
}: {
  accountManagerId: string;
}) {
  const data = await getAccountManagerDashboardData(accountManagerId);
  return <AccountManagerDashboard data={data} />;
}

export default async function AccountManagerDashboardPage() {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (session.role !== "account_manager") {
    redirect("/forbidden");
  }

  const accountManagerId = session.accountManagerId ?? session.userId;

  return (
    <Suspense
      fallback={
        <ContentContainer>
          <DashboardSkeleton metricCount={4} />
        </ContentContainer>
      }
    >
      <AccountManagerDashboardLoader accountManagerId={accountManagerId} />
    </Suspense>
  );
}
