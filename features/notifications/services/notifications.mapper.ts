import type { AirtableFields } from "@/lib/airtable/client";
import {
  AIRTABLE_NOTIFICATION_CATEGORY,
  AIRTABLE_NOTIFICATION_CHANNEL,
  AIRTABLE_NOTIFICATION_PRIORITY,
  AIRTABLE_NOTIFICATION_READ,
  AIRTABLE_NOTIFICATION_TYPE,
  DOMAIN_NOTIFICATION_CATEGORY_TO_AIRTABLE,
  DOMAIN_NOTIFICATION_CHANNEL_TO_AIRTABLE,
  DOMAIN_NOTIFICATION_PRIORITY_TO_AIRTABLE,
  DOMAIN_NOTIFICATION_READ_TO_AIRTABLE,
  DOMAIN_NOTIFICATION_TYPE_TO_AIRTABLE,
  NOTIFICATION_PREFERENCES_TABLE_FIELDS,
  NOTIFICATIONS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import type {
  CreateNotificationInput,
  Notification,
  NotificationCategory,
  NotificationChannel,
  NotificationPreferences,
  NotificationPriority,
  NotificationReadStatus,
  NotificationType,
  UpdateNotificationPreferencesInput,
} from "@/features/notifications/types";
import {
  ALL_NOTIFICATION_CATEGORIES,
  DEFAULT_CATEGORY_CHANNELS,
} from "@/features/notifications/types";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asLinkedId(value: unknown): string | null {
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return null;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === 1;
}

function parseMetadata(value: unknown): Record<string, string> | null {
  const raw = asString(value);
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const result: Record<string, string> = {};
    for (const [key, entry] of Object.entries(parsed)) {
      if (typeof entry === "string") {
        result[key] = entry;
      }
    }
    return result;
  } catch {
    return null;
  }
}

function mapType(value: unknown): NotificationType {
  const raw = asString(value);
  if (!raw) {
    return "system";
  }
  return (
    AIRTABLE_NOTIFICATION_TYPE[raw as keyof typeof AIRTABLE_NOTIFICATION_TYPE] ??
    "system"
  );
}

function mapPriority(value: unknown): NotificationPriority {
  const raw = asString(value);
  if (!raw) {
    return "medium";
  }
  return (
    AIRTABLE_NOTIFICATION_PRIORITY[
      raw as keyof typeof AIRTABLE_NOTIFICATION_PRIORITY
    ] ?? "medium"
  );
}

function mapReadStatus(value: unknown): NotificationReadStatus {
  const raw = asString(value);
  if (!raw) {
    return "unread";
  }
  return (
    AIRTABLE_NOTIFICATION_READ[raw as keyof typeof AIRTABLE_NOTIFICATION_READ] ??
    "unread"
  );
}

function mapCategory(value: unknown): NotificationCategory {
  const raw = asString(value);
  if (!raw) {
    return "system";
  }
  return (
    AIRTABLE_NOTIFICATION_CATEGORY[
      raw as keyof typeof AIRTABLE_NOTIFICATION_CATEGORY
    ] ?? "system"
  );
}

function mapChannel(value: unknown): NotificationChannel {
  const raw = asString(value);
  if (!raw) {
    return "both";
  }
  return (
    AIRTABLE_NOTIFICATION_CHANNEL[
      raw as keyof typeof AIRTABLE_NOTIFICATION_CHANNEL
    ] ?? "both"
  );
}

function parseCategoryChannels(
  value: unknown,
): Record<NotificationCategory, NotificationChannel> {
  const base = { ...DEFAULT_CATEGORY_CHANNELS };
  const raw = asString(value);
  if (!raw) {
    return base;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return base;
    }
    for (const category of ALL_NOTIFICATION_CATEGORIES) {
      const channel = (parsed as Record<string, unknown>)[category];
      if (
        channel === "in_app" ||
        channel === "email" ||
        channel === "both" ||
        channel === "none"
      ) {
        base[category] = channel;
      }
    }
    return base;
  } catch {
    return base;
  }
}

