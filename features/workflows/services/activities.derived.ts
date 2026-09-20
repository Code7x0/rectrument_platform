/**
 * Derive Activity timeline items from Candidates submission dates/statuses.
 * Locked schema has no Activities table.
 */

import { getRecords, type AirtableFields } from "@/lib/airtable/client";
import { asString } from "@/lib/airtable/compat";
import {
  CANDIDATES_TABLE_FIELDS,
  DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE,
  SUBMISSIONS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import { readAirtableRecordLastModified } from "@/lib/airtable/record-meta";
import { getAirtableTableName } from "@/lib/airtable/tables";
import { mapSubmissionRecord } from "@/features/submissions/services/submissions.mapper";
import type { Activity } from "@/features/workflows/types";

function exactStatusLabel(
  submission: ReturnType<typeof mapSubmissionRecord>,
): string {
  return (
    submission.airtableStatus?.trim() ||
    DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE[submission.status]?.trim() ||
    submission.status
  );
}

export async function deriveActivitiesFromCandidates(
  maxRecords = 200,
): Promise<Activity[]> {
  const records = await getRecords(getAirtableTableName("candidatesTable"), {
    sort: [
      { field: SUBMISSIONS_TABLE_FIELDS.submissionDate, direction: "desc" },
    ],
    maxRecords,
  });

  const activities: Activity[] = [];
  for (const record of records) {
    try {
      const submission = mapSubmissionRecord({
        id: record.id,
        fields: record.fields as AirtableFields,
        lastModifiedTime: readAirtableRecordLastModified(record),
      });
      const statusLabel = exactStatusLabel(submission);
      const touchedAt =
        submission.updatedAt ??
        submission.submissionDate ??
        readAirtableRecordLastModified(record);
      activities.push({
        id: `derived_act_${record.id}`,
        entityType: "submission",
        entityId: submission.id,
        action: "status_change",
        fromStatus: null,
        toStatus: submission.status,
        actorUserId: null,
        note: statusLabel,
        createdAt: touchedAt,
      });
    } catch {
      // skip incomplete rows
    }
  }
  return activities;
}

/**
 * Job claim events recorded in the Job Claims table (not fabricated).
 */
export async function deriveActivitiesFromJobClaims(
  maxRecords = 80,
): Promise<Activity[]> {
  const { listAllJobClaims } = await import(
    "@/features/job-claims/repositories/job-claims.repository"
  );
  const claims = await listAllJobClaims();
  const sorted = [...claims].sort((a, b) =>
    (b.reviewedAt ?? b.requestedAt).localeCompare(
      a.reviewedAt ?? a.requestedAt,
    ),
  );

  return sorted.slice(0, maxRecords).map((claim) => {
    const statusLabel =
      claim.status === "pending"
        ? "Claim requested"
        : claim.status === "approved"
          ? "Claim approved"
          : "Claim rejected";
    return {
      id: `derived_act_claim_${claim.id}_${claim.status}`,
      entityType: "job" as const,
      entityId: claim.jobId,
      action: "status_change" as const,
      fromStatus: null,
      toStatus: claim.status,
      actorUserId: claim.reviewedByUserId,
      note: statusLabel,
      createdAt:
        claim.status === "pending"
          ? claim.requestedAt
          : (claim.reviewedAt ?? claim.rejectedAt ?? claim.requestedAt),
    };
  });
}
