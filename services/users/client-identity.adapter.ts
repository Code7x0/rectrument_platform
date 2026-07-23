/**
 * Client-schema identity adapter.
 * Maps Account Managers + Partners (+ env elevated emails) → domain User.
 * No Users table. No new Airtable fields.
 */

import {
  createRecord,
  findRecord,
  getRecords,
  updateRecord,
  type AirtableFields,
} from "@/lib/airtable/client";
import {
  asSelectList,
  asString,
  toPartnerSpecializationChoices,
} from "@/lib/airtable/compat";
import {
  ACCOUNT_MANAGERS_TABLE_FIELDS,
  PARTNERS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import {
  getAdminEmails,
  getSuperAdminEmails,
  resolveElevatedRole,
} from "@/lib/airtable/identity-mode";
import {
  buildInviteMarker,
  parseInviteMarker,
} from "@/lib/airtable/field-markers";
import { getOptionalEnv } from "@/lib/api/env";
import { getAirtableTableName } from "@/lib/airtable/tables";
import type {
  RegistrationStatus,
  User,
  UserRole,
  UserStatus,
} from "@/types";

import type {
  CreateUserInput,
  ListUsersFilters,
  ResolveClerkIdentityInput,
  UpdateUserInput,
} from "./users.types";

function accountManagersTable(): string {
  return (
    getOptionalEnv("AIRTABLE_ACCOUNT_MANAGERS_TABLE")?.trim() ||
    "Account Managers"
  );
}

function partnersTable(): string {
  return getAirtableTableName("partnersTable");
}

function escapeFormula(value: string): string {
  return value.replace(/'/g, "\\'");
}

function mapAmStatus(raw: string | null): UserStatus {
  if (!raw || raw === "Active" || raw === "On Leave") {
    return "active";
  }
  return "inactive";
}

function mapPartnerStatus(raw: string | null): {
  status: UserStatus;
  registrationStatus: RegistrationStatus;
} {
  if (raw === "Active" || raw === "Preferred") {
    return { status: "active", registrationStatus: "active" };
  }
  if (raw === "Probation") {
    return { status: "inactive", registrationStatus: "pending" };
  }
  return { status: "inactive", registrationStatus: "inactive" };
}

function syntheticElevatedUser(
  email: string,
  role: "super_admin" | "admin",
): User {
  return {
    id: `env_${role}_${email.replace(/[^a-z0-9]/gi, "_")}`,
    clerkUserId: null,
    email,
    fullName: role === "super_admin" ? "Super Admin" : "Admin",
    role,
    status: "active",
    registrationStatus: "active",
    identityVisibility: null,
    phone: null,
    city: null,
    state: null,
    skills: null,
    experience: null,
    bankDetails: null,
    partnerId: null,
    accountManagerId: null,
    createdAt: null,
    lastLogin: null,
    approvalDate: null,
    approvedById: null,
    rejectedReason: null,
    invitationToken: null,
    invitationExpiry: null,
  };
}

function mapAccountManagerRecord(record: {
  id: string;
  fields: AirtableFields;
}): User | null {
  const fields = record.fields;
  const email = asString(fields[ACCOUNT_MANAGERS_TABLE_FIELDS.email]);
  if (!email) {
    return null;
  }
  const elevated = resolveElevatedRole(email);
  const status = mapAmStatus(
    asString(fields[ACCOUNT_MANAGERS_TABLE_FIELDS.status]),
  );
  const invite = parseInviteMarker(
    asString(fields[ACCOUNT_MANAGERS_TABLE_FIELDS.comments]),
  );
  const hasPendingInvite = Boolean(invite?.token) && status === "inactive";
  // Env Super Admin / Admin must never be blocked by an inactive AM row.
  if (elevated) {
    return {
      ...syntheticElevatedUser(email, elevated),
      id: record.id,
      accountManagerId: record.id,
      fullName:
        asString(fields[ACCOUNT_MANAGERS_TABLE_FIELDS.name]) ?? email,
      phone: asString(fields[ACCOUNT_MANAGERS_TABLE_FIELDS.phone]),
    };
  }
  return {
    id: record.id,
    clerkUserId: null,
    email,
    fullName:
      asString(fields[ACCOUNT_MANAGERS_TABLE_FIELDS.name]) ?? email,
    role: "account_manager",
    status: hasPendingInvite ? "inactive" : status,
    registrationStatus: hasPendingInvite
      ? "invitation_pending"
      : status === "active"
        ? "active"
        : "inactive",
    identityVisibility: null,
    phone: asString(fields[ACCOUNT_MANAGERS_TABLE_FIELDS.phone]),
    city: null,
    state: null,
    skills: null,
    experience: null,
    bankDetails: null,
    partnerId: null,
    accountManagerId: record.id,
    createdAt: null,
    lastLogin: null,
    approvalDate: null,
    approvedById: null,
    rejectedReason: null,
    invitationToken: invite?.token ?? null,
    invitationExpiry: invite?.expiry ?? null,
  };
}

function mapPartnerAsUser(record: {
  id: string;
  fields: AirtableFields;
}): User | null {
  const fields = record.fields;
  const email =
    asString(fields[PARTNERS_TABLE_FIELDS.email]) ??
    asString(fields["Personal Email"]);
  if (!email) {
    return null;
  }
  const elevated = resolveElevatedRole(email);
  if (elevated) {
    // Elevated env emails win even if also listed as partners
    return {
      ...syntheticElevatedUser(email, elevated),
      id: record.id,
      partnerId: record.id,
      fullName:
        asString(fields[PARTNERS_TABLE_FIELDS.name]) ??
        asString(fields[PARTNERS_TABLE_FIELDS.companyName]) ??
        email,
      phone: asString(fields[PARTNERS_TABLE_FIELDS.phone]),
      city: asString(fields[PARTNERS_TABLE_FIELDS.city]),
    };
  }
  const { status, registrationStatus } = mapPartnerStatus(
    asString(fields[PARTNERS_TABLE_FIELDS.status]),
  );
  return {
    id: record.id,
    clerkUserId: null,
    email,
    fullName:
      asString(fields[PARTNERS_TABLE_FIELDS.name]) ??
      asString(fields[PARTNERS_TABLE_FIELDS.companyName]) ??
      email,
    role: "partner",
    status,
    registrationStatus,
    identityVisibility: "private",
    phone: asString(fields[PARTNERS_TABLE_FIELDS.phone]),
    city: asString(fields[PARTNERS_TABLE_FIELDS.city]),
    state: null,
    skills: asSelectList(fields[PARTNERS_TABLE_FIELDS.specialization]),
    experience: null,
    bankDetails: null,
    partnerId: record.id,
    accountManagerId: null,
    createdAt: asString(fields["Created Time"]),
    lastLogin: asString(fields["Last Engaged Date"]),
    approvalDate: null,
    approvedById: null,
    rejectedReason: null,
    invitationToken: null,
    invitationExpiry: null,
  };
}

async function listAccountManagerUsers(): Promise<User[]> {
  try {
    const records = await getRecords(accountManagersTable());
    return records
      .map((record) =>
        mapAccountManagerRecord({
          id: record.id,
          fields: record.fields as AirtableFields,
        }),
      )
      .filter((user): user is User => Boolean(user));
  } catch (error) {
    console.error("[client-identity] Account Managers list failed", error);
    return [];
  }
}

async function listPartnerUsers(): Promise<User[]> {
  try {
    const records = await getRecords(partnersTable());
    return records
      .map((record) =>
        mapPartnerAsUser({
          id: record.id,
          fields: record.fields as AirtableFields,
        }),
      )
      .filter((user): user is User => Boolean(user));
  } catch (error) {
    console.error("[client-identity] Partners list failed", error);
    return [];
  }
}

function mergeElevatedEnvUsers(users: User[]): User[] {
  const byEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));
  for (const email of getSuperAdminEmails()) {
    const existing = byEmail.get(email);
    byEmail.set(
      email,
      existing
        ? {
            ...existing,
            role: "super_admin",
            status: "active",
            registrationStatus: "active",
          }
        : syntheticElevatedUser(email, "super_admin"),
    );
  }
  for (const email of getAdminEmails()) {
    if (byEmail.get(email)?.role === "super_admin") {
      continue;
    }
    const existing = byEmail.get(email);
    byEmail.set(
      email,
      existing
        ? {
            ...existing,
            role: "admin",
            status: "active",
            registrationStatus: "active",
          }
        : syntheticElevatedUser(email, "admin"),
    );
  }
  return [...byEmail.values()];
}

