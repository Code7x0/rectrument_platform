import { redirect } from "next/navigation";

import {
  getAppSession,
  roleHasPermission,
  resolveAccountManagerScopeId,
} from "@/lib/auth";
import { listAccountManagerJobIds } from "@/lib/auth/scope";
import { AllocationsPageClient } from "@/features/allocations/components";
import { listAllocations } from "@/features/allocations/services";
import { listPartnerOptions } from "@/services/lookups";

export default async function AccountManagerAllocationsPage() {
  const session = await getAppSession();

  if (!session) {
    redirect("/unauthorized");
  }

  if (!roleHasPermission(session.role, "view_allocations")) {
    redirect("/forbidden");
  }

  const accountManagerId = resolveAccountManagerScopeId(session);
  if (!accountManagerId) {
    redirect("/unauthorized");
  }

  const jobIds = await listAccountManagerJobIds(accountManagerId);

  const [allocations, partners] = await Promise.all([
    listAllocations({
      includeArchived: true,
      includePartnerIdentity: false,
      jobIds,
    }),
    listPartnerOptions("operational"),
  ]);

  return (
    <AllocationsPageClient
      initialAllocations={allocations}
      partners={partners}
      canManage={roleHasPermission(session.role, "manage_allocations")}
      canArchive={roleHasPermission(session.role, "archive_allocations")}
      breadcrumbs={[
        { label: "Account Manager", href: "/account-manager" },
        { label: "Allocations" },
      ]}
    />
  );
}
