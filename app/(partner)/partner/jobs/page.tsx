import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { getAppSession, roleHasPermission } from "@/lib/auth";
import { PartnerWorkQueue } from "@/features/tasks/components";
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

  const tasks = await listPartnerWorkTasks(session.partnerId);

  return (
    <ContentContainer>
      <Breadcrumb
        items={[
          { label: "Partner", href: "/partner" },
          { label: "My Jobs" },
        ]}
      />
      <PageHeader
        title={`My Jobs (${tasks.length})`}
        description="Active and On Hold jobs allocated to you. Open a job for details and comments. Use Submit Profile to pick a JD and submit in one step."
      />
      <PartnerWorkQueue tasks={tasks} />
    </ContentContainer>
  );
}
