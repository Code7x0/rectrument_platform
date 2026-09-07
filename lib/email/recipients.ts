import { getAdminEmails, getSuperAdminEmails } from "@/lib/airtable/identity-mode";
import { getRecords } from "@/lib/airtable/client";
import { asString } from "@/lib/airtable/compat";
import { ACCOUNT_MANAGERS_TABLE_FIELDS } from "@/lib/airtable/fields";
import { getOptionalEnv } from "@/lib/api/env";
import { listUsers } from "@/services/users";

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
