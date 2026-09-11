import { getAdminEmails, getSuperAdminEmails } from "@/lib/airtable/identity-mode";
import { getRecords } from "@/lib/airtable/client";
import { asString } from "@/lib/airtable/compat";
import { parseInviteMarker } from "@/lib/airtable/field-markers";
import { ACCOUNT_MANAGERS_TABLE_FIELDS } from "@/lib/airtable/fields";
import { getOptionalEnv } from "@/lib/api/env";
import { listUsers } from "@/services/users";

export interface AccountManagerDigestRecipient {
  email: string;
  fullName: string;
  accountManagerId: string;
}

/** AM rows eligible for operational email (digest, alerts). */
export function isActiveAccountManagerForDigest(
  statusRaw: string | null | undefined,
  commentsRaw: string | null | undefined,
): boolean {
  const status = (statusRaw ?? "").trim();
  const normalized = status.toLowerCase();
  const invite = parseInviteMarker(commentsRaw);
  const hasPendingInvite =
    Boolean(invite?.token) &&
    (normalized === "inactive" || normalized === "invited");
  if (hasPendingInvite) {
    return false;
  }
  if (
    !status ||
    status === "Active" ||
    status === "On Leave" ||
    normalized === "active" ||
    normalized === "on leave"
  ) {
    return true;
  }
  return false;
}

function normalizeEmail(value: string | null | undefined): string | null {
  const email = value?.trim().toLowerCase();
  return email || null;
}

function uniqueEmails(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(
      values.map((value) => normalizeEmail(value)).filter(Boolean) as string[],
    ),
  ];
}

/** Active Super Admin inboxes — env list + Users table (client identity merges env). */
export async function getSuperAdminNotificationEmails(): Promise<string[]> {
  const users = await listUsers({ role: "super_admin", status: "active" });
  return uniqueEmails([
    ...users.map((user) => user.email),
    ...getSuperAdminEmails(),
  ]);
}

/** Super Admin + Admin inboxes for operational alerts. */
export async function getAdminNotificationEmails(): Promise<string[]> {
  const [superAdmins, admins] = await Promise.all([
    getSuperAdminNotificationEmails(),
    listUsers({ role: "admin", status: "active" }),
  ]);
  return uniqueEmails([
    ...superAdmins,
    ...admins.map((user) => user.email),
    ...getAdminEmails(),
  ]);
}

/** Resolve Account Manager email from AM directory record id. */
export async function getAccountManagerEmail(
  accountManagerId: string,
): Promise<string | null> {
  const amId = accountManagerId.trim();
  if (!amId) {
    return null;
  }

  const users = await listUsers({ role: "account_manager", status: "active" });
  const linked = users.find(
    (user) => user.accountManagerId === amId || user.id === amId,
  );
  if (linked?.email) {
    return normalizeEmail(linked.email);
  }

  const raw = getOptionalEnv("AIRTABLE_ACCOUNT_MANAGERS_TABLE")?.trim();
  const table = !raw || raw === "Account" ? "Account Managers" : raw;
  try {
    const records = await getRecords(table, {
      filterByFormula: `RECORD_ID() = '${amId.replace(/'/g, "\\'")}'`,
      maxRecords: 1,
    });
    const email = asString(records[0]?.fields[ACCOUNT_MANAGERS_TABLE_FIELDS.email]);
    return normalizeEmail(email);
  } catch {
    return null;
  }
}

/**
 * Active AM inboxes for daily digest — Account Managers table first, merged with Users.
 * Covers AMs who exist only in the AM directory and dedupes by email.
 */
export async function getActiveAccountManagerDigestRecipients(): Promise<
  AccountManagerDigestRecipient[]
> {
  const byEmail = new Map<string, AccountManagerDigestRecipient>();

  const raw = getOptionalEnv("AIRTABLE_ACCOUNT_MANAGERS_TABLE")?.trim();
  const table = !raw || raw === "Account" ? "Account Managers" : raw;

  try {
    const records = await getRecords(table);
    for (const record of records) {
      const email = normalizeEmail(
        asString(record.fields[ACCOUNT_MANAGERS_TABLE_FIELDS.email]),
      );
      if (!email) {
        continue;
      }
      const status = asString(record.fields[ACCOUNT_MANAGERS_TABLE_FIELDS.status]);
      const comments = asString(
        record.fields[ACCOUNT_MANAGERS_TABLE_FIELDS.comments],
      );
      if (!isActiveAccountManagerForDigest(status, comments)) {
        continue;
      }
      byEmail.set(email, {
        email,
        fullName:
          asString(record.fields[ACCOUNT_MANAGERS_TABLE_FIELDS.name]) ?? email,
        accountManagerId: record.id,
      });
    }
  } catch (error) {
    console.error("[recipients] Account Managers digest load failed", error);
  }

  const users = await listUsers({ role: "account_manager", status: "active" });
  for (const user of users) {
    const email = normalizeEmail(user.email);
    if (!email) {
      continue;
    }
    const accountManagerId = user.accountManagerId ?? user.id;
    if (!accountManagerId) {
      continue;
    }
    if (!byEmail.has(email)) {
      byEmail.set(email, {
        email,
        fullName: user.fullName,
        accountManagerId,
      });
    }
  }

  return [...byEmail.values()].sort((a, b) =>
    a.fullName.localeCompare(b.fullName),
  );
}

/** Fan-out helper — sends the same template to many recipients. */
export async function fanOutEmail(
  recipients: string[],
  send: (to: string) => Promise<unknown>,
): Promise<{ attempted: number; sent: number }> {
  const unique = uniqueEmails(recipients);
  if (unique.length === 0) {
    return { attempted: 0, sent: 0 };
  }
  const results = await Promise.all(unique.map((to) => send(to)));
  return {
    attempted: unique.length,
    sent: results.filter(Boolean).length,
  };
}