export function mapNotificationRecord(record: {
  id: string;
  fields: AirtableFields;
}): Notification {
  const fields = record.fields;
  return {
    id: record.id,
    notificationCode: asString(fields[NOTIFICATIONS_TABLE_FIELDS.notificationId]),
    recipientUserId:
      asLinkedId(fields[NOTIFICATIONS_TABLE_FIELDS.recipient]) ?? "",
    title: asString(fields[NOTIFICATIONS_TABLE_FIELDS.title]) ?? "Notification",
    description: asString(fields[NOTIFICATIONS_TABLE_FIELDS.description]),
    type: mapType(fields[NOTIFICATIONS_TABLE_FIELDS.type]),
    priority: mapPriority(fields[NOTIFICATIONS_TABLE_FIELDS.priority]),
    category: mapCategory(fields[NOTIFICATIONS_TABLE_FIELDS.category]),
    entityType: asString(
      fields[NOTIFICATIONS_TABLE_FIELDS.entityType],
    ) as Notification["entityType"],
    entityId: asString(fields[NOTIFICATIONS_TABLE_FIELDS.entityId]),
    actionUrl: asString(fields[NOTIFICATIONS_TABLE_FIELDS.actionUrl]),
    readStatus: mapReadStatus(fields[NOTIFICATIONS_TABLE_FIELDS.readStatus]),
    createdAt: asString(fields[NOTIFICATIONS_TABLE_FIELDS.createdAt]),
    readAt: asString(fields[NOTIFICATIONS_TABLE_FIELDS.readAt]),
    archived: asBoolean(fields[NOTIFICATIONS_TABLE_FIELDS.archived]),
    metadata: parseMetadata(fields[NOTIFICATIONS_TABLE_FIELDS.metadata]),
    activityId: asString(fields[NOTIFICATIONS_TABLE_FIELDS.activityId]),
  };
}

export function toAirtableNotificationFields(
  input: CreateNotificationInput,
): AirtableFields {
  const fields: AirtableFields = {
    [NOTIFICATIONS_TABLE_FIELDS.recipient]: [input.recipientUserId],
    [NOTIFICATIONS_TABLE_FIELDS.title]: input.title,
    [NOTIFICATIONS_TABLE_FIELDS.type]:
      DOMAIN_NOTIFICATION_TYPE_TO_AIRTABLE[input.type],
    [NOTIFICATIONS_TABLE_FIELDS.priority]:
      DOMAIN_NOTIFICATION_PRIORITY_TO_AIRTABLE[input.priority ?? "medium"],
    [NOTIFICATIONS_TABLE_FIELDS.category]:
      DOMAIN_NOTIFICATION_CATEGORY_TO_AIRTABLE[input.category],
    [NOTIFICATIONS_TABLE_FIELDS.readStatus]:
      DOMAIN_NOTIFICATION_READ_TO_AIRTABLE.unread,
    [NOTIFICATIONS_TABLE_FIELDS.archived]: false,
    [NOTIFICATIONS_TABLE_FIELDS.createdAt]: new Date().toISOString(),
  };

  if (input.description) {
    fields[NOTIFICATIONS_TABLE_FIELDS.description] = input.description;
  }
  if (input.entityType) {
    fields[NOTIFICATIONS_TABLE_FIELDS.entityType] = input.entityType;
  }
  if (input.entityId) {
    fields[NOTIFICATIONS_TABLE_FIELDS.entityId] = input.entityId;
  }
  if (input.actionUrl) {
    fields[NOTIFICATIONS_TABLE_FIELDS.actionUrl] = input.actionUrl;
  }
  if (input.metadata) {
    fields[NOTIFICATIONS_TABLE_FIELDS.metadata] = JSON.stringify(input.metadata);
  }
  if (input.activityId) {
    fields[NOTIFICATIONS_TABLE_FIELDS.activityId] = input.activityId;
  }

  return fields;
}

