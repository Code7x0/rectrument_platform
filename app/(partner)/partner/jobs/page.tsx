import { redirect } from "next/navigation";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { getAppSession, roleHasPermission } from "@/lib/auth";
import { PartnerWorkQueue } from "@/features/tasks/components";
import { listPartnerWorkTasks } from "@/features/tasks/services";

export default async function PartnerJobsPage() {
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

  const tasks = await listPartnerWorkTasks(session.partnerId);

  return (
    <ContentContainer>
      <Breadcrumb
        items={[
          { label: "Partner", href: "/partner" },
          { label: "Assigned Jobs" },
        ]}
      />
      <PageHeader
        title="Assigned Jobs"
        description="Active jobs allocated to you. Open a job to submit candidates."
      />
      <PartnerWorkQueue tasks={tasks} />
    </ContentContainer>
  );
}
