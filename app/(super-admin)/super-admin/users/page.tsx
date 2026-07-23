import { redirect } from "next/navigation";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { RoleManagementPageClient } from "@/features/users/components";
import { listManagedUsers } from "@/features/users/services";

export default async function SuperAdminUsersPage() {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (!roleHasPermission(session.role, "manage_roles")) {
    redirect("/forbidden");
  }

  const users = await listManagedUsers();

  return (
    <RoleManagementPageClient
      users={users}
      breadcrumbs={[
        { label: "Super Admin", href: "/super-admin" },
        { label: "Role Management" },
      ]}
    />
  );
}
