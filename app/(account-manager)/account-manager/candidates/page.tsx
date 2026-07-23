import { redirect } from "next/navigation";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { ReviewQueuePageClient } from "@/features/tasks/components";
import { listReviewQueueSubmissions } from "@/features/submissions/services";

export default async function AccountManagerReviewQueuePage() {
  const session = await getAppSession();

  if (!session) {
    redirect("/unauthorized");
  }

  if (session.role !== "account_manager") {
    redirect("/forbidden");
  }

  if (!roleHasPermission(session.role, "view_submissions")) {
    redirect("/forbidden");
  }

  const submissions = await listReviewQueueSubmissions();

  return (
    <ReviewQueuePageClient
      initialSubmissions={submissions}
      canTransition={roleHasPermission(session.role, "review_candidates")}
      breadcrumbs={[
        { label: "Account Manager", href: "/account-manager" },
        { label: "Review Queue" },
      ]}
    />
  );
}
