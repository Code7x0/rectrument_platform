import { redirect } from "next/navigation";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { getPayoutMapForPartner } from "@/features/payouts/services";
import { ensurePayoutForSubmission } from "@/features/payouts/services/payouts.service";
import { PartnerSubmissionsPageClient } from "@/features/submissions/components";
import { listPartnerSubmissions } from "@/features/submissions/services";
import type { Payout } from "@/features/payouts/types";

export default async function PartnerCandidatesPage() {
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

  const submissions = await listPartnerSubmissions(session.partnerId);

  await Promise.all(
    submissions.map((submission) => ensurePayoutForSubmission(submission)),
  );

  const payoutMap = await getPayoutMapForPartner(session.partnerId);
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
