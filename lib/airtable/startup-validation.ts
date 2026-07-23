/**
 * Production startup / health validation against live Airtable + env.
 * Uses official Airtable Meta REST API + SDK-facing env helpers.
 * MCP is never used here.
 */

import { getOptionalEnv, getRequiredEnv } from "@/lib/api/env";
import {
  getAirtableCompatMode,
  getAllocationsMode,
  getSubmissionsMode,
} from "@/lib/airtable/compat";
import {
  ACCOUNT_MANAGERS_TABLE_FIELDS,
  CANDIDATES_TABLE_FIELDS,
  CLIENTS_TABLE_FIELDS,
  JOBS_TABLE_FIELDS,
  PARTNERS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import { isClientIdentityMode } from "@/lib/airtable/identity-mode";

export type ValidationSeverity = "error" | "warning" | "ok";

export interface ValidationItem {
  id: string;
  severity: ValidationSeverity;
  message: string;
}

export interface StartupValidationResult {
  ok: boolean;
  checkedAt: string;
  items: ValidationItem[];
  summary: {
    errors: number;
    warnings: number;
    ok: number;
  };
}

type MetaField = { id: string; name: string; type?: string };
type MetaTable = { id: string; name: string; fields: MetaField[] };

const REQUIRED_CORE_TABLES = [
  { envKey: "AIRTABLE_CLIENTS_TABLE", label: "Clients", fields: CLIENTS_TABLE_FIELDS },
  { envKey: "AIRTABLE_JOBS_TABLE", label: "Jobs", fields: JOBS_TABLE_FIELDS },
  { envKey: "AIRTABLE_PARTNERS_TABLE", label: "Partners", fields: PARTNERS_TABLE_FIELDS },
  {
    envKey: "AIRTABLE_CANDIDATES_TABLE",
    label: "Candidates",
    fields: CANDIDATES_TABLE_FIELDS,
  },
] as const;

/** Critical field names that must exist on the live base for client mode. */
const CRITICAL_FIELDS: Record<string, string[]> = {
  Clients: [
    CLIENTS_TABLE_FIELDS.name,
    CLIENTS_TABLE_FIELDS.status,
    CLIENTS_TABLE_FIELDS.accountManager,
  ],
  Jobs: [
    JOBS_TABLE_FIELDS.title,
    JOBS_TABLE_FIELDS.client,
    JOBS_TABLE_FIELDS.status,
    JOBS_TABLE_FIELDS.partners,
  ],
  Partners: [
    PARTNERS_TABLE_FIELDS.companyName,
    PARTNERS_TABLE_FIELDS.email,
    PARTNERS_TABLE_FIELDS.status,
  ],
  Candidates: [
    CANDIDATES_TABLE_FIELDS.fullName,
    CANDIDATES_TABLE_FIELDS.job,
    CANDIDATES_TABLE_FIELDS.partner,
    CANDIDATES_TABLE_FIELDS.submissionStatus,
  ],
  "Account Managers": [
    ACCOUNT_MANAGERS_TABLE_FIELDS.name,
    ACCOUNT_MANAGERS_TABLE_FIELDS.email,
    ACCOUNT_MANAGERS_TABLE_FIELDS.status,
  ],
};

function push(
  items: ValidationItem[],
  id: string,
  severity: ValidationSeverity,
  message: string,
) {
  items.push({ id, severity, message });
}

function requireEnvPresent(items: ValidationItem[], key: string, purpose: string) {
  const value = getOptionalEnv(key)?.trim();
  if (!value) {
    push(items, `env:${key}`, "error", `Missing required env: ${key} (${purpose})`);
    return null;
  }
  push(items, `env:${key}`, "ok", `${key} is set`);
  return value;
}

async function fetchBaseTables(
  apiKey: string,
  baseId: string,
): Promise<MetaTable[]> {
  const response = await fetch(
    `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Airtable Meta API ${response.status}: ${body.slice(0, 200) || response.statusText}`,
    );
  }

  const json = (await response.json()) as { tables?: MetaTable[] };
  return json.tables ?? [];
}