export function mapPreferencesRecord(record: {
  id: string;
  fields: AirtableFields;
}): NotificationPreferences {
  const fields = record.fields;
  return {
    id: record.id,
    userId: asLinkedId(fields[NOTIFICATION_PREFERENCES_TABLE_FIELDS.user]) ?? "",
    defaultChannel: mapChannel(
      fields[NOTIFICATION_PREFERENCES_TABLE_FIELDS.defaultChannel],
    ),
    categories: parseCategoryChannels(
      fields[NOTIFICATION_PREFERENCES_TABLE_FIELDS.categoryChannels],
    ),
    updatedAt: asString(
      fields[NOTIFICATION_PREFERENCES_TABLE_FIELDS.updatedAt],
    ),
  };
}

export function toAirtablePreferencesFields(
  userId: string,
  input: UpdateNotificationPreferencesInput,
  existing?: NotificationPreferences,
): AirtableFields {
  const categories = {
    ...(existing?.categories ?? DEFAULT_CATEGORY_CHANNELS),
    ...input.categories,
  };

  return {
    [NOTIFICATION_PREFERENCES_TABLE_FIELDS.user]: [userId],
    [NOTIFICATION_PREFERENCES_TABLE_FIELDS.defaultChannel]:
      DOMAIN_NOTIFICATION_CHANNEL_TO_AIRTABLE[
        input.defaultChannel ?? existing?.defaultChannel ?? "both"
      ],
    [NOTIFICATION_PREFERENCES_TABLE_FIELDS.categoryChannels]:
      JSON.stringify(categories),
    [NOTIFICATION_PREFERENCES_TABLE_FIELDS.updatedAt]: new Date().toISOString(),
  };
}

export function buildNotificationsFilterFormula(filters: {
  recipientUserId: string;
  readStatus?: NotificationReadStatus | "all";
  archived?: boolean | "all";
  type?: NotificationType | "all";
  category?: NotificationCategory | "all";
  priority?: NotificationPriority | "all";
}): string {
  const clauses: string[] = [
    `FIND('${filters.recipientUserId.replace(/'/g, "\\'")}', ARRAYJOIN({${NOTIFICATIONS_TABLE_FIELDS.recipient}}))`,
  ];

  if (filters.readStatus && filters.readStatus !== "all") {
    clauses.push(
      `{${NOTIFICATIONS_TABLE_FIELDS.readStatus}} = '${DOMAIN_NOTIFICATION_READ_TO_AIRTABLE[filters.readStatus]}'`,
    );
  }

  if (filters.archived === true) {
    clauses.push(`{${NOTIFICATIONS_TABLE_FIELDS.archived}} = TRUE()`);
  } else if (filters.archived === false || filters.archived === undefined) {
    clauses.push(
      `OR({${NOTIFICATIONS_TABLE_FIELDS.archived}} = FALSE(), {${NOTIFICATIONS_TABLE_FIELDS.archived}} = BLANK())`,
    );
  }

  if (filters.type && filters.type !== "all") {
    clauses.push(
      `{${NOTIFICATIONS_TABLE_FIELDS.type}} = '${DOMAIN_NOTIFICATION_TYPE_TO_AIRTABLE[filters.type]}'`,
    );
  }

  if (filters.category && filters.category !== "all") {
    clauses.push(
      `{${NOTIFICATIONS_TABLE_FIELDS.category}} = '${DOMAIN_NOTIFICATION_CATEGORY_TO_AIRTABLE[filters.category]}'`,
    );
  }

  if (filters.priority && filters.priority !== "all") {
    clauses.push(
      `{${NOTIFICATIONS_TABLE_FIELDS.priority}} = '${DOMAIN_NOTIFICATION_PRIORITY_TO_AIRTABLE[filters.priority]}'`,
    );
  }

  if (clauses.length === 1) {
    return clauses[0] ?? "";
  }
  return `AND(${clauses.join(",")})`;
}
