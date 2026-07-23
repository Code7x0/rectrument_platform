import {
  createRecord,
  findRecord,
  getRecords,
  updateRecord,
  type AirtableFields,
} from "@/lib/airtable/client";
import {
  DOMAIN_IDENTITY_VISIBILITY_TO_AIRTABLE,
  DOMAIN_REGISTRATION_STATUS_TO_AIRTABLE,
  DOMAIN_ROLE_TO_AIRTABLE,
  USERS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import { isClientIdentityMode } from "@/lib/airtable/identity-mode";
import { getAirtableTableName } from "@/lib/airtable/tables";
import { getPermissionsForRole } from "@/lib/auth/permissions";
import type {
  AppSession,
  Permission,
  RegistrationStatus,
  User,
  UserRole,
  UserStatus,
} from "@/types";

import {
  clientCreateUserRecord,
  clientFindUserByClerkId,
  clientFindUserByEmail,
  clientFindUserByInvitationToken,
  clientGetUserById,
  clientListUsers,
  clientResolveUserForClerkIdentity,
  clientUpdateClerkId,
  clientUpdateLastLogin,
  clientUpdateUserRecord,
} from "./client-identity.adapter";
import { mapUserRecord } from "./users.mapper";
import type {
  CreateUserInput,
  ListUsersFilters,
  ResolveClerkIdentityInput,
  UpdateUserInput,
} from "./users.types";
import {
  buildClerkIdLookupFormula,
  buildEmailLookupFormula,
} from "./users.validation";

function getUsersTableName(): string {
  return getAirtableTableName("usersTable");
}

function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

function buildSession(user: User, clerkId: string): AppSession {
  return {
    userId: user.id,
    clerkId,
    role: user.role,
    status: user.status,
    partnerId: user.partnerId,
    accountManagerId: user.accountManagerId,
  };
}

/** Login gate: Active status + approved/active registration. */
export function canUserAuthenticate(user: User): boolean {
  if (user.status !== "active") {
    return false;
  }
  return (
    user.registrationStatus === "active" ||
    user.registrationStatus === "approved"
  );
}

function toAirtableUserFields(
  input: CreateUserInput | UpdateUserInput,
): AirtableFields {
  const fields: AirtableFields = {};

  if ("fullName" in input && input.fullName !== undefined) {
    fields[USERS_TABLE_FIELDS.fullName] = input.fullName;
  }
  if ("email" in input && input.email !== undefined) {
    fields[USERS_TABLE_FIELDS.email] = input.email;
  }
  if (input.role !== undefined) {
    fields[USERS_TABLE_FIELDS.role] = DOMAIN_ROLE_TO_AIRTABLE[input.role];
  }
  if (input.status !== undefined) {
    fields[USERS_TABLE_FIELDS.status] =
      input.status === "active"
        ? "Active"
        : input.status === "suspended"
          ? "Suspended"
          : "Inactive";
  }
  if (input.registrationStatus !== undefined) {
    fields[USERS_TABLE_FIELDS.registrationStatus] =
      DOMAIN_REGISTRATION_STATUS_TO_AIRTABLE[input.registrationStatus];
  }
  if (input.identityVisibility !== undefined) {
    fields[USERS_TABLE_FIELDS.identityVisibility] = input.identityVisibility
      ? DOMAIN_IDENTITY_VISIBILITY_TO_AIRTABLE[input.identityVisibility]
      : "";
  }
  if (input.phone !== undefined) {
    fields[USERS_TABLE_FIELDS.phone] = input.phone ?? "";
  }
  if (input.city !== undefined) {
    fields[USERS_TABLE_FIELDS.city] = input.city ?? "";
  }
  if (input.state !== undefined) {
    fields[USERS_TABLE_FIELDS.state] = input.state ?? "";
  }
  if (input.skills !== undefined) {
    fields[USERS_TABLE_FIELDS.skills] = input.skills ?? "";
  }
  if (input.experience !== undefined) {
    fields[USERS_TABLE_FIELDS.experience] = input.experience ?? "";
  }
  if (input.bankDetails !== undefined) {
    fields[USERS_TABLE_FIELDS.bankDetails] = input.bankDetails ?? "";
  }
  if ("partnerId" in input && input.partnerId !== undefined) {
    fields[USERS_TABLE_FIELDS.partner] = input.partnerId
      ? [input.partnerId]
      : [];
  }
  if ("accountManagerId" in input && input.accountManagerId !== undefined) {
    fields[USERS_TABLE_FIELDS.accountManager] = input.accountManagerId
      ? [input.accountManagerId]
      : [];
  }
  if ("approvalDate" in input && input.approvalDate !== undefined) {
    fields[USERS_TABLE_FIELDS.approvalDate] = input.approvalDate ?? "";
  }
  if ("approvedById" in input && input.approvedById !== undefined) {
    fields[USERS_TABLE_FIELDS.approvedBy] = input.approvedById
      ? [input.approvedById]
      : [];
  }
  if ("rejectedReason" in input && input.rejectedReason !== undefined) {
    fields[USERS_TABLE_FIELDS.rejectedReason] = input.rejectedReason ?? "";
  }
  if (input.invitationToken !== undefined) {
    fields[USERS_TABLE_FIELDS.invitationToken] = input.invitationToken ?? "";
  }
  if (input.invitationExpiry !== undefined) {
    fields[USERS_TABLE_FIELDS.invitationExpiry] = input.invitationExpiry ?? "";
  }
  if ("clerkUserId" in input && input.clerkUserId !== undefined) {
    fields[USERS_TABLE_FIELDS.clerkUserId] = input.clerkUserId ?? "";
  }

  return fields;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  if (isClientIdentityMode()) {
    return clientFindUserByEmail(email);
  }
  const records = await getRecords(getUsersTableName(), {
    filterByFormula: buildEmailLookupFormula(email),
    maxRecords: 1,
  });
  const record = records[0];
  return record ? mapUserRecord(record) : null;
}

export async function findUserByClerkId(
  clerkUserId: string,
): Promise<User | null> {
  if (isClientIdentityMode()) {
    return clientFindUserByClerkId(clerkUserId);
  }
  const records = await getRecords(getUsersTableName(), {
    filterByFormula: buildClerkIdLookupFormula(clerkUserId),
    maxRecords: 1,
  });
  const record = records[0];
  return record ? mapUserRecord(record) : null;
}

export async function findUserByInvitationToken(
  token: string,
): Promise<User | null> {
  if (isClientIdentityMode()) {
    return clientFindUserByInvitationToken(token);
  }
  const records = await getRecords(getUsersTableName(), {
    filterByFormula: `{${USERS_TABLE_FIELDS.invitationToken}} = '${escapeFormulaValue(token)}'`,
    maxRecords: 1,
  });
  const record = records[0];
  return record ? mapUserRecord(record) : null;
}

export async function findUserByRecordId(userId: string): Promise<User> {
  if (isClientIdentityMode()) {
    const user = await clientGetUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }
  const record = await findRecord(getUsersTableName(), userId);
  return mapUserRecord(record);
}

export async function getUserById(userId: string): Promise<User | null> {
  if (isClientIdentityMode()) {
    return clientGetUserById(userId);
  }
  try {
    return await findUserByRecordId(userId);
  } catch {
    return null;
  }
}

export async function updateClerkId(
  userId: string,
  clerkUserId: string,
): Promise<User> {
  if (isClientIdentityMode()) {
    return clientUpdateClerkId(userId, clerkUserId);
  }
  const existing = await findUserByRecordId(userId);

  if (existing.clerkUserId && existing.clerkUserId !== clerkUserId) {
    throw new Error(
      "Clerk User ID is already linked to a different Clerk account",
    );
  }

  if (existing.clerkUserId === clerkUserId) {
    return existing;
  }

  const updated = await updateRecord(getUsersTableName(), userId, {
    [USERS_TABLE_FIELDS.clerkUserId]: clerkUserId,
  });

  return mapUserRecord({
    id: updated.id,
    fields: updated.fields as AirtableFields,
  });
}

export async function updateLastLogin(userId: string): Promise<void> {
  if (isClientIdentityMode()) {
    await clientUpdateLastLogin(userId);
    return;
  }
  await updateRecord(getUsersTableName(), userId, {
    [USERS_TABLE_FIELDS.lastLogin]: new Date().toISOString(),
  });
}

export async function updateUserRecord(
  userId: string,
  input: UpdateUserInput,
): Promise<User> {
  if (isClientIdentityMode()) {
    return clientUpdateUserRecord(userId, input);
  }
  const updated = await updateRecord(
    getUsersTableName(),
    userId,
    toAirtableUserFields(input),
  );
  return mapUserRecord({
    id: updated.id,
    fields: updated.fields as AirtableFields,
  });
}

function matchesFilterList<T extends string>(
  value: T,
  filter: T | T[] | undefined,
): boolean {
  if (!filter) {
    return true;
  }
  const list = Array.isArray(filter) ? filter : [filter];
  return list.includes(value);
}

export async function listUsers(
  filters: ListUsersFilters = {},
): Promise<User[]> {
  if (isClientIdentityMode()) {
    return clientListUsers(filters);
  }
  const records = await getRecords(getUsersTableName(), {
    sort: [{ field: USERS_TABLE_FIELDS.fullName, direction: "asc" }],
  });

  let users = records.map(mapUserRecord);

  users = users.filter(
    (user) =>
      matchesFilterList(user.role, filters.role) &&
      matchesFilterList(user.registrationStatus, filters.registrationStatus) &&
      matchesFilterList(user.status, filters.status),
  );

  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    users = users.filter(
      (user) =>
        user.fullName.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        (user.phone?.toLowerCase().includes(q) ?? false),
    );
  }

  return users;
}

