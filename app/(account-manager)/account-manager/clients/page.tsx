import { redirect } from "next/navigation";

import {
  getAppSession,
  roleHasPermission,
  isAdmin,
  resolveAccountManagerScopeId,
} from "@/lib/auth";
import { ClientsPageClient } from "@/features/clients/components";
import { listClients } from "@/features/clients/services";
import { listAccountManagerOptions } from "@/services/lookups";

export default async function AccountManagerClientsPage() {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (!roleHasPermission(session.role, "manage_clients")) {
    redirect("/forbidden");
  }

  const accountManagerId = resolveAccountManagerScopeId(session);
  if (!accountManagerId) {
    redirect("/unauthorized");
  }

  const [clients, accountManagers] = await Promise.all([
    listClients({ includeArchived: true, accountManagerId }),
    listAccountManagerOptions().then((rows) =>
      rows.filter((row) => row.id === accountManagerId),
    ),
  ]);

  return (
    <ClientsPageClient
      initialClients={clients}
      accountManagers={accountManagers}
      canCreate={isAdmin(session)}
      canUpdate={roleHasPermission(session.role, "manage_clients")}
      canArchive={roleHasPermission(session.role, "archive_clients")}
      basePath="/account-manager/clients"
      breadcrumbs={[
        { label: "Account Manager", href: "/account-manager" },
        { label: "Clients" },
      ]}
    />
  );
}
