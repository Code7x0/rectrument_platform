import { cache } from "react";

import {
  findPlatformSettingsRecord,
  insertPlatformSettings,
  isSettingsTableConfigured,
  patchPlatformSettings,
} from "@/features/settings/repositories/settings.repository";
import {
  defaultPlatformSettings,
  mergePlatformSettings,
} from "@/features/settings/services/defaults";
import type {
  CompanySettings,
  IntegrationStatusItem,
  NotificationPlatformSettings,
  PlatformSettings,
  PayoutDisplaySettings,
  RecruitmentSettings,
  SecurityOverview,
  SystemDiagnostics,
  UserCountsSummary,
  UsersDefaultsSettings,
} from "@/features/settings/types";
import { APP_NAME } from "@/lib/constants";
import { getOptionalEnv } from "@/lib/api/env";
import { listUsers } from "@/services/users/users.service";
import type { AppSession, UserRole } from "@/types";
import { isAdmin, isSuperAdmin } from "@/lib/auth/permissions";

export function canAccessSettings(role: UserRole): boolean {
  return isAdmin(role);
}

export function canManageCompanySettings(role: UserRole): boolean {
  return isSuperAdmin(role);
}

/** Admin + Super Admin may edit operational defaults. */
export function canManageOperationalSettings(role: UserRole): boolean {
  return isAdmin(role);
}

export const getPlatformSettings = cache(
  async (): Promise<PlatformSettings> => {
    try {
      const existing = await findPlatformSettingsRecord();
      if (existing) {
        return existing;
      }
      return defaultPlatformSettings();
    } catch (error) {
      console.error("[settings] load failed", error);
      return defaultPlatformSettings();
    }
  },
);

async function persistSettings(
  next: PlatformSettings,
  actorUserId: string,
): Promise<PlatformSettings> {
  if (!isSettingsTableConfigured()) {
    throw new Error(
      "Configure AIRTABLE_SETTINGS_TABLE to persist platform settings",
    );
  }

  if (next.id === "virtual") {
    return insertPlatformSettings(next, actorUserId);
  }
  return patchPlatformSettings(next.id, next, actorUserId);
}

export async function updateCompanySettings(
  session: AppSession,
  input: CompanySettings,
): Promise<PlatformSettings> {
  if (!canManageCompanySettings(session.role)) {
    throw new Error("Only Super Admin may update company settings");
  }
  const current = await getPlatformSettings();
  const next = mergePlatformSettings({
    ...current,
    company: input,
  });
  const saved = await persistSettings(next, session.userId);

  try {
    const { notifyCompanySettingChanged } = await import(
      "@/features/notifications/services/notification-events"
    );
    notifyCompanySettingChanged({
      settingLabel: "Company settings",
      actorName: session.userId,
    });
  } catch {
    // non-blocking
  }

  return saved;
}

export async function updateUsersDefaultsSettings(
  session: AppSession,
  input: UsersDefaultsSettings,
): Promise<PlatformSettings> {
  if (!canManageOperationalSettings(session.role)) {
    throw new Error("Forbidden");
  }
  if (
    !canManageCompanySettings(session.role) &&
    input.defaultPartnerRegistrationBehaviour === "auto_approve"
  ) {
    throw new Error("Only Super Admin may enable auto-approve registration");
  }
  const current = await getPlatformSettings();
  const next = mergePlatformSettings({
    ...current,
    users: input,
  });
  return persistSettings(next, session.userId);
}

export async function updateRecruitmentSettings(
  session: AppSession,
  input: RecruitmentSettings,
): Promise<PlatformSettings> {
  if (!canManageOperationalSettings(session.role)) {
    throw new Error("Forbidden");
  }
  const current = await getPlatformSettings();
  const next = mergePlatformSettings({
    ...current,
    recruitment: input,
  });
  return persistSettings(next, session.userId);
}

export async function updatePayoutSettings(
  session: AppSession,
  input: PayoutDisplaySettings,
): Promise<PlatformSettings> {
  if (!canManageOperationalSettings(session.role)) {
    throw new Error("Forbidden");
  }
  const current = await getPlatformSettings();
  const next = mergePlatformSettings({
    ...current,
    payouts: input,
  });
  return persistSettings(next, session.userId);
}

export async function updateNotificationPlatformSettings(
  session: AppSession,
  input: NotificationPlatformSettings,
): Promise<PlatformSettings> {
  if (!canManageOperationalSettings(session.role)) {
    throw new Error("Forbidden");
  }
  const current = await getPlatformSettings();
  const next = mergePlatformSettings({
    ...current,
    notifications: input,
  });
  return persistSettings(next, session.userId);
}

