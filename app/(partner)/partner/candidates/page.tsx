import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { getPayoutMapForPartner } from "@/features/payouts/services";
import { PartnerSubmissionsPageClient } from "@/features/submissions/components";
import { listPartnerSubmissions } from "@/features/submissions/services";
import type { Payout } from "@/features/payouts/types";

export default async function PartnerCandidatesPage() {
  noStore();

  const session = await getAppSession();

  if (!session) {
    redirect("/unauthorized");
  }

  if (session.role !== "partner") {
    redirect("/forbidden");
  }

  if (!roleHasPermission(session.role, "submit_candidates")) {
    redirect("/forbidden");
  }

  if (!session.partnerId) {
    redirect("/unauthorized");
  }

  const [submissions, payoutMap] = await Promise.all([
    listPartnerSubmissions(session.partnerId),
    getPayoutMapForPartner(session.partnerId),
  ]);

  const payoutsBySubmission: Record<string, Payout> = Object.fromEntries(
    payoutMap.entries(),
  );

  return (
    <PartnerSubmissionsPageClient
      submissions={submissions}
      payoutsBySubmission={payoutsBySubmission}
      breadcrumbs={[
        { label: "Partner", href: "/partner" },
        { label: "My Candidates" },
      ]}
    />
  );
}
