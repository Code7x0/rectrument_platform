import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { getAppSession, roleHasPermission } from "@/lib/auth";
import { PartnerSubmitProfilePageClient } from "@/features/submissions/components";
import { listPartnerWorkTasks } from "@/features/tasks/services";

export default async function PartnerSubmitProfilePage() {
  noStore();

  const session = await getAppSession();

  if (!session) {
    redirect("/unauthorized");
  }

  if (session.role !== "partner") {
    redirect("/forbidden");
  }

  if (
    !roleHasPermission(session.role, "submit_candidates") ||
    !roleHasPermission(session.role, "view_own_allocations")
  ) {
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
          { label: "Submit Profile" },
        ]}
      />
      <PageHeader
        title="Submit Profile"
        description="Pick an assigned job, then submit the candidate profile in one place."
      />
      <PartnerSubmitProfilePageClient tasks={tasks} />
    </ContentContainer>
  );
}
