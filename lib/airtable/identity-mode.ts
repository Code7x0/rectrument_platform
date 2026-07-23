import { getOptionalEnv } from "@/lib/api/env";
import { getOptionalAirtableTableName } from "@/lib/airtable/tables";
import { isClientCompatMode } from "@/lib/airtable/compat";

/**
 * When no Users table is configured, identity is resolved from:
 * - Account Managers (staff AMs)
 * - Partners (talent partners)
 * - AIRTABLE_SUPER_ADMIN_EMAILS / AIRTABLE_ADMIN_EMAILS (elevated roles)
 */
export function isClientIdentityMode(): boolean {
  if (getOptionalAirtableTableName("usersTable")) {
    return false;
  }
  return isClientCompatMode();
}

export function getSuperAdminEmails(): string[] {
  return parseEmailList(getOptionalEnv("AIRTABLE_SUPER_ADMIN_EMAILS"));
}

export function getAdminEmails(): string[] {
  return parseEmailList(getOptionalEnv("AIRTABLE_ADMIN_EMAILS"));
}

function parseEmailList(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export function resolveElevatedRole(
  email: string,
): "super_admin" | "admin" | null {
  const normalized = email.trim().toLowerCase();
  if (getSuperAdminEmails().includes(normalized)) {
    return "super_admin";
  }
  if (getAdminEmails().includes(normalized)) {
    return "admin";
  }
  return null;
}
