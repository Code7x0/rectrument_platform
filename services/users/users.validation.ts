import { USERS_TABLE_FIELDS } from "@/lib/airtable/fields";

export function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

export function buildEmailLookupFormula(email: string): string {
  const normalized = email.trim().toLowerCase();
  return `LOWER({${USERS_TABLE_FIELDS.email}}) = '${escapeFormulaValue(normalized)}'`;
}

export function buildClerkIdLookupFormula(clerkUserId: string): string {
  return `{${USERS_TABLE_FIELDS.clerkUserId}} = '${escapeFormulaValue(clerkUserId)}'`;
}

export function assertNonEmptyEmail(email: string): string {
  const trimmed = email.trim();
  if (!trimmed) {
    throw new Error("Email is required");
  }
  return trimmed;
}
