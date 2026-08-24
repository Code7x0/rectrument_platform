import { FeedbackPageClient } from "@/features/feedback/components/feedback-page-client";
import { requireRole } from "@/lib/auth";

export default async function AccountManagerFeedbackPage() {
  await requireRole(["account_manager"]);
  return <FeedbackPageClient role="account_manager" />;
}
