import { FeedbackPageClient } from "@/features/feedback/components/feedback-page-client";
import { requireRole } from "@/lib/auth";

export default async function PartnerFeedbackPage() {
  await requireRole(["partner"]);
  return <FeedbackPageClient role="partner" />;
}
