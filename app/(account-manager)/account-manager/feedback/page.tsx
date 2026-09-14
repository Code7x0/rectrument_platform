import { FeedbackPageClient } from "@/features/feedback/components/feedback-page-client";
import { listQueriesForAccountManager } from "@/features/feedback/services/partner-queries.service";
import { requireRole, resolveAccountManagerScopeId } from "@/lib/auth";

export default async function AccountManagerFeedbackPage() {
  const session = await requireRole(["account_manager"]);
  const accountManagerId = resolveAccountManagerScopeId(session);
  const queries = accountManagerId
    ? await listQueriesForAccountManager(accountManagerId)
    : [];
  return (
    <FeedbackPageClient role="account_manager" initialQueries={queries} />
  );
}
