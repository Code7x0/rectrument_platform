import { listActivities } from "@/features/workflows/services/activity.service";
import type { Submission } from "@/features/submissions/types";

/** Attach latest workflow activity timestamp for partner candidate sorting. */
export async function enrichSubmissionsWithLastActivity(
  submissions: Submission[],
): Promise<Submission[]> {
  if (submissions.length === 0) {
    return submissions;
  }

  const ids = new Set(submissions.map((row) => row.id));
  const activities = await listActivities({
    entityTypes: ["submission"],
    maxRecords: Math.max(submissions.length * 4, 200),
  });

  const latestBySubmission = new Map<string, string>();
  for (const activity of activities) {
    if (!ids.has(activity.entityId) || !activity.createdAt?.trim()) {
      continue;
    }
    const previous = latestBySubmission.get(activity.entityId);
    if (!previous || activity.createdAt > previous) {
      latestBySubmission.set(activity.entityId, activity.createdAt);
    }
  }

  return submissions.map((row) => ({
    ...row,
    lastActivityAt:
      latestBySubmission.get(row.id) ?? row.updatedAt ?? row.submissionDate,
  }));
}
