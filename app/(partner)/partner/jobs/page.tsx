import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { getAppSession, roleHasPermission } from "@/lib/auth";
import { listQueriesForPartner } from "@/features/feedback/services/partner-queries.service";
import { PartnerJobsPageClient } from "@/features/tasks/components/partner-jobs-page-client";
import { listPartnerWorkTasks } from "@/features/tasks/services";

export default async function PartnerJobsPage() {
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

  if (!session.partnerId) {
    redirect("/unauthorized");
  }

  const [tasks, queries] = await Promise.all([
    listPartnerWorkTasks(session.partnerId),
    listQueriesForPartner(session.partnerId),
  ]);

  return (
    <ContentContainer>
      <Breadcrumb
        items={[
          { label: "Partner", href: "/partner" },
          { label: "My Jobs" },
        ]}
      />
      <PartnerJobsPageClient tasks={tasks} queries={queries} />
    </ContentContainer>
  );
}