export async function clientFindUserByEmail(email: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  const elevated = resolveElevatedRole(normalized);
  if (elevated) {
    // Env allow-list is authoritative: never block login on Airtable status/outage.
    // Still prefer a matching AM/Partner row for display name / linked ids when present.
    try {
      const existing = await clientListUsers({});
      const match = existing.find(
        (user) => user.email.toLowerCase() === normalized,
      );
      if (match) {
        return {
          ...match,
          role: elevated,
          status: "active",
          registrationStatus: "active",
        };
      }
    } catch (error) {
      console.error(
        "[client-identity] Elevated email enrich failed; using synthetic user",
        error,
      );
    }
    return syntheticElevatedUser(normalized, elevated);
  }

  const amRecords = await getRecords(accountManagersTable(), {
    filterByFormula: `LOWER({${ACCOUNT_MANAGERS_TABLE_FIELDS.email}}) = '${escapeFormula(normalized)}'`,
    maxRecords: 1,
  });
  const am = amRecords[0];
  if (am) {
    return mapAccountManagerRecord({
      id: am.id,
      fields: am.fields as AirtableFields,
    });
  }

  const partnerRecords = await getRecords(partnersTable(), {
    filterByFormula: `OR(LOWER({${PARTNERS_TABLE_FIELDS.email}}) = '${escapeFormula(normalized)}', LOWER({Personal Email}) = '${escapeFormula(normalized)}')`,
    maxRecords: 1,
  });
  const partner = partnerRecords[0];
  if (partner) {
    return mapPartnerAsUser({
      id: partner.id,
      fields: partner.fields as AirtableFields,
    });
  }

  return null;
}

