import { redirect } from "next/navigation";

import { getAppSession, roleHasPermission, isAdmin } from "@/lib/auth";
import { ClientsPageClient } from "@/features/clients/components";
import { listClients } from "@/features/clients/services";
import { listAccountManagerOptions } from "@/services/lookups";

async function loadClientsPage() {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (!roleHasPermission(session.role, "manage_clients")) {
    redirect("/forbidden");
  }

  const [clients, accountManagers] = await Promise.all([
    listClients({ includeArchived: true }),
    listAccountManagerOptions(),
  ]);

  return {
    clients,
    accountManagers,
    canCreate: isAdmin(session),
    canUpdate: roleHasPermission(session.role, "manage_clients"),
    canArchive: roleHasPermission(session.role, "archive_clients"),
    canDelete: isAdmin(session),
  };
}

export default async function AdminClientsPage() {
  const data = await loadClientsPage();

  return (
    <ClientsPageClient
      initialClients={data.clients}
      accountManagers={data.accountManagers}
      canCreate={data.canCreate}
      canUpdate={data.canUpdate}
      canArchive={data.canArchive}
      canDelete={data.canDelete}
      basePath="/admin/clients"
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Clients" },
      ]}
    />
  );
}
