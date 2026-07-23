import { listJobs } from "@/features/jobs/services";
import { listDocumentsForPartner } from "@/features/partner-documents/services";
import { listPayouts, listPayoutsForPartner } from "@/features/payouts/services";
import { listSubmissions } from "@/features/submissions/services";
import { listUsers } from "@/services/users/users.service";
import type { ActivityEntityType } from "@/features/workflows/types";
import type { AppSession } from "@/types";
import { activityEntityKey } from "@/features/activity/services/presenters";
import type { TimelineEntityRef } from "@/features/activity/types";

export type EntityAccessKey = string;

/**
 * Resolve which Activity (entityType, entityId) pairs belong to a timeline target.
 * Aggregation only — no new activity writes.
 */
export async function resolveEntityAccessKeys(
  ref: TimelineEntityRef,
): Promise<Set<EntityAccessKey> | "all" | "none"> {
  switch (ref.kind) {
    case "submission":
      return new Set([activityEntityKey("submission", ref.id)]);
    case "payout":
      return new Set([activityEntityKey("payout", ref.id)]);
    case "user":
      return new Set([activityEntityKey("user", ref.id)]);
    case "partner_document":
    case "document":
      return new Set([activityEntityKey("partner_document", ref.id)]);
    case "notification":
      return "none";
    case "partner": {
      const [submissions, documents, payouts, partnerUsers] = await Promise.all([
        listSubmissions({ partnerId: ref.id }),
        listDocumentsForPartner(ref.id),
        listPayoutsForPartner(ref.id),
        listUsers({ role: "partner" }),
      ]);
      const keys = new Set<string>();
      for (const row of submissions) {
        keys.add(activityEntityKey("submission", row.id));
      }
      for (const row of documents) {
        keys.add(activityEntityKey("partner_document", row.id));
      }
      for (const row of payouts) {
        keys.add(activityEntityKey("payout", row.id));
      }
      for (const row of partnerUsers) {
        if (row.partnerId === ref.id) {
          keys.add(activityEntityKey("user", row.id));
        }
      }
      return keys;
    }
    case "job": {
      const submissions = await listSubmissions({ jobId: ref.id });
      const keys = new Set<string>();
      for (const row of submissions) {
        keys.add(activityEntityKey("submission", row.id));
      }
      const submissionIds = new Set(submissions.map((row) => row.id));
      if (submissionIds.size > 0) {
        const payouts = await listPayouts({});
        for (const payout of payouts) {
          if (submissionIds.has(payout.submissionId)) {
            keys.add(activityEntityKey("payout", payout.id));
          }
        }
      }
      return keys;
    }
    case "client": {
      const jobs = await listJobs({ clientId: ref.id, includeArchived: true });
      const keys = new Set<string>();
      await Promise.all(
        jobs.map(async (job) => {
          const nested = await resolveEntityAccessKeys({
            kind: "job",
            id: job.id,
          });
          if (nested instanceof Set) {
            for (const key of nested) {
              keys.add(key);
            }
          }
        }),
      );
      return keys;
    }
    case "allocation": {
      const submissions = await listSubmissions({ allocationId: ref.id });
      return new Set(
        submissions.map((row) => activityEntityKey("submission", row.id)),
      );
    }
    case "candidate": {
      const submissions = await listSubmissions({});
      return new Set(
        submissions
          .filter((row) => row.candidateId === ref.id)
          .map((row) => activityEntityKey("submission", row.id)),
      );
    }
    default:
      return "none";
  }
}

/**
 * Role-scoped access keys for the global timeline.
 * Super Admin / Admin: all. AM: assigned jobs. Partner: own partner entities.
 */
export async function resolveViewerAccessKeys(
  session: AppSession,
): Promise<Set<EntityAccessKey> | "all"> {
  if (session.role === "super_admin" || session.role === "admin") {
    return "all";
  }

  if (session.role === "partner") {
    if (!session.partnerId) {
      return new Set();
    }
    const keys = await resolveEntityAccessKeys({
      kind: "partner",
      id: session.partnerId,
    });
    return keys instanceof Set ? keys : new Set();
  }

  // Account Manager — assigned activities only
  const jobs = await listJobs({
    accountManagerId: session.userId,
    includeArchived: true,
  });
  const keys = new Set<string>();
  await Promise.all(
    jobs.map(async (job) => {
      const nested = await resolveEntityAccessKeys({ kind: "job", id: job.id });
      if (nested instanceof Set) {
        for (const key of nested) {
          keys.add(key);
        }
      }
    }),
  );

  return keys;
}

export function activityMatchesAccess(
  entityType: ActivityEntityType,
  entityId: string,
  access: Set<EntityAccessKey> | "all",
): boolean {
  if (access === "all") {
    return true;
  }
  return access.has(activityEntityKey(entityType, entityId));
}
