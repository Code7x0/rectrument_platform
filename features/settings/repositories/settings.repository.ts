import {
  createRecord,
  getRecords,
  updateRecord,
  type AirtableFields,
} from "@/lib/airtable/client";
import { SETTINGS_TABLE_FIELDS } from "@/lib/airtable/fields";
import { getOptionalEnv } from "@/lib/api/env";
import { AIRTABLE_ENV_KEYS } from "@/lib/constants";
import {
  mergePlatformSettings,
  PLATFORM_SETTINGS_KEY,
} from "@/features/settings/services/defaults";
import type { PlatformSettings } from "@/features/settings/types";

function getSettingsTableName(): string | null {
  return getOptionalEnv(AIRTABLE_ENV_KEYS.settingsTable) ?? null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asLinkedId(value: unknown): string | null {
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return null;
}

function parsePayload(raw: unknown): Partial<PlatformSettings> | null {
  const text = asString(raw);
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as Partial<PlatformSettings>;
  } catch {
    return null;
  }
}

export function mapSettingsRecord(record: {
  id: string;
  fields: AirtableFields;
}): PlatformSettings {
  const payload = parsePayload(record.fields[SETTINGS_TABLE_FIELDS.payload]);
  return mergePlatformSettings({
    ...payload,
    id: record.id,
    updatedAt: asString(record.fields[SETTINGS_TABLE_FIELDS.updatedAt]),
    updatedByUserId: asLinkedId(record.fields[SETTINGS_TABLE_FIELDS.updatedBy]),
  });
}

export async function findPlatformSettingsRecord(): Promise<PlatformSettings | null> {
  const table = getSettingsTableName();
  if (!table) {
    return null;
  }

  const records = await getRecords(table, {
    filterByFormula: `{${SETTINGS_TABLE_FIELDS.settingsKey}} = '${PLATFORM_SETTINGS_KEY}'`,
    maxRecords: 1,
  });
  const record = records[0];
  if (!record) {
    return null;
  }
  return mapSettingsRecord({
    id: record.id,
    fields: record.fields as AirtableFields,
  });
}

export async function insertPlatformSettings(
  settings: PlatformSettings,
  actorUserId: string | null,
): Promise<PlatformSettings> {
  const table = getSettingsTableName();
  if (!table) {
    throw new Error("AIRTABLE_SETTINGS_TABLE is not configured");
  }

  const fields: AirtableFields = {
    [SETTINGS_TABLE_FIELDS.settingsKey]: PLATFORM_SETTINGS_KEY,
    [SETTINGS_TABLE_FIELDS.payload]: JSON.stringify({
      company: settings.company,
      users: settings.users,
      recruitment: settings.recruitment,
      payouts: settings.payouts,
      notifications: settings.notifications,
    }),
    [SETTINGS_TABLE_FIELDS.updatedAt]: new Date().toISOString(),
  };
  if (actorUserId) {
    fields[SETTINGS_TABLE_FIELDS.updatedBy] = [actorUserId];
  }

  const record = await createRecord(table, fields);
  return mapSettingsRecord({
    id: record.id,
    fields: record.fields as AirtableFields,
  });
}

export async function patchPlatformSettings(
  recordId: string,
  settings: PlatformSettings,
  actorUserId: string | null,
): Promise<PlatformSettings> {
  const table = getSettingsTableName();
  if (!table) {
    throw new Error("AIRTABLE_SETTINGS_TABLE is not configured");
  }

  const fields: AirtableFields = {
    [SETTINGS_TABLE_FIELDS.payload]: JSON.stringify({
      company: settings.company,
      users: settings.users,
      recruitment: settings.recruitment,
      payouts: settings.payouts,
      notifications: settings.notifications,
    }),
    [SETTINGS_TABLE_FIELDS.updatedAt]: new Date().toISOString(),
  };
  if (actorUserId) {
    fields[SETTINGS_TABLE_FIELDS.updatedBy] = [actorUserId];
  }

  const record = await updateRecord(table, recordId, fields);
  return mapSettingsRecord({
    id: record.id,
    fields: record.fields as AirtableFields,
  });
}

export function isSettingsTableConfigured(): boolean {
  return Boolean(getSettingsTableName());
}
