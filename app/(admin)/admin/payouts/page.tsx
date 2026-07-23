import { redirect } from "next/navigation";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { PayoutsPageClient } from "@/features/payouts/components";
import { listPayouts } from "@/features/payouts/services";
import {
  listAccountManagerOptions,
  listPartnerOptions,
} from "@/services/lookups";

export default async function AdminPayoutsPage() {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (!roleHasPermission(session.role, "manage_payouts")) {
    redirect("/forbidden");
  }

  const [payouts, partners, accountManagers] = await Promise.all([
    listPayouts({ includePartnerIdentity: true }),
    listPartnerOptions("identity"),
    listAccountManagerOptions(),
  ]);

  return (
    <PayoutsPageClient
      payouts={payouts}
      partners={partners}
      accountManagers={accountManagers}
      canManage
      canMarkPaid
      role="admin"
      title="Payout Management"
      description="Track submission payouts from eligibility through payment completion."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Payouts" },
      ]}
    />
  );
}
