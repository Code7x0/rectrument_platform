import { getRequiredEnv } from "@/lib/api/env";
import { getAirtableTableName } from "@/lib/airtable/tables";

type MetaField = { id: string; name: string };
type MetaTable = { id: string; name: string; fields: MetaField[] };

let tablesCache: MetaTable[] | null = null;
let tablesCacheAt = 0;
const CACHE_MS = 5 * 60 * 1000;

async function listBaseTables(): Promise<MetaTable[]> {
  const now = Date.now();
  if (tablesCache && now - tablesCacheAt < CACHE_MS) {
    return tablesCache;
  }

  const apiKey = getRequiredEnv("AIRTABLE_API_KEY");
  const baseId = getRequiredEnv("AIRTABLE_BASE_ID");

  const response = await fetch(
    `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    },
  );

  if (!response.ok) {
    throw new Error("Unable to resolve Airtable field metadata for uploads");
  }

  const json = (await response.json()) as { tables: MetaTable[] };
  tablesCache = json.tables;
  tablesCacheAt = now;
  return tablesCache;
}

/**
 * Resolve Airtable field id from table env key + field display name.
 * Required by Content API attachment uploads.
 */
export async function resolveAirtableFieldId(
  tableEnvKey: "candidatesTable" | "documentsTable",
  fieldName: string,
): Promise<string> {
  const tableName = getAirtableTableName(tableEnvKey);
  const tables = await listBaseTables();
  const table = tables.find((t) => t.name === tableName);
  if (!table) {
    throw new Error(`Airtable table not found for uploads: ${tableName}`);
  }

  const field = table.fields.find((f) => f.name === fieldName);
  if (!field) {
    throw new Error(`Airtable field not found: ${fieldName} on ${tableName}`);
  }

  return field.id;
}
