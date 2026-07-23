import { ActivitiesPageClient } from "@/features/activity/components";
import { getGlobalTimeline } from "@/features/activity/services";
import { requireAuth } from "@/lib/auth";

function descriptionForRole(role: string): string {
  switch (role) {
    case "super_admin":
      return "Everything that happened across the platform.";
    case "admin":
      return "Business activity across clients, partners, candidates, and payouts.";
    case "account_manager":
      return "Activity on your assigned jobs and related candidates.";
    case "partner":
      return "Activity on your submissions, documents, and earnings.";
    default:
      return "What happened, when, and who did it.";
  }
}

export default async function ActivitiesPage() {
  const session = await requireAuth();
  const initial = await getGlobalTimeline(session, {
    page: 1,
    pageSize: 30,
  });

  return (
    <ActivitiesPageClient
      initial={initial}
      description={descriptionForRole(session.role)}
      breadcrumbs={[{ label: "Activity" }]}
    />
  );
}
