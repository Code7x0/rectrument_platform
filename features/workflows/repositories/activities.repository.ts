import {
  createRecord,
  getRecords,
  type AirtableFields,
  type AirtableListOptions,
} from "@/lib/airtable/client";
import { getOptionalAirtableTableName } from "@/lib/airtable/tables";
import { mapActivityRecord } from "@/features/workflows/services/activities.mapper";
import { deriveActivitiesFromCandidates } from "@/features/workflows/services/activities.derived";
import type { Activity } from "@/features/workflows/types";
import { ACTIVITIES_TABLE_FIELDS } from "@/lib/airtable/fields";

function getTableName(): string | null {
  return getOptionalAirtableTableName("activitiesTable");
}

export function isActivitiesStorageAvailable(): boolean {
  return getTableName() !== null;
}

export async function findActivities(
  options: AirtableListOptions = {},
): Promise<Activity[]> {
  const table = getTableName();
  if (!table) {
    try {
      const derived = await deriveActivitiesFromCandidates(
        options.maxRecords ?? 200,
      );
      const formula = options.filterByFormula ?? "";
      if (formula.includes("Entity ID")) {
        const idMatch = /\{Entity ID\} = '(rec[A-Za-z0-9]+)'/.exec(formula);
        if (idMatch?.[1]) {
          return derived.filter((row) => row.entityId === idMatch[1]);
        }
      }
      return derived;
    } catch (error) {
      console.error("Failed to derive activities", error);
      return [];
    }
  }
  try {
    const records = await getRecords(table, options);
    return records.map((record) =>
      mapActivityRecord({
        id: record.id,
        fields: record.fields as AirtableFields,
      }),
    );
  } catch (error) {
    console.error("Failed to list activities", error);
    return [];
  }
}

export async function insertActivity(
  fields: AirtableFields,
): Promise<Activity | null> {
  const table = getTableName();
  if (!table) {
    // Status already lives on Candidates — no separate audit row to write.
    return null;
  }
  try {
    const record = await createRecord(table, fields);
    return mapActivityRecord({
      id: record.id,
      fields: record.fields as AirtableFields,
    });
  } catch (error) {
    console.error("Failed to insert activity", error);
    return null;
  }
}

export function buildActivitiesByEntityFormula(
  entityType: string,
  entityId: string,
): string {
  const escapedId = entityId.replace(/'/g, "\\'");
  return `AND({${ACTIVITIES_TABLE_FIELDS.entityType}} = '${entityType}', {${ACTIVITIES_TABLE_FIELDS.entityId}} = '${escapedId}')`;
}