export async function resolveUserForClerkIdentity(
  input: ResolveClerkIdentityInput,
): Promise<User | null> {
  if (isClientIdentityMode()) {
    return clientResolveUserForClerkIdentity(input);
  }
  const byClerkId = await findUserByClerkId(input.clerkUserId);
  if (byClerkId) {
    return byClerkId;
  }

  const byEmail = await findUserByEmail(input.email);
  if (!byEmail) {
    return null;
  }

  if (!canUserAuthenticate(byEmail)) {
    return byEmail;
  }

  if (!byEmail.clerkUserId) {
    return updateClerkId(byEmail.id, input.clerkUserId);
  }

  if (byEmail.clerkUserId !== input.clerkUserId) {
    throw new Error(
      "This email is already linked to a different Clerk account",
    );
  }

  return byEmail;
}

export async function getCurrentUser(
  clerkUserId: string,
  email: string,
): Promise<User | null> {
  return resolveUserForClerkIdentity({ clerkUserId, email });
}

export async function getCurrentUserRole(
  clerkUserId: string,
  email: string,
): Promise<UserRole | null> {
  const user = await getCurrentUser(clerkUserId, email);
  return user?.role ?? null;
}

export async function getCurrentPermissions(
  clerkUserId: string,
  email: string,
): Promise<Permission[]> {
  const user = await getCurrentUser(clerkUserId, email);
  if (!user) {
    return [];
  }

  return getPermissionsForRole(user.role);
}

