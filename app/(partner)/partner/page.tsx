import { Suspense } from "react";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { ContentContainer } from "@/components/shared/content-container";
import { getAppSession, roleHasPermission } from "@/lib/auth";
import {
  DashboardSkeleton,
  PartnerDashboard,
} from "@/features/dashboard/components";
import { getPartnerDashboardData } from "@/features/dashboard/services";

async function PartnerDashboardLoader({
  partnerId,
  partnerName,
}: {
  partnerId: string;
  partnerName: string;
}) {
  const data = await getPartnerDashboardData(partnerId, partnerName);
  return <PartnerDashboard data={data} />;
}

export default async function PartnerMyWorkPage() {
  noStore();

  const session = await getAppSession();

  if (!session) {
    redirect("/unauthorized");
  }

  if (session.role !== "partner") {
    redirect("/forbidden");
  }

  if (!roleHasPermission(session.role, "view_own_allocations")) {
    redirect("/forbidden");
  }

  const partnerId = session.partnerId;
  if (!partnerId) {
    redirect("/unauthorized");
  }

  const partnerName = session.displayName ?? "Partner";

  return (
    <Suspense
      fallback={
        <ContentContainer>
          <DashboardSkeleton metricCount={6} />
        </ContentContainer>
      }
    >
      <PartnerDashboardLoader partnerId={partnerId} partnerName={partnerName} />
    </Suspense>
  );
}
