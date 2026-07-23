import { redirect } from "next/navigation";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { ApprovalsPageClient } from "@/features/users/components";
import { listPendingPartnerApplications } from "@/features/users/services";

export default async function AdminApprovalsPage() {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (!roleHasPermission(session.role, "approve_partners")) {
    redirect("/forbidden");
  }

  const applications = await listPendingPartnerApplications();

  return (
    <ApprovalsPageClient
      applications={applications}
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Pending Approvals" },
      ]}
    />
  );
}
