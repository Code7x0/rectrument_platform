import { redirect } from "next/navigation";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { ReviewQueuePageClient } from "@/features/tasks/components";
import { listReviewQueueSubmissions } from "@/features/submissions/services";

/** Admin read-only review pipeline. */
export default async function AdminCandidatesPage() {
  const session = await getAppSession();

  if (!session) {
    redirect("/unauthorized");
  }

  if (!roleHasPermission(session.role, "view_submissions")) {
    redirect("/forbidden");
  }

  const submissions = await listReviewQueueSubmissions();

  return (
    <ReviewQueuePageClient
      initialSubmissions={submissions}
      canTransition={false}
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Candidates" },
      ]}
    />
  );
}
