import { redirect } from "next/navigation";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { AllocationsPageClient } from "@/features/allocations/components";
import { listAllocations } from "@/features/allocations/services";
import { listPartnerOptions } from "@/services/lookups";

export default async function AdminAllocationsPage() {
  const session = await getAppSession();

  if (!session) {
    redirect("/unauthorized");
  }

  if (!roleHasPermission(session.role, "view_allocations")) {
    redirect("/forbidden");
  }

  const canManage = roleHasPermission(session.role, "manage_allocations");
  const canArchive = roleHasPermission(session.role, "archive_allocations");

  const [allocations, partners] = await Promise.all([
    listAllocations({
      includeArchived: true,
      includePartnerIdentity: true,
    }),
    listPartnerOptions("identity"),
  ]);

  return (
    <AllocationsPageClient
      initialAllocations={allocations}
      partners={partners}
      canManage={canManage}
      canArchive={canArchive}
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Allocations" },
      ]}
    />
  );
}