export async function clientFindUserByClerkId(
  clerkUserId: string,
): Promise<User | null> {
  void clerkUserId;
  // Client base has no Clerk User ID field — identity is email-only.
  return null;
}

export async function clientFindUserByInvitationToken(
  token: string,
): Promise<User | null> {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const records = await getRecords(accountManagersTable(), {
      filterByFormula: `FIND('${escapeFormula(`invite:${trimmed}`)}', {${ACCOUNT_MANAGERS_TABLE_FIELDS.comments}} & '')`,
      maxRecords: 5,
    });
    for (const record of records) {
      const comments = asString(
        record.fields[ACCOUNT_MANAGERS_TABLE_FIELDS.comments],
      );
      const parsed = parseInviteMarker(comments);
      if (parsed?.token !== trimmed) {
        continue;
      }
      if (parsed.expiry) {
        const expiryMs = Date.parse(parsed.expiry);
        if (Number.isFinite(expiryMs) && expiryMs < Date.now()) {
          continue;
        }
      }
      const user = mapAccountManagerRecord({
        id: record.id,
        fields: record.fields as AirtableFields,
      });
      if (!user) {
        continue;
      }
      return {
        ...user,
        registrationStatus: "invitation_pending",
        invitationToken: parsed.token,
        invitationExpiry: parsed.expiry,
        status: "inactive",
      };
    }
  } catch (error) {
    console.error("[client-identity] invitation token lookup failed", error);
  }
  return null;
}

export async function clientGetUserById(userId: string): Promise<User | null> {
  if (userId.startsWith("env_")) {
    const users = mergeElevatedEnvUsers([]);
    return users.find((user) => user.id === userId) ?? null;
  }
  try {
    const am = await findRecord(accountManagersTable(), userId);
    const mapped = mapAccountManagerRecord({
      id: am.id,
      fields: am.fields as AirtableFields,
    });
    if (mapped) {
      return mapped;
    }
  } catch {
    // not an AM
  }
  try {
    const partner = await findRecord(partnersTable(), userId);
    return mapPartnerAsUser({
      id: partner.id,
      fields: partner.fields as AirtableFields,
    });
  } catch {
    return null;
  }
}

