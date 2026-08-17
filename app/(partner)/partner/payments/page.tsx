import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { PartnerEarningsPageClient } from "@/features/payouts/components";
import {
  getPartnerEarningsSummary,
  listPayoutsForPartner,
} from "@/features/payouts/services";

export default async function PartnerPaymentsPage() {
  noStore();

  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (!roleHasPermission(session.role, "view_own_payouts")) {
    redirect("/forbidden");
  }
  if (!session.partnerId) {
    redirect("/unauthorized");
  }

  // One Airtable-backed list — summary is derived in memory (list is request-cached).
  const payouts = await listPayoutsForPartner(session.partnerId);
  const summary = await getPartnerEarningsSummary(session.partnerId);

  return (
    <PartnerEarningsPageClient
      payouts={payouts}
      summary={summary}
      breadcrumbs={[
        { label: "Partner", href: "/partner" },
        { label: "My Earnings" },
      ]}
    />
  );
}
