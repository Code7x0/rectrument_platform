/**
 * Ephemeral notification feed derived from recent Candidates status rows.
 * No read-state persistence on the locked client schema.
 */

import { getRecords, type AirtableFields } from "@/lib/airtable/client";
import { asString } from "@/lib/airtable/compat";
import {
  CANDIDATES_TABLE_FIELDS,
  SUBMISSIONS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import { getAirtableTableName } from "@/lib/airtable/tables";
import { mapSubmissionRecord } from "@/features/submissions/services/submissions.mapper";
import type { Notification } from "@/features/notifications/types";
import { getDismissedNotificationIds } from "@/features/notifications/lib/read-state";

export async function deriveNotificationsForViewer(input: {
  recipientUserId: string;
  partnerId?: string | null;
  accountManagerId?: string | null;
  role?: string | null;
  maxRecords?: number;
}): Promise<Notification[]> {
  const records = await getRecords(getAirtableTableName("candidatesTable"), {
    sort: [
      { field: SUBMISSIONS_TABLE_FIELDS.submissionDate, direction: "desc" },
    ],
    maxRecords: input.maxRecords ?? 40,
  });

  let allowedJobIds: Set<string> | null = null;
  const amScopeId =
    input.accountManagerId ||
    (input.role === "account_manager" ? input.recipientUserId : null);
  if (amScopeId) {
    const { listJobs } = await import("@/features/jobs/services");
    const ownedJobs = await listJobs({
      accountManagerId: amScopeId,
      includeArchived: true,
    });
    allowedJobIds = new Set(ownedJobs.map((job) => job.id));
  }

  const dismissed = await getDismissedNotificationIds();
  const candidatesBase =
    input.role === "partner"
      ? "/partner/candidates"
      : input.role === "account_manager"
        ? "/account-manager/candidates"
        : "/admin/candidates";

  const items: Notification[] = [];
  for (const record of records) {
    try {
      const submission = mapSubmissionRecord({
        id: record.id,
        fields: record.fields as AirtableFields,
      });
      if (input.partnerId && submission.partnerId !== input.partnerId) {
        continue;
      }
      if (allowedJobIds && !allowedJobIds.has(submission.jobId)) {
        continue;
      }
      const name =
        asString(record.fields[CANDIDATES_TABLE_FIELDS.fullName]) ??
        "Candidate";
      const id = `derived_notif_${record.id}`;
      items.push({
        id,
        notificationCode: null,
        recipientUserId: input.recipientUserId,
        title: `Candidate update: ${name}`,
        description: `Status is now ${submission.status}`,
        type: "candidate",
        priority: "medium",
        category: "candidates",
        entityType: "submission",
        entityId: submission.id,
        actionUrl: `${candidatesBase}?submissionId=${encodeURIComponent(submission.id)}`,
        readStatus: dismissed.has(id) ? "read" : "unread",
        createdAt: submission.submissionDate,
        readAt: null,
        archived: false,
        metadata: null,
        activityId: null,
      });
    } catch {
      // skip
    }
  }

  try {
    const claimItems = await deriveClaimNotificationsForViewer({
      recipientUserId: input.recipientUserId,
      partnerId: input.partnerId,
      accountManagerId: amScopeId,
      role: input.role,
      allowedJobIds,
      dismissed,
    });
    items.push(...claimItems);
  } catch (error) {
    console.error("[notifications] claim derive failed", error);
  }

  items.sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );
  return items;
}

