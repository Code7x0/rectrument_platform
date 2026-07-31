import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { ReviewQueuePageClient } from "@/features/tasks/components";
import { listSubmissions } from "@/features/submissions/services";

/**
 * Admin / Super Admin Candidates — full pipeline from Airtable Candidates
 * (including rejected / joined), not only the open review queue.
 */
export default async function AdminCandidatesPage() {
  noStore();

  const session = await getAppSession();

  if (!session) {
    redirect("/unauthorized");
  }

  if (!roleHasPermission(session.role, "view_submissions")) {
    redirect("/forbidden");
  }

  const submissions = await listSubmissions({ includePartnerIdentity: true });
  const homeLabel =
    session.role === "super_admin" ? "Super Admin" : "Admin";
  const homeHref =
    session.role === "super_admin" ? "/super-admin" : "/admin";

  return (
    <ReviewQueuePageClient
      initialSubmissions={submissions}
      canTransition={roleHasPermission(session.role, "review_candidates")}
      canDelete={roleHasPermission(session.role, "delete_candidates")}
      title="Candidates"
      description="All partner submissions across clients and jobs. Update status as interviews progress."
      emptyTitle="No candidates found"
      emptyDescription="When Talent Partners submit profiles against allocated jobs, they appear here."
      breadcrumbs={[
        { label: homeLabel, href: homeHref },
        { label: "Candidates" },
      ]}
    />
  );
}
