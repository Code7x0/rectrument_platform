import { FeedbackPageClient } from "@/features/feedback/components/feedback-page-client";
import { listPartnerQueries } from "@/features/feedback/services/partner-queries.service";
import { requireRole } from "@/lib/auth";

export default async function AccountManagerFeedbackPage() {
  await requireRole(["account_manager"]);
  const queries = await listPartnerQueries();
  return (
    <FeedbackPageClient role="account_manager" initialQueries={queries} />
  );
}