/**
 * Validate env + live Airtable schema for production readiness.
 */
export async function validateStartupConfiguration(): Promise<StartupValidationResult> {
  const items: ValidationItem[] = [];

  // --- Clerk ---
  requireEnvPresent(items, "CLERK_SECRET_KEY", "Clerk server auth");
  requireEnvPresent(
    items,
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "Clerk client auth",
  );

  // --- Airtable credentials ---
  const apiKey = requireEnvPresent(items, "AIRTABLE_API_KEY", "Airtable SDK");
  const baseId = requireEnvPresent(items, "AIRTABLE_BASE_ID", "Airtable base");

  // --- Compat modes ---
  const compat = getAirtableCompatMode();
  const allocationsMode = getAllocationsMode();
  const submissionsMode = getSubmissionsMode();
  push(
    items,
    "mode:compat",
    compat === "client" ? "ok" : "warning",
    `AIRTABLE_COMPAT_MODE=${compat}`,
  );
  push(
    items,
    "mode:allocations",
    allocationsMode === "job_partners" ? "ok" : "warning",
    `AIRTABLE_ALLOCATIONS_MODE=${allocationsMode}`,
  );
  push(
    items,
    "mode:submissions",
    submissionsMode === "candidates" ? "ok" : "warning",
    `AIRTABLE_SUBMISSIONS_MODE=${submissionsMode}`,
  );

  // --- Core table env names ---
  for (const table of REQUIRED_CORE_TABLES) {
    requireEnvPresent(items, table.envKey, `${table.label} table name`);
  }

  const amTable =
    getOptionalEnv("AIRTABLE_ACCOUNT_MANAGERS_TABLE")?.trim() ||
    "Account Managers";
  if (!getOptionalEnv("AIRTABLE_ACCOUNT_MANAGERS_TABLE")?.trim()) {
    push(
      items,
      "env:AIRTABLE_ACCOUNT_MANAGERS_TABLE",
      "warning",
      `AIRTABLE_ACCOUNT_MANAGERS_TABLE unset — defaulting to "${amTable}"`,
    );
  } else {
    push(
      items,
      "env:AIRTABLE_ACCOUNT_MANAGERS_TABLE",
      "ok",
      `AIRTABLE_ACCOUNT_MANAGERS_TABLE=${amTable}`,
    );
  }

  // --- Identity ---
  if (isClientIdentityMode()) {
    push(
      items,
      "identity:mode",
      "ok",
      "Client identity mode (no Users table — Partners + Account Managers + env roles)",
    );
    const sa = getOptionalEnv("AIRTABLE_SUPER_ADMIN_EMAILS")?.trim();
    const admins = getOptionalEnv("AIRTABLE_ADMIN_EMAILS")?.trim();
    if (!sa) {
      push(
        items,
        "env:AIRTABLE_SUPER_ADMIN_EMAILS",
        "error",
        "AIRTABLE_SUPER_ADMIN_EMAILS is required when Users table is blank",
      );
    } else {
      push(
        items,
        "env:AIRTABLE_SUPER_ADMIN_EMAILS",
        "ok",
        `Super Admin emails configured (${sa.split(",").length} entr${sa.includes(",") ? "ies" : "y"})`,
      );
    }
    if (!admins) {
      push(
        items,
        "env:AIRTABLE_ADMIN_EMAILS",
        "warning",
        "AIRTABLE_ADMIN_EMAILS is empty — no Admin users via env allow-list",
      );
    } else {
      push(
        items,
        "env:AIRTABLE_ADMIN_EMAILS",
        "ok",
        `Admin emails configured (${admins.split(",").length} entr${admins.includes(",") ? "ies" : "y"})`,
      );
    }
  } else {
    try {
      getRequiredEnv("AIRTABLE_USERS_TABLE");
      push(items, "identity:mode", "ok", "Users table identity mode");
    } catch {
      push(
        items,
        "identity:mode",
        "error",
        "Users table expected but AIRTABLE_USERS_TABLE is missing",
      );
    }
  }

  // --- Optional blank tables (client mode) ---
  const optionalBlank = [
    "AIRTABLE_USERS_TABLE",
    "AIRTABLE_ALLOCATIONS_TABLE",
    "AIRTABLE_SUBMISSIONS_TABLE",
    "AIRTABLE_DOCUMENTS_TABLE",
    "AIRTABLE_PAYOUTS_TABLE",
    "AIRTABLE_ACTIVITIES_TABLE",
    "AIRTABLE_NOTIFICATIONS_TABLE",
    "AIRTABLE_NOTIFICATION_PREFERENCES_TABLE",
    "AIRTABLE_SETTINGS_TABLE",
  ];
  for (const key of optionalBlank) {
    const value = getOptionalEnv(key)?.trim();
    if (!value) {
      push(
        items,
        `env:${key}`,
        "ok",
        `${key} blank — soft-fail / derived (expected for locked client base)`,
      );
    } else {
      push(
        items,
        `env:${key}`,
        "warning",
        `${key}=${value} — table must exist on the base`,
      );
    }
  }

  // --- Live Airtable: Meta (schema) + Data (SDK path) ---
  if (apiKey && baseId) {
    try {
      const tables = await fetchBaseTables(apiKey, baseId);
      push(
        items,
        "airtable:connect",
        "ok",
        `Connected to base ${baseId} (${tables.length} tables)`,
      );

      const byName = new Map(tables.map((t) => [t.name, t]));

      const expectedNames = [
        getOptionalEnv("AIRTABLE_CLIENTS_TABLE")?.trim() || "Clients",
        getOptionalEnv("AIRTABLE_JOBS_TABLE")?.trim() || "Jobs",
        getOptionalEnv("AIRTABLE_PARTNERS_TABLE")?.trim() || "Partners",
        getOptionalEnv("AIRTABLE_CANDIDATES_TABLE")?.trim() || "Candidates",
        amTable,
      ];

      for (const name of expectedNames) {
        const table = byName.get(name);
        if (!table) {
          push(
            items,
            `table:${name}`,
            "error",
            `Required table "${name}" not found in base`,
          );
          continue;
        }
        push(items, `table:${name}`, "ok", `Table "${name}" present`);

        const fieldNames = new Set(table.fields.map((f) => f.name));
        const critical = CRITICAL_FIELDS[name] ?? [];
        for (const field of critical) {
          if (!fieldNames.has(field)) {
            push(
              items,
              `field:${name}:${field}`,
              "error",
              `Missing critical field "${field}" on "${name}"`,
            );
          } else {
            push(
              items,
              `field:${name}:${field}`,
              "ok",
              `"${name}"."${field}" present`,
            );
          }
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to connect to Airtable Meta API";
      // Meta often needs schema.bases:read — warn, then probe data API.
      push(
        items,
        "airtable:meta",
        message.includes("403") || message.includes("INVALID_PERMISSIONS")
          ? "warning"
          : "error",
        `Meta API: ${message}. Data API probe runs next.`,
      );
    }

    // Data API probe via official SDK wrappers (runtime path)
    try {
      const { getRecords } = await import("@/lib/airtable/client");
      const clientsTable =
        getOptionalEnv("AIRTABLE_CLIENTS_TABLE")?.trim() || "Clients";
      await getRecords(clientsTable, { maxRecords: 1 });
      push(
        items,
        "airtable:data",
        "ok",
        `Data API OK — listed "${clientsTable}" via Airtable SDK`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Data API probe failed";
      push(
        items,
        "airtable:data",
        "error",
        `Data API failed: ${message}. Check AIRTABLE_API_KEY scopes and base access for ${baseId}.`,
      );
    }
  }

  const errors = items.filter((i) => i.severity === "error").length;
  const warnings = items.filter((i) => i.severity === "warning").length;
  const ok = items.filter((i) => i.severity === "ok").length;

  return {
    ok: errors === 0,
    checkedAt: new Date().toISOString(),
    items,
    summary: { errors, warnings, ok },
  };
}
