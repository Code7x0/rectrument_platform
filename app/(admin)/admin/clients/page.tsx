import { redirect } from "next/navigation";

import { getAppSession, roleHasPermission, isAdmin } from "@/lib/auth";
import { ClientsPageClient } from "@/features/clients/components";
import { listClients } from "@/features/clients/services";
import { listAccountManagerOptions } from "@/services/lookups";

export default async function AdminClientsPage() {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (!roleHasPermission(session.role, "manage_clients")) {
    redirect("/forbidden");
  }
  if (!isAdmin(session)) {
    redirect("/forbidden");
  }

  const [clients, accountManagers] = await Promise.all([
    listClients({ includeArchived: true }),
    listAccountManagerOptions(),
  ]);

  const homeLabel = session.role === "super_admin" ? "Super Admin" : "Admin";
  const homeHref =
    session.role === "super_admin" ? "/super-admin" : "/admin";

  return (
    <ClientsPageClient
      initialClients={clients}
      accountManagers={accountManagers}
      canCreate={isAdmin(session)}
      canUpdate={roleHasPermission(session.role, "manage_clients")}
      canArchive={roleHasPermission(session.role, "archive_clients")}
      canDelete={isAdmin(session)}
      basePath="/admin/clients"
      breadcrumbs={[
        { label: homeLabel, href: homeHref },
        { label: "Clients" },
      ]}
    />
  );
}
