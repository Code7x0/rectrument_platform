import { redirect } from "next/navigation";

import { getAppSession, isAdmin, roleHasPermission } from "@/lib/auth";
import { PartnersPageClient } from "@/features/partners/components";
import { listPartners } from "@/features/partners/services";

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (!roleHasPermission(session.role, "manage_partners")) {
    redirect("/forbidden");
  }

  const params = await searchParams;
  const statusParam = params.status?.trim();
  const initialStatus =
    statusParam === "active" ||
    statusParam === "inactive" ||
    statusParam === "archived"
      ? statusParam
      : undefined;

  const partners = await listPartners({ includeArchived: true });
  const homeLabel = session.role === "super_admin" ? "Super Admin" : "Admin";
  const homeHref = session.role === "super_admin" ? "/super-admin" : "/admin";

  return (
    <PartnersPageClient
      initialPartners={partners}
      canCreate={roleHasPermission(session.role, "manage_partners")}
      canUpdate={roleHasPermission(session.role, "manage_partners")}
      canArchive={roleHasPermission(session.role, "archive_partners")}
      canDelete={isAdmin(session)}
      initialStatus={initialStatus}
      breadcrumbs={[
        { label: homeLabel, href: homeHref },
        { label: "Partners" },
      ]}
    />
  );
}
