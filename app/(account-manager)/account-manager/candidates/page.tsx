import { redirect } from "next/navigation";

import {
  getAppSession,
  roleHasPermission,
  resolveAccountManagerScopeId,
} from "@/lib/auth";
import { listAccountManagerJobIds } from "@/lib/auth/scope";
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

  const accountManagerId = resolveAccountManagerScopeId(session);
  if (!accountManagerId) {
    redirect("/unauthorized");
  }

  const jobIds = await listAccountManagerJobIds(accountManagerId);
  const submissions = await listReviewQueueSubmissions({ jobIds });

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