export async function clientListUsers(
  filters: ListUsersFilters = {},
): Promise<User[]> {
  const [ams, partners] = await Promise.all([
    listAccountManagerUsers(),
    listPartnerUsers(),
  ]);
  let users = mergeElevatedEnvUsers([...ams, ...partners]);

  if (filters.role) {
    const list = Array.isArray(filters.role) ? filters.role : [filters.role];
    users = users.filter((user) => list.includes(user.role));
  }
  if (filters.status) {
    const list = Array.isArray(filters.status) ? filters.status : [filters.status];
    users = users.filter((user) => list.includes(user.status));
  }
  if (filters.registrationStatus) {
    const list = Array.isArray(filters.registrationStatus)
      ? filters.registrationStatus
      : [filters.registrationStatus];
    users = users.filter((user) => list.includes(user.registrationStatus));
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    users = users.filter(
      (user) =>
        user.fullName.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        (user.phone?.toLowerCase().includes(q) ?? false),
    );
  }

  return users.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function clientResolveUserForClerkIdentity(
  input: ResolveClerkIdentityInput,
): Promise<User | null> {
  return clientFindUserByEmail(input.email);
}

export async function clientUpdateClerkId(
  userId: string,
  clerkUserId: string,
): Promise<User> {
  void clerkUserId;
  // Cannot persist Clerk ID on locked schema — return current identity.
  const user = await clientGetUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}

export async function clientUpdateLastLogin(userId: string): Promise<void> {
  const user = await clientGetUserById(userId);
  if (!user || user.role !== "partner" || !user.partnerId) {
    return;
  }
  try {
    await updateRecord(partnersTable(), user.partnerId, {
      "Last Engaged Date": new Date().toISOString(),
    });
  } catch (error) {
    console.error("[client-identity] Last Engaged Date update failed", error);
  }
}

export async function clientUpdateUserRecord(
  userId: string,
  input: UpdateUserInput,
): Promise<User> {
  const existing = await clientGetUserById(userId);
  if (!existing) {
    throw new Error("User not found");
  }

  if (existing.role === "partner" && existing.partnerId) {
    const fields: AirtableFields = {};
    if (input.fullName !== undefined) {
      fields[PARTNERS_TABLE_FIELDS.name] = input.fullName;
    }
    if (input.phone !== undefined) {
      fields[PARTNERS_TABLE_FIELDS.phone] = input.phone ?? "";
    }
    if (input.city !== undefined) {
      fields[PARTNERS_TABLE_FIELDS.city] = input.city ?? "";
    }
    if (input.status !== undefined || input.registrationStatus !== undefined) {
      if (
        input.registrationStatus === "approved" ||
        input.registrationStatus === "active" ||
        input.status === "active"
      ) {
        fields[PARTNERS_TABLE_FIELDS.status] = "Active";
      } else if (
        input.registrationStatus === "pending" ||
        input.registrationStatus === "rejected"
      ) {
        fields[PARTNERS_TABLE_FIELDS.status] =
          input.registrationStatus === "rejected" ? "Inactive" : "Probation";
      } else if (input.status === "inactive" || input.status === "suspended") {
        fields[PARTNERS_TABLE_FIELDS.status] = "Inactive";
      }
    }
    if (input.rejectedReason !== undefined) {
      fields[PARTNERS_TABLE_FIELDS.notes] = input.rejectedReason ?? "";
    }
    if (Object.keys(fields).length > 0) {
      await updateRecord(partnersTable(), existing.partnerId, fields);
    }
    return (await clientGetUserById(userId)) ?? existing;
  }

  if (existing.accountManagerId) {
    const fields: AirtableFields = {};
    if (input.fullName !== undefined) {
      fields[ACCOUNT_MANAGERS_TABLE_FIELDS.name] = input.fullName;
    }
    if (input.phone !== undefined) {
      fields[ACCOUNT_MANAGERS_TABLE_FIELDS.phone] = input.phone ?? "";
    }
    if (input.status !== undefined) {
      fields[ACCOUNT_MANAGERS_TABLE_FIELDS.status] =
        input.status === "active" ? "Active" : "Not Active";
    }
    if (input.invitationToken !== undefined) {
      fields[ACCOUNT_MANAGERS_TABLE_FIELDS.comments] = input.invitationToken
        ? buildInviteMarker(
            input.invitationToken,
            input.invitationExpiry ?? null,
          )
        : "";
    }
    if (Object.keys(fields).length > 0) {
      await updateRecord(accountManagersTable(), existing.accountManagerId, fields);
    }
    return (await clientGetUserById(userId)) ?? existing;
  }

  // Env-only elevated users — status/role not persisted in Airtable
  return existing;
}

export async function clientCreateUserRecord(
  fields: CreateUserInput,
): Promise<User> {
  const existing = await clientFindUserByEmail(fields.email);
  if (existing) {
    // Registration creates the Partners row first, then binds identity to it.
    if (
      fields.role === "partner" &&
      fields.partnerId &&
      (existing.id === fields.partnerId ||
        existing.partnerId === fields.partnerId)
    ) {
      return existing;
    }
    throw new Error("An account with this email already exists");
  }

  if (fields.role === "partner") {
    // Registration already created the Partners row — bind identity to it.
    if (fields.partnerId) {
      const user = await clientGetUserById(fields.partnerId);
      if (!user) {
        throw new Error("Partner record not found for identity binding");
      }
      return user;
    }

    const nameParts = fields.fullName.trim().split(/\s+/);
    const first = nameParts[0]?.[0] ?? "X";
    const last = nameParts[nameParts.length - 1]?.[0] ?? "X";
    const digits = (fields.phone ?? "00").replace(/\D/g, "").slice(-2) || "00";
    const partnerCode = `${first}${last}_${digits}`.toUpperCase();

    const payload: AirtableFields = {
      [PARTNERS_TABLE_FIELDS.partnerId]: partnerCode,
      [PARTNERS_TABLE_FIELDS.name]: fields.fullName,
      [PARTNERS_TABLE_FIELDS.email]: fields.email,
      [PARTNERS_TABLE_FIELDS.status]:
        fields.registrationStatus === "pending" || !fields.registrationStatus
          ? "Probation"
          : fields.status === "active"
            ? "Active"
            : "Probation",
      [PARTNERS_TABLE_FIELDS.companyName]:
        fields.fullName.split(" ")[0] ?? fields.fullName,
    };
    if (fields.phone) {
      payload[PARTNERS_TABLE_FIELDS.phone] = fields.phone;
    }
    if (fields.city) {
      payload[PARTNERS_TABLE_FIELDS.city] = fields.city;
    }
    if (fields.skills) {
      payload[PARTNERS_TABLE_FIELDS.specialization] =
        toPartnerSpecializationChoices(fields.skills);
    }
    const created = await createRecord(partnersTable(), payload);
    const user = mapPartnerAsUser({
      id: created.id,
      fields: created.fields as AirtableFields,
    });
    if (!user) {
      throw new Error("Failed to create partner identity");
    }
    return user;
  }

  if (fields.role === "account_manager") {
    const payload: AirtableFields = {
      [ACCOUNT_MANAGERS_TABLE_FIELDS.name]: fields.fullName,
      [ACCOUNT_MANAGERS_TABLE_FIELDS.email]: fields.email,
      [ACCOUNT_MANAGERS_TABLE_FIELDS.status]:
        fields.status === "active" ? "Active" : "Not Active",
    };
    if (fields.phone) {
      payload[ACCOUNT_MANAGERS_TABLE_FIELDS.phone] = fields.phone;
    }
    if (fields.invitationToken) {
      payload[ACCOUNT_MANAGERS_TABLE_FIELDS.comments] = buildInviteMarker(
        fields.invitationToken,
        fields.invitationExpiry ?? null,
      );
    }
    const created = await createRecord(accountManagersTable(), payload);
    const user = mapAccountManagerRecord({
      id: created.id,
      fields: created.fields as AirtableFields,
    });
    if (!user) {
      throw new Error("Failed to create account manager identity");
    }
    return user;
  }

  throw new Error(
    `Cannot create ${fields.role} in the locked Airtable schema. Add the email to AIRTABLE_SUPER_ADMIN_EMAILS or AIRTABLE_ADMIN_EMAILS, or create an Account Manager / Partner record.`,
  );
}

export type { UserRole };
