import { redirect } from "next/navigation";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { PayoutsPageClient } from "@/features/payouts/components";
import { listPayouts } from "@/features/payouts/services";
import {
  listAccountManagerOptions,
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

  const [payouts, partners, accountManagers] = await Promise.all([
    listPayouts({
      includePartnerIdentity: false,
      accountManagerId: session.userId,
    }),
    listPartnerOptions("operational"),
    listAccountManagerOptions(),
  ]);

  return (
    <PayoutsPageClient
      payouts={payouts}
      partners={partners}
      accountManagers={accountManagers}
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
