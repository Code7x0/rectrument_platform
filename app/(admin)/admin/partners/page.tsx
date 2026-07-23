import { redirect } from "next/navigation";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { PartnersPageClient } from "@/features/partners/components";
import { listPartners } from "@/features/partners/services";

export default async function AdminPartnersPage() {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (!roleHasPermission(session.role, "manage_partners")) {
    redirect("/forbidden");
  }

  const partners = await listPartners({ includeArchived: true });

  return (
    <PartnersPageClient
      initialPartners={partners}
      canCreate={roleHasPermission(session.role, "manage_partners")}
      canUpdate={roleHasPermission(session.role, "manage_partners")}
      canArchive={roleHasPermission(session.role, "archive_partners")}
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Partners" },
      ]}
    />
  );
}
