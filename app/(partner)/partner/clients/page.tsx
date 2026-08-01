import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { PartnerClientsPageClient } from "@/features/clients/components/partner-clients-page-client";
import { listPartnerAssignedClients } from "@/features/clients/services";
import { getAppSession, roleHasPermission } from "@/lib/auth";

export default async function PartnerClientsPage() {
  noStore();

  const session = await getAppSession();

  if (!session) {
    redirect("/unauthorized");
  }

  if (session.role !== "partner") {
    redirect("/forbidden");
  }

  if (!roleHasPermission(session.role, "view_own_allocations")) {
    redirect("/forbidden");
  }

  if (!session.partnerId) {
    redirect("/unauthorized");
  }

  const clients = await listPartnerAssignedClients(session.partnerId);

  return (
    <PartnerClientsPageClient
      clients={clients}
      breadcrumbs={[
        { label: "Partner", href: "/partner" },
        { label: "Clients" },
      ]}
    />
  );
}