export async function buildAppSession(
  input: ResolveClerkIdentityInput,
): Promise<AppSession | null> {
  const user = await resolveUserForClerkIdentity(input);
  if (!user) {
    return null;
  }

  if (!canUserAuthenticate(user)) {
    return null;
  }

  return buildSession(user, input.clerkUserId);
}

export async function createUserRecord(fields: CreateUserInput): Promise<User> {
  if (isClientIdentityMode()) {
    return clientCreateUserRecord(fields);
  }
  const existing = await findUserByEmail(fields.email);
  if (existing) {
    throw new Error("A user with this email already exists");
  }

  const payload = toAirtableUserFields({
    ...fields,
    status: fields.status ?? "inactive",
    registrationStatus: fields.registrationStatus ?? "pending",
  });

  payload[USERS_TABLE_FIELDS.email] = fields.email;
  payload[USERS_TABLE_FIELDS.fullName] = fields.fullName;
  payload[USERS_TABLE_FIELDS.role] = DOMAIN_ROLE_TO_AIRTABLE[fields.role];
  payload[USERS_TABLE_FIELDS.status] =
    (fields.status ?? "inactive") === "active"
      ? "Active"
      : (fields.status ?? "inactive") === "suspended"
        ? "Suspended"
        : "Inactive";
  payload[USERS_TABLE_FIELDS.registrationStatus] =
    DOMAIN_REGISTRATION_STATUS_TO_AIRTABLE[
      fields.registrationStatus ?? "pending"
    ];

  const created = await createRecord(getUsersTableName(), payload);
  return mapUserRecord({
    id: created.id,
    fields: created.fields as AirtableFields,
  });
}

export type { RegistrationStatus, UserStatus };
