import { redirect } from "next/navigation";

import {
  getAppSession,
  roleHasPermission,
  resolveAccountManagerScopeId,
} from "@/lib/auth";
import { listAccountManagerJobIds } from "@/lib/auth/scope";
import { PayoutsPageClient } from "@/features/payouts/components";
import { listPayouts } from "@/features/payouts/services";
import { listAllocations } from "@/features/allocations/services";
import {
  listPartnerOptions,
} from "@/services/lookups";

export default async function AccountManagerPayoutsPage() {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (!roleHasPermission(session.role, "view_payouts")) {
    redirect("/forbidden");
  }

  const accountManagerId = resolveAccountManagerScopeId(session);
  if (!accountManagerId) {
    redirect("/unauthorized");
  }

  const jobIds = await listAccountManagerJobIds(accountManagerId);

  const [payouts, allPartners, allocations] = await Promise.all([
    listPayouts({
      includePartnerIdentity: false,
      accountManagerId,
    }),
    listPartnerOptions("operational"),
    listAllocations({ jobIds, includeArchived: true }),
  ]);

  const assignedPartnerIds = new Set(
    allocations.map((row) => row.partnerId).filter(Boolean),
  );
  const partners = allPartners.filter((partner) =>
    assignedPartnerIds.has(partner.id),
  );

  return (
    <PayoutsPageClient
      payouts={payouts}
      partners={partners}
      accountManagers={[]}
      canManage={roleHasPermission(session.role, "update_payouts")}
      canMarkPaid={false}
      role="account_manager"
      title="Payout Management"
      description="Update eligibility and processing for candidates on your assigned jobs."
      breadcrumbs={[
        { label: "Account Manager", href: "/account-manager" },
        { label: "Payouts" },
      ]}
    />
  );
}
