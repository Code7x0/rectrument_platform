import {
  buildActivitiesByEntityFormula,
  findActivities,
  insertActivity,
} from "@/features/workflows/repositories/activities.repository";
import { toAirtableActivityFields } from "@/features/workflows/services/activities.mapper";
import type {
  Activity,
  ActivityAction,
  ActivityEntityType,
  CreateActivityInput,
} from "@/features/workflows/types";
import { ACTIVITIES_TABLE_FIELDS } from "@/lib/airtable/fields";

/**
 * Persist an activity when Activities storage is configured.
 * Returns null when the client base has no Activities table.
 */
export async function recordActivity(
  input: CreateActivityInput,
): Promise<Activity | null> {
  return insertActivity(toAirtableActivityFields(input));
}

/**
 * Future Activity Timeline: list history for an entity.
 */
export async function listActivitiesForEntity(
  entityType: CreateActivityInput["entityType"],
  entityId: string,
): Promise<Activity[]> {
  const formula = buildActivitiesByEntityFormula(entityType, entityId);
  return findActivities({
    filterByFormula: formula,
    sort: [{ field: ACTIVITIES_TABLE_FIELDS.createdAt, direction: "desc" }],
  });
}

/**
 * Recent activity feed for dashboards (newest first).
 */
export async function listRecentActivities(
  limit = 10,
  options: {
    entityTypes?: ActivityEntityType[];
    actions?: ActivityAction[];
  } = {},
): Promise<Activity[]> {
  const rows = await findActivities({
    sort: [{ field: ACTIVITIES_TABLE_FIELDS.createdAt, direction: "desc" }],
    maxRecords: Math.max(limit * 3, 30),
  });

  let filtered = rows;
  if (options.entityTypes?.length) {
    const allowed = new Set(options.entityTypes);
    filtered = filtered.filter((row) => allowed.has(row.entityType));
  }
  if (options.actions?.length) {
    const allowed = new Set(options.actions);
    filtered = filtered.filter((row) => allowed.has(row.action));
  }

  return filtered.slice(0, limit);
}

/**
 * Broad activity list for Activity Timeline (UI aggregation).
 * Prefer entity-scoped helpers when a single entity is known.
 */
export async function listActivities(
  options: {
    maxRecords?: number;
    entityType?: ActivityEntityType;
    entityId?: string;
    entityTypes?: ActivityEntityType[];
    actions?: ActivityAction[];
  } = {},
): Promise<Activity[]> {
  const formula =
    options.entityType && options.entityId
      ? buildActivitiesByEntityFormula(options.entityType, options.entityId)
      : undefined;

  const rows = await findActivities({
    ...(formula ? { filterByFormula: formula } : {}),
    sort: [{ field: ACTIVITIES_TABLE_FIELDS.createdAt, direction: "desc" }],
    maxRecords: options.maxRecords ?? 200,
  });

  let filtered = rows;
  if (options.entityTypes?.length) {
    const allowed = new Set(options.entityTypes);
    filtered = filtered.filter((row) => allowed.has(row.entityType));
  }
  if (options.actions?.length) {
    const allowed = new Set(options.actions);
    filtered = filtered.filter((row) => allowed.has(row.action));
  }

  return filtered;
}
