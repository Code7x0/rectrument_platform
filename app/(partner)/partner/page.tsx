import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ContentContainer } from "@/components/shared/content-container";
import { getAppSession, roleHasPermission } from "@/lib/auth";
import {
  DashboardSkeleton,
  PartnerDashboard,
} from "@/features/dashboard/components";
import { getPartnerDashboardData } from "@/features/dashboard/services";
import { getUserById } from "@/services/users/users.service";

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

  const user = await getUserById(session.userId);
  const partnerName = user?.fullName ?? "Partner";

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
