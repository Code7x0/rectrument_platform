import { FeedbackPageClient } from "@/features/feedback/components/feedback-page-client";
import { listQueriesForPartner } from "@/features/feedback/services/partner-queries.service";
import { requireRole, resolvePartnerScopeId } from "@/lib/auth";

export default async function PartnerFeedbackPage() {
  const session = await requireRole(["partner"]);
  const partnerId = resolvePartnerScopeId(session);
  const queries = partnerId ? await listQueriesForPartner(partnerId) : [];
  return <FeedbackPageClient role="partner" initialQueries={queries} />;
}
