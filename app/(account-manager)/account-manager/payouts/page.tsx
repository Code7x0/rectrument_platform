import { redirect } from "next/navigation";

import {
  getAppSession,
  roleHasPermission,
  resolveAccountManagerScopeId,
} from "@/lib/auth";
import { PayoutsPageClient } from "@/features/payouts/components";
import { listPayouts } from "@/features/payouts/services";
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

  const [payouts, partners] = await Promise.all([
    listPayouts({
      includePartnerIdentity: false,
      accountManagerId,
    }),
    listPartnerOptions("operational"),
  ]);

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
