import {
  createRecord,
  findRecord,
  getRecords,
  updateRecord,
  type AirtableFields,
  type AirtableListOptions,
} from "@/lib/airtable/client";
import { AirtableStorageUnavailableError } from "@/lib/airtable/errors";
import { NOTIFICATION_PREFERENCES_TABLE_FIELDS } from "@/lib/airtable/fields";
import { getOptionalAirtableTableName } from "@/lib/airtable/tables";
import {
  mapNotificationRecord,
  mapPreferencesRecord,
} from "@/features/notifications/services/notifications.mapper";
import type {
  Notification,
  NotificationPreferences,
} from "@/features/notifications/types";

function getNotificationsTable(): string | null {
  return getOptionalAirtableTableName("notificationsTable");
}

function getPreferencesTable(): string | null {
  return getOptionalAirtableTableName("notificationPreferencesTable");
}

export function isNotificationsStorageAvailable(): boolean {
  return getNotificationsTable() !== null;
}

export async function findNotifications(
  options: AirtableListOptions = {},
): Promise<Notification[]> {
  const table = getNotificationsTable();
  if (!table) {
    return [];
  }
  try {
    const records = await getRecords(table, options);
    return records.map((record) =>
      mapNotificationRecord({
        id: record.id,
        fields: record.fields as AirtableFields,
      }),
    );
  } catch (error) {
    console.error("Failed to list notifications", error);
    return [];
  }
}

export async function findNotificationById(
  recordId: string,
): Promise<Notification | null> {
  const table = getNotificationsTable();
  if (!table) {
    return null;
  }
  try {
    const record = await findRecord(table, recordId);
    return mapNotificationRecord({
      id: record.id,
      fields: record.fields as AirtableFields,
    });
  } catch {
    return null;
  }
}

export async function insertNotification(
  fields: AirtableFields,
): Promise<Notification | null> {
  const table = getNotificationsTable();
  if (!table) {
    return null;
  }
  try {
    const record = await createRecord(table, fields);
    return mapNotificationRecord({
      id: record.id,
      fields: record.fields as AirtableFields,
    });
  } catch (error) {
    console.error("Failed to insert notification", error);
    return null;
  }
}

export async function patchNotification(
  recordId: string,
  fields: AirtableFields,
): Promise<Notification | null> {
  const table = getNotificationsTable();
  if (!table) {
    return null;
  }
  try {
    const record = await updateRecord(table, recordId, fields);
    return mapNotificationRecord({
      id: record.id,
      fields: record.fields as AirtableFields,
    });
  } catch (error) {
    console.error("Failed to patch notification", error);
    return null;
  }
}

export async function findPreferencesByUserId(
  userId: string,
): Promise<NotificationPreferences | null> {
  const table = getPreferencesTable();
  if (!table) {
    return null;
  }
  try {
    const records = await getRecords(table, {
      filterByFormula: `FIND('${userId.replace(/'/g, "\\'")}', ARRAYJOIN({${NOTIFICATION_PREFERENCES_TABLE_FIELDS.user}}))`,
      maxRecords: 1,
    });
    const record = records[0];
    if (!record) {
      return null;
    }
    return mapPreferencesRecord({
      id: record.id,
      fields: record.fields as AirtableFields,
    });
  } catch (error) {
    console.error("Failed to load notification preferences", error);
    return null;
  }
}

export async function insertPreferences(
  fields: AirtableFields,
): Promise<NotificationPreferences | null> {
  const table = getPreferencesTable();
  if (!table) {
    return null;
  }
  try {
    const record = await createRecord(table, fields);
    return mapPreferencesRecord({
      id: record.id,
      fields: record.fields as AirtableFields,
    });
  } catch (error) {
    console.error("Failed to insert notification preferences", error);
    return null;
  }
}

export async function patchPreferences(
  recordId: string,
  fields: AirtableFields,
): Promise<NotificationPreferences> {
  const table = getPreferencesTable();
  if (!table) {
    throw new AirtableStorageUnavailableError("notificationPreferencesTable");
  }
  const record = await updateRecord(table, recordId, fields);
  return mapPreferencesRecord({
    id: record.id,
    fields: record.fields as AirtableFields,
  });
}
