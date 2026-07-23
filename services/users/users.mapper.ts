import type { AirtableFields } from "@/lib/airtable/client";
import {
  AIRTABLE_IDENTITY_VISIBILITY,
  AIRTABLE_REGISTRATION_STATUS,
  AIRTABLE_ROLE_MAP,
  AIRTABLE_STATUS_MAP,
  USERS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import type {
  IdentityVisibility,
  RegistrationStatus,
  User,
  UserRole,
  UserStatus,
} from "@/types";

export function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

export function asLinkedId(value: unknown): string | null {
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return null;
}

export function mapRole(value: unknown): UserRole {
  const raw = asString(value);
  if (!raw) {
    throw new Error("User record is missing Role");
  }

  const mapped =
    AIRTABLE_ROLE_MAP[raw as keyof typeof AIRTABLE_ROLE_MAP] ?? null;

  if (!mapped) {
    throw new Error(`Unsupported user role in Airtable: ${raw}`);
  }

  return mapped;
}

export function mapStatus(value: unknown): UserStatus {
  const raw = asString(value) ?? "Active";
  const mapped =
    AIRTABLE_STATUS_MAP[raw as keyof typeof AIRTABLE_STATUS_MAP] ?? null;

  if (!mapped) {
    throw new Error(`Unsupported user status in Airtable: ${raw}`);
  }

  return mapped;
}

export function mapRegistrationStatus(value: unknown): RegistrationStatus {
  const raw = asString(value);
  if (!raw) {
    // Backward compatible: existing users without the field are treated as active
    return "active";
  }
  return (
    AIRTABLE_REGISTRATION_STATUS[
      raw as keyof typeof AIRTABLE_REGISTRATION_STATUS
    ] ?? "active"
  );
}

export function mapIdentityVisibility(
  value: unknown,
): IdentityVisibility | null {
  const raw = asString(value);
  if (!raw) {
    return null;
  }
  return (
    AIRTABLE_IDENTITY_VISIBILITY[
      raw as keyof typeof AIRTABLE_IDENTITY_VISIBILITY
    ] ?? null
  );
}

export function mapUserRecord(record: {
  id: string;
  fields: AirtableFields;
}): User {
  const fields = record.fields;
  const email = asString(fields[USERS_TABLE_FIELDS.email]);

  if (!email) {
    throw new Error(`User record ${record.id} is missing Email`);
  }

  return {
    id: record.id,
    clerkUserId: asString(fields[USERS_TABLE_FIELDS.clerkUserId]),
    email,
    fullName: asString(fields[USERS_TABLE_FIELDS.fullName]) ?? email,
    role: mapRole(fields[USERS_TABLE_FIELDS.role]),
    status: mapStatus(fields[USERS_TABLE_FIELDS.status]),
    registrationStatus: mapRegistrationStatus(
      fields[USERS_TABLE_FIELDS.registrationStatus],
    ),
    identityVisibility: mapIdentityVisibility(
      fields[USERS_TABLE_FIELDS.identityVisibility],
    ),
    partnerId: asLinkedId(fields[USERS_TABLE_FIELDS.partner]),
    accountManagerId: asLinkedId(fields[USERS_TABLE_FIELDS.accountManager]),
    phone: asString(fields[USERS_TABLE_FIELDS.phone]),
    city: asString(fields[USERS_TABLE_FIELDS.city]),
    state: asString(fields[USERS_TABLE_FIELDS.state]),
    skills: asString(fields[USERS_TABLE_FIELDS.skills]),
    experience: asString(fields[USERS_TABLE_FIELDS.experience]),
    bankDetails: asString(fields[USERS_TABLE_FIELDS.bankDetails]),
    approvalDate: asString(fields[USERS_TABLE_FIELDS.approvalDate]),
    approvedById: asLinkedId(fields[USERS_TABLE_FIELDS.approvedBy]),
    rejectedReason: asString(fields[USERS_TABLE_FIELDS.rejectedReason]),
    invitationToken: asString(fields[USERS_TABLE_FIELDS.invitationToken]),
    invitationExpiry: asString(fields[USERS_TABLE_FIELDS.invitationExpiry]),
    createdAt: asString(fields[USERS_TABLE_FIELDS.createdAt]),
    lastLogin: asString(fields[USERS_TABLE_FIELDS.lastLogin]),
  };
}
