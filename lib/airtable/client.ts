import Airtable from "airtable";

import { getRequiredEnv } from "@/lib/api/env";
import { AirtableOperationError } from "@/lib/airtable/errors";

export type AirtableFields = Airtable.FieldSet;

export interface AirtableListOptions {
  filterByFormula?: string;
  maxRecords?: number;
  pageSize?: number;
  sort?: Array<{ field: string; direction?: "asc" | "desc" }>;
  view?: string;
  fields?: string[];
}

function getBase() {
  const apiKey = getRequiredEnv("AIRTABLE_API_KEY");
  const baseId = getRequiredEnv("AIRTABLE_BASE_ID");

  return new Airtable({ apiKey }).base(baseId);
}

function getTable(tableName: string) {
  return getBase()(tableName);
}

function wrapAirtableError(
  operation: string,
  tableName: string,
  error: unknown,
): never {
  const detail =
    error instanceof Error ? error.message : "Unknown Airtable error";
  const sanitized = detail
    .replace(/\n[\s\S]*$/, "")
    .replace(/^Error:\s*/i, "")
    .slice(0, 240);
  throw new AirtableOperationError(
    `Unable to ${operation} records in ${tableName}. ${sanitized}`,
    error,
  );
}

export async function getRecords<T extends AirtableFields = AirtableFields>(
  tableName: string,
  options: AirtableListOptions = {},
): Promise<Airtable.Records<T>> {
  try {
    const table = getTable(tableName);
    const records = await table.select(options).all();
    return records as unknown as Airtable.Records<T>;
  } catch (error) {
    wrapAirtableError("list", tableName, error);
  }
}

export async function findRecord<T extends AirtableFields = AirtableFields>(
  tableName: string,
  recordId: string,
): Promise<Airtable.Record<T>> {
  try {
    const table = getTable(tableName);
    const record = await table.find(recordId);
    return record as unknown as Airtable.Record<T>;
  } catch (error) {
    wrapAirtableError("find", tableName, error);
  }
}

export async function createRecord<T extends AirtableFields = AirtableFields>(
  tableName: string,
  fields: Partial<T>,
): Promise<Airtable.Record<T>> {
  try {
    const table = getTable(tableName);
    const record = await table.create(fields);
    return record as unknown as Airtable.Record<T>;
  } catch (error) {
    wrapAirtableError("create", tableName, error);
  }
}

export async function updateRecord<T extends AirtableFields = AirtableFields>(
  tableName: string,
  recordId: string,
  fields: Partial<T>,
): Promise<Airtable.Record<T>> {
  try {
    const table = getTable(tableName);
    const record = await table.update(recordId, fields);
    return record as unknown as Airtable.Record<T>;
  } catch (error) {
    wrapAirtableError("update", tableName, error);
  }
}

export async function deleteRecord(
  tableName: string,
  recordId: string,
): Promise<Airtable.Record<AirtableFields>> {
  try {
    const table = getTable(tableName);
    return await table.destroy(recordId);
  } catch (error) {
    wrapAirtableError("delete", tableName, error);
  }
}
