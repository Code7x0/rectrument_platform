import { getOptionalEnv } from "@/lib/api/env";
import type { AirtableFields } from "@/lib/airtable/client";

/**
 * Schema compatibility mode for the client's Partner Relationship Manager base.
 * - `client` — field names / adapters match the live client Airtable
 * - `app` — original normalized app schema (Users, Allocations, Submissions tables)
 */
export type AirtableCompatMode = "client" | "app";

export function getAirtableCompatMode(): AirtableCompatMode {
  const raw = getOptionalEnv("AIRTABLE_COMPAT_MODE")?.trim().toLowerCase();
  return raw === "app" ? "app" : "client";
}

export function isClientCompatMode(): boolean {
  return getAirtableCompatMode() === "client";
}

/**
 * Allocations persistence strategy.
 * - `table` — dedicated Allocations table (app schema)
 * - `job_partners` — synthesize from Jobs.Partners multi-link (client schema)
 */
export type AllocationsMode = "table" | "job_partners";

export function getAllocationsMode(): AllocationsMode {
  const raw = getOptionalEnv("AIRTABLE_ALLOCATIONS_MODE")?.trim().toLowerCase();
  if (raw === "table") {
    return "table";
  }
  if (raw === "job_partners") {
    return "job_partners";
  }
  return isClientCompatMode() ? "job_partners" : "table";
}

/**
 * Submissions persistence strategy.
 * - `table` — dedicated Submissions table
 * - `candidates` — client Candidates rows are submission events (person + job + partner)
 */
export type SubmissionsMode = "table" | "candidates";

export function getSubmissionsMode(): SubmissionsMode {
  const raw = getOptionalEnv("AIRTABLE_SUBMISSIONS_MODE")?.trim().toLowerCase();
  if (raw === "table") {
    return "table";
  }
  if (raw === "candidates") {
    return "candidates";
  }
  return isClientCompatMode() ? "candidates" : "table";
}

export function readField(
  fields: AirtableFields,
  ...names: string[]
): unknown {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(fields, name)) {
      const value = fields[name];
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
  }
  return undefined;
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function asLinkedId(value: unknown): string | null {
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return null;
}

export function asLinkedIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

export function asSelectList(value: unknown): string | null {
  if (Array.isArray(value)) {
    const parts = value.filter(
      (item): item is string => typeof item === "string" && Boolean(item.trim()),
    );
    return parts.length > 0 ? parts.join(", ") : null;
  }
  return asString(value);
}

export function toSelectWriteValue(value: string): string | string[] {
  if (value.includes(",")) {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return value;
}

/** Synthetic allocation id when using Jobs.Partners adapter. */
export function buildJobPartnerAllocationId(
  jobId: string,
  partnerId: string,
): string {
  return `jp_${jobId}_${partnerId}`;
}

export function parseJobPartnerAllocationId(
  allocationId: string,
): { jobId: string; partnerId: string } | null {
  const match = /^jp_(rec[A-Za-z0-9]+)_(rec[A-Za-z0-9]+)$/.exec(allocationId);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  return { jobId: match[1], partnerId: match[2] };
}
