import { redirect } from "next/navigation";

import { getAppSession, isAdmin } from "@/lib/auth";
import { AccountManagersPageClient } from "@/features/account-managers/components/account-managers-page-client";
import { listAccountManagersDirectory } from "@/features/account-managers/services/account-managers.service";
import { listClientOptions } from "@/services/lookups";

export default async function AdminAccountManagersPage() {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (!isAdmin(session)) {
    redirect("/forbidden");
  }

  const [{ rows, summary }, clients] = await Promise.all([
    listAccountManagersDirectory(),
    listClientOptions(),
  ]);

  const homeLabel =
    session.role === "super_admin" ? "Super Admin" : "Admin";
  const homeHref =
    session.role === "super_admin" ? "/super-admin" : "/admin";

  return (
    <AccountManagersPageClient
      rows={rows}
      summary={summary}
      clients={clients}
      breadcrumbs={[
        { label: homeLabel, href: homeHref },
        { label: "Account Managers" },
      ]}
    />
  );
}
