import { redirect } from "next/navigation";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { RoleManagementPageClient } from "@/features/users/components";
import { listManagedUsers } from "@/features/users/services";

export default async function SuperAdminAdminsPage() {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (!roleHasPermission(session.role, "manage_roles")) {
    redirect("/forbidden");
  }

  const users = (await listManagedUsers()).filter(
    (user) => user.role === "admin",
  );

  return (
    <RoleManagementPageClient
      users={users}
      title="Admins"
      description="Platform administrators. Invite staff from Role Management, or promote a Talent Partner to Account Manager first."
      breadcrumbs={[
        { label: "Super Admin", href: "/super-admin" },
        { label: "Admins" },
      ]}
    />
  );
}
