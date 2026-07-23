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

export async function deriveNotificationsForViewer(input: {
  recipientUserId: string;
  partnerId?: string | null;
  accountManagerId?: string | null;
  maxRecords?: number;
}): Promise<Notification[]> {
  const records = await getRecords(getAirtableTableName("candidatesTable"), {
    sort: [
      { field: SUBMISSIONS_TABLE_FIELDS.submissionDate, direction: "desc" },
    ],
    maxRecords: input.maxRecords ?? 40,
  });

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
      const name =
        asString(record.fields[CANDIDATES_TABLE_FIELDS.fullName]) ??
        "Candidate";
      items.push({
        id: `derived_notif_${record.id}`,
        notificationCode: null,
        recipientUserId: input.recipientUserId,
        title: `Candidate update: ${name}`,
        description: `Status is now ${submission.status}`,
        type: "candidate",
        priority: "medium",
        category: "candidates",
        entityType: "submission",
        entityId: submission.id,
        actionUrl: null,
        readStatus: "unread",
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
  return items;
}
