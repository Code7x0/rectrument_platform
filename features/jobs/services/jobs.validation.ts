import { JOBS_TABLE_FIELDS } from "@/lib/airtable/fields";
import type { JobListFilters } from "@/features/jobs/types";
import {
  DOMAIN_EMPLOYMENT_TYPE_TO_AIRTABLE,
  DOMAIN_JOB_PRIORITY_TO_AIRTABLE,
  DOMAIN_JOB_STATUS_AIRTABLE_FILTER_VALUES,
  DOMAIN_JOB_STATUS_TO_AIRTABLE,
} from "@/lib/airtable/fields";

function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

function statusEqualsClause(airtableValues: readonly string[]): string {
  if (airtableValues.length === 1) {
    return `{${JOBS_TABLE_FIELDS.status}} = '${airtableValues[0]}'`;
  }
  return `OR(${airtableValues
    .map((value) => `{${JOBS_TABLE_FIELDS.status}} = '${value}'`)
    .join(",")})`;
}

export function buildJobsFilterFormula(filters: JobListFilters = {}): string {
  const clauses: string[] = [];

  if (!filters.includeArchived && (!filters.status || filters.status === "all")) {
    // Locked client Jobs has no distinct "Archived" choice — archived writes as
    // Closed by us. Do not hide Closed jobs when excluding archive.
    const archivedLabel = DOMAIN_JOB_STATUS_TO_AIRTABLE.archived;
    const closedLabel = DOMAIN_JOB_STATUS_TO_AIRTABLE.closed;
    if (archivedLabel !== closedLabel) {
      clauses.push(
        `NOT({${JOBS_TABLE_FIELDS.status}} = '${archivedLabel}')`,
      );
    }
  }

  if (filters.status && filters.status !== "all") {
    const values = DOMAIN_JOB_STATUS_AIRTABLE_FILTER_VALUES[filters.status];
    clauses.push(statusEqualsClause(values));
  }

  if (filters.clientId && filters.clientId !== "all") {
    clauses.push(
      `FIND('${escapeFormulaValue(filters.clientId)}', ARRAYJOIN({${JOBS_TABLE_FIELDS.client}}))`,
    );
  }

  if (filters.accountManagerId && filters.accountManagerId !== "all") {
    clauses.push(
      `FIND('${escapeFormulaValue(filters.accountManagerId)}', ARRAYJOIN({${JOBS_TABLE_FIELDS.accountManager}}))`,
    );
  }

  if (filters.priority && filters.priority !== "all") {
    clauses.push(
      `{${JOBS_TABLE_FIELDS.priority}} = '${DOMAIN_JOB_PRIORITY_TO_AIRTABLE[filters.priority]}'`,
    );
  }

  if (filters.employmentType && filters.employmentType !== "all") {
    clauses.push(
      `{${JOBS_TABLE_FIELDS.employmentType}} = '${DOMAIN_EMPLOYMENT_TYPE_TO_AIRTABLE[filters.employmentType]}'`,
    );
  }

  if (filters.location && filters.location !== "all" && filters.location.trim()) {
    clauses.push(
      `FIND(LOWER('${escapeFormulaValue(filters.location.trim().toLowerCase())}'), LOWER({${JOBS_TABLE_FIELDS.location}}))`,
    );
  }

  if (filters.search?.trim()) {
    const q = escapeFormulaValue(filters.search.trim().toLowerCase());
    clauses.push(
      `OR(FIND('${q}', LOWER({${JOBS_TABLE_FIELDS.jobId}}&'')), FIND('${q}', LOWER({${JOBS_TABLE_FIELDS.title}})), FIND('${q}', LOWER(ARRAYJOIN({${JOBS_TABLE_FIELDS.client}}))))`,
    );
  }

  if (clauses.length === 0) {
    return "";
  }

  if (clauses.length === 1) {
    return clauses[0] ?? "";
  }

  return `AND(${clauses.join(",")})`;
}

export function parseSkillsInput(value?: string): string[] {
  if (!value?.trim()) {
    return [];
  }
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