export async function getUserCountsSummary(): Promise<UserCountsSummary> {
  try {
    const users = await listUsers();
    const active = users.filter((user) => user.status === "active").length;
    const inactive = users.filter((user) => user.status !== "active").length;
    return { active, inactive, total: users.length };
  } catch {
    return { active: 0, inactive: 0, total: 0 };
  }
}

export function getSecurityOverview(): SecurityOverview {
  return {
    sessionProvider: "Clerk",
    passwordPolicy:
      "Managed by Clerk — configure password policy and MFA in the Clerk Dashboard.",
    auditLogStatus: "Activity Service recording workflow and identity events.",
    activityRetention: "Retained in Airtable Activities (no purge job yet).",
    notes: [
      "Authentication flows are not configurable here.",
      "Password policy and MFA are owned by Clerk.",
      "Activity retention automation is future-ready.",
    ],
  };
}

export function getIntegrationsOverview(): IntegrationStatusItem[] {
  const airtableConfigured = Boolean(
    getOptionalEnv("AIRTABLE_API_KEY") && getOptionalEnv("AIRTABLE_BASE_ID"),
  );
  const clerkConfigured = Boolean(
    getOptionalEnv("CLERK_SECRET_KEY") &&
      getOptionalEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
  );
  const emailProvider = getOptionalEnv("EMAIL_PROVIDER") ?? "console";

  return [
    {
      id: "clerk",
      name: "Clerk",
      status: clerkConfigured ? "connected" : "not_configured",
      description: "Authentication and session management.",
    },
    {
      id: "airtable",
      name: "Airtable",
      status: airtableConfigured ? "connected" : "not_configured",
      description: "Primary application data store.",
    },
    {
      id: "email",
      name: "Email Provider",
      status: emailProvider === "console" ? "configured" : "connected",
      description: `Current provider: ${emailProvider} (abstraction only).`,
    },
    {
      id: "slack",
      name: "Slack",
      status: "future",
      description: "Workspace alerts — not connected.",
    },
    {
      id: "webhooks",
      name: "Webhooks",
      status: "future",
      description: "Outbound event webhooks — not connected.",
    },
    {
      id: "api_keys",
      name: "API Keys",
      status: "future",
      description: "Programmatic access keys — not connected.",
    },
  ];
}

export async function getSystemDiagnostics(): Promise<SystemDiagnostics> {
  const airtableConfigured = Boolean(
    getOptionalEnv("AIRTABLE_API_KEY") && getOptionalEnv("AIRTABLE_BASE_ID"),
  );
  let activityService: SystemDiagnostics["activityService"] = "unavailable";
  let notificationService: SystemDiagnostics["notificationService"] =
    "unavailable";

  try {
    const { listRecentActivities } = await import(
      "@/features/workflows/services/activity.service"
    );
    await listRecentActivities(1);
    activityService = "available";
  } catch {
    activityService = "unavailable";
  }

  try {
    const { getUnreadNotificationCount } = await import(
      "@/features/notifications/services"
    );
    await getUnreadNotificationCount("diagnostics");
    notificationService = "available";
  } catch {
    notificationService = "unavailable";
  }

  return {
    platformName: APP_NAME,
    platformVersion: process.env.npm_package_version ?? "0.1.0",
    environment: getOptionalEnv("VERCEL_ENV") ?? getOptionalEnv("APP_ENV") ?? "local",
    nodeEnv: process.env.NODE_ENV ?? "development",
    databaseStatus: airtableConfigured ? "configured" : "missing_env",
    emailProvider: getOptionalEnv("EMAIL_PROVIDER") ?? "console",
    uploadProvider: getOptionalEnv("UPLOAD_PROVIDER") ?? "airtable",
    activityService,
    notificationService,
    settingsPersistence: isSettingsTableConfigured()
      ? "airtable"
      : "defaults_only",
    buildTimestamp:
      getOptionalEnv("BUILD_TIMESTAMP") ??
      getOptionalEnv("VERCEL_GIT_COMMIT_SHA") ??
      new Date().toISOString(),
    typescriptMode: "strict",
  };
}

/**
 * Invitation TTL used by onboarding — reads platform settings with safe fallback.
 */
export async function getInvitationExpiryDays(): Promise<number> {
  const settings = await getPlatformSettings();
  return settings.users.invitationExpiryDays;
}
