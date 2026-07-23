import {
  ALLOCATIONS_TABLE_FIELDS,
  DOMAIN_ALLOCATION_STATUS_TO_AIRTABLE,
} from "@/lib/airtable/fields";
import type { AllocationListFilters } from "@/features/allocations/types";

function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

export function buildAllocationsFilterFormula(
  filters: AllocationListFilters = {},
): string {
  const clauses: string[] = [];

  if (
    !filters.includeArchived &&
    (!filters.status || filters.status === "all")
  ) {
    clauses.push(
      `NOT({${ALLOCATIONS_TABLE_FIELDS.status}} = '${DOMAIN_ALLOCATION_STATUS_TO_AIRTABLE.archived}')`,
    );
  }

  if (filters.status && filters.status !== "all") {
    clauses.push(
      `{${ALLOCATIONS_TABLE_FIELDS.status}} = '${DOMAIN_ALLOCATION_STATUS_TO_AIRTABLE[filters.status]}'`,
    );
  }

  if (filters.partnerId && filters.partnerId !== "all") {
    clauses.push(
      `FIND('${escapeFormulaValue(filters.partnerId)}', ARRAYJOIN({${ALLOCATIONS_TABLE_FIELDS.partner}}))`,
    );
  }

  if (filters.jobId && filters.jobId !== "all") {
    clauses.push(
      `FIND('${escapeFormulaValue(filters.jobId)}', ARRAYJOIN({${ALLOCATIONS_TABLE_FIELDS.job}}))`,
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
