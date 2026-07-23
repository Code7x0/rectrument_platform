import { redirect } from "next/navigation";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { ReviewQueuePageClient } from "@/features/tasks/components";
import { listSubmissions } from "@/features/submissions/services";

/**
 * Admin Candidates — full pipeline from Airtable Candidates
 * (including rejected / joined), not only the open review queue.
 */
export default async function AdminCandidatesPage() {
  const session = await getAppSession();

  if (!session) {
    redirect("/unauthorized");
  }

  if (!roleHasPermission(session.role, "view_submissions")) {
    redirect("/forbidden");
  }

  const submissions = await listSubmissions();

  return (
    <ReviewQueuePageClient
      initialSubmissions={submissions}
      canTransition={false}
      emptyTitle="No candidates found"
      emptyDescription="Candidates linked to a Job (Role) and Talent Partner appear here from Airtable."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Candidates" },
      ]}
    />
  );
}
