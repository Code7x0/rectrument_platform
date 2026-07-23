import { redirect } from "next/navigation";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { PartnerEarningsPageClient } from "@/features/payouts/components";
import {
  getPartnerEarningsSummary,
  listPayoutsForPartner,
} from "@/features/payouts/services";
import { ensurePayoutForSubmission } from "@/features/payouts/services/payouts.service";
import { listPartnerSubmissions } from "@/features/submissions/services";

export default async function PartnerPaymentsPage() {
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

  const submissions = await listPartnerSubmissions(session.partnerId);
  await Promise.all(
    submissions.map((submission) => ensurePayoutForSubmission(submission)),
  );

  const [payouts, summary] = await Promise.all([
    listPayoutsForPartner(session.partnerId),
    getPartnerEarningsSummary(session.partnerId),
  ]);

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
