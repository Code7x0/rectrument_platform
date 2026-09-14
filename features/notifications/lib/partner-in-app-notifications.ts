import { randomUUID } from "crypto";

import { findRecord, updateRecord, type AirtableFields } from "@/lib/airtable/client";
import { asString } from "@/lib/airtable/compat";
import {
  appendPartnerNotifMarker,
  parsePartnerNotifMarkers,
  type PartnerNotifMarker,
} from "@/lib/airtable/field-markers";
import { PARTNERS_TABLE_FIELDS } from "@/lib/airtable/fields";
import { getAirtableTableName } from "@/lib/airtable/tables";
import type {
  Notification,
  NotificationCategory,
  NotificationEntityType,
  NotificationType,
} from "@/features/notifications/types";

function mapMarkerType(type: string): NotificationType {
  if (type === "job") {
    return "job";
  }
  if (type === "candidate") {
    return "candidate";
  }
  return "system";
}

function mapMarkerEntityType(
  value: string | null,
): NotificationEntityType | null {
  if (
    value === "user" ||
    value === "partner" ||
    value === "client" ||
    value === "job" ||
    value === "allocation" ||
    value === "submission" ||
    value === "candidate" ||
    value === "partner_document" ||
    value === "payout" ||
    value === "system"
  ) {
    return value;
  }
  return null;
}

export async function persistPartnerInAppNotification(
  partnerId: string,
  input: {
    type: string;
    title: string;
    description: string;
    entityType?: string | null;
    entityId?: string | null;
    actionUrl: string;
    priority?: Notification["priority"];
    category?: Notification["category"];
  },
): Promise<void> {
  const id = partnerId.trim();
  if (!id) {
    return;
  }

  try {
    const table = getAirtableTableName("partnersTable");
    const partner = await findRecord(table, id);
    const existingNotes = asString(
      partner.fields[PARTNERS_TABLE_FIELDS.notes],
    );
    const marker: PartnerNotifMarker = {
      id: `pn_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
      at: new Date().toISOString(),
      type: input.type,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      title: input.title.trim(),
      description: input.description.trim(),
      actionUrl: input.actionUrl.trim() || "/partner",
    };
    await updateRecord(table, id, {
      [PARTNERS_TABLE_FIELDS.notes]: appendPartnerNotifMarker(
        existingNotes,
        marker,
      ),
    } as AirtableFields);
  } catch (error) {
    console.error("[notifications] partner in-app marker write failed", error);
  }
}

export async function loadPartnerInAppNotifications(
  partnerId: string,
  recipientUserId: string,
  dismissed: Set<string>,
  maxRecords = 40,
): Promise<Notification[]> {
  const id = partnerId.trim();
  if (!id) {
    return [];
  }

  try {
    const table = getAirtableTableName("partnersTable");
    const partner = await findRecord(table, id);
    const notes = asString(partner.fields[PARTNERS_TABLE_FIELDS.notes]);
    const markers = parsePartnerNotifMarkers(notes)
      .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""))
      .slice(0, maxRecords);

    return markers.map((marker): Notification => {
      const notificationId = `partner_notif_${marker.id}`;
      const category: NotificationCategory =
        marker.type === "job" || marker.type === "client"
          ? "jobs"
          : marker.type === "candidate"
            ? "candidates"
            : "system";
      return {
        id: notificationId,
        notificationCode: null,
        recipientUserId,
        title: marker.title,
        description: marker.description,
        type: mapMarkerType(marker.type),
        priority: "medium",
        category,
        entityType: mapMarkerEntityType(marker.entityType),
        entityId: marker.entityId,
        actionUrl: marker.actionUrl,
        readStatus: dismissed.has(notificationId) ? "read" : "unread",
        createdAt: marker.at,
        readAt: null,
        archived: false,
        metadata: null,
        activityId: null,
      };
    });
  } catch (error) {
    console.error("[notifications] partner in-app marker read failed", error);
    return [];
  }
}