async function deriveClaimNotificationsForViewer(input: {
  recipientUserId: string;
  partnerId?: string | null;
  accountManagerId?: string | null;
  role?: string | null;
  allowedJobIds: Set<string> | null;
  dismissed: Set<string>;
}): Promise<Notification[]> {
  const { listAllJobClaims, listJobClaimsForPartner } = await import(
    "@/features/job-claims/repositories/job-claims.repository"
  );

  const claims = input.partnerId
    ? await listJobClaimsForPartner(input.partnerId)
    : await listAllJobClaims();

  const jobLabelById = new Map<string, string>();
  const partnerLabelById = new Map<string, string>();
  const jobIds = [...new Set(claims.map((claim) => claim.jobId))];
  const partnerIds = [...new Set(claims.map((claim) => claim.partnerId))];
  if (jobIds.length > 0) {
    try {
      const { listJobsByIds } = await import("@/features/jobs/services");
      const jobs = await listJobsByIds(jobIds);
      for (const job of jobs) {
        jobLabelById.set(job.id, job.jobCode?.trim() || job.title);
      }
    } catch (error) {
      console.error("[notifications] claim job labels failed", error);
    }
  }
  if (partnerIds.length > 0) {
    try {
      const { getPartnerById } = await import("@/features/partners/services");
      const { operationalPartnerLabel } = await import(
        "@/features/partners/services/partner-privacy"
      );
      const partners = await Promise.all(
        partnerIds.map((id) => getPartnerById(id)),
      );
      for (const partner of partners) {
        if (partner) {
          partnerLabelById.set(partner.id, operationalPartnerLabel(partner));
        }
      }
    } catch (error) {
      console.error("[notifications] claim partner labels failed", error);
    }
  }

  const isPartner = input.role === "partner";
  const isAm = input.role === "account_manager";
  const claimsBase = isPartner
    ? "/partner/available-jobs"
    : isAm
      ? "/account-manager/job-claims"
      : "/admin/job-claims";

  const items: Notification[] = [];
  for (const claim of claims) {
    const jobLabel = jobLabelById.get(claim.jobId) || "a job";
    const partnerLabel =
      partnerLabelById.get(claim.partnerId) || "A Talent Partner";
    if (isPartner && claim.partnerId !== input.partnerId) {
      continue;
    }
    if (isAm) {
      const ownsJob = input.allowedJobIds?.has(claim.jobId) ?? false;
      const assignedAm = claim.accountManagerId === input.accountManagerId;
      if (!ownsJob && !assignedAm) {
        continue;
      }
    }

    const id = `derived_claim_${claim.id}_${claim.status}`;
    const createdAt =
      claim.status === "pending"
        ? claim.requestedAt
        : (claim.reviewedAt ?? claim.rejectedAt ?? claim.requestedAt);

    if (isPartner) {
      if (claim.status === "approved") {
        items.push({
          id,
          notificationCode: null,
          recipientUserId: input.recipientUserId,
          title: "Job claim approved",
          description: `Your claim for ${jobLabel} was approved. The job is now in Assigned Jobs.`,
          type: "approval",
          priority: "high",
          category: "jobs",
          entityType: "allocation",
          entityId: claim.id,
          actionUrl: "/partner/jobs",
          readStatus: input.dismissed.has(id) ? "read" : "unread",
          createdAt,
          readAt: null,
          archived: false,
          metadata: null,
          activityId: null,
        });
      } else if (claim.status === "rejected") {
        items.push({
          id,
          notificationCode: null,
          recipientUserId: input.recipientUserId,
          title: "Job claim not approved",
          description: claim.rejectionReason
            ? `Your claim for ${jobLabel} was not approved. ${claim.rejectionReason}`
            : `Your claim for ${jobLabel} was not approved.`,
          type: "rejected",
          priority: "high",
          category: "jobs",
          entityType: "allocation",
          entityId: claim.id,
          actionUrl: "/partner/available-jobs",
          readStatus: input.dismissed.has(id) ? "read" : "unread",
          createdAt,
          readAt: null,
          archived: false,
          metadata: null,
          activityId: null,
        });
      }
      continue;
    }

    if (claim.status !== "pending") {
      continue;
    }
    items.push({
      id,
      notificationCode: null,
      recipientUserId: input.recipientUserId,
      title: "New job claim request",
      description: `${partnerLabel} requested ${jobLabel}.`,
      type: "allocation",
      priority: "high",
      category: "jobs",
      entityType: "allocation",
      entityId: claim.id,
      actionUrl: claimsBase,
      readStatus: input.dismissed.has(id) ? "read" : "unread",
      createdAt,
      readAt: null,
      archived: false,
      metadata: null,
      activityId: null,
    });
  }

  return items.slice(0, 20);
}
