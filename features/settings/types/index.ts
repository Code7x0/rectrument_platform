/**
 * Platform Settings — configurable defaults (not business-rule logic).
 */

import type { NotificationCategory, NotificationChannel } from "@/features/notifications/types";
import type { PartnerDocumentType } from "@/features/partner-documents/types";
import type { SubmissionStatus } from "@/features/shared/entities";
import type { IdentityVisibility } from "@/types";

export type SettingsSectionId =
  | "company"
  | "users"
  | "recruitment"
  | "payouts"
  | "notifications"
  | "security"
  | "integrations"
  | "system";

export interface CompanySettings {
  companyName: string;
  logoUrl: string | null;
  primaryEmail: string;
  supportEmail: string;
  timeZone: string;
  currency: string;
  country: string;
  /** Future-ready */
  brandPrimaryColor: string | null;
  brandSecondaryColor: string | null;
  companyAddress: string | null;
}

export type PartnerRegistrationBehaviour = "manual_approval" | "auto_approve";

export interface UsersDefaultsSettings {
  defaultPartnerRegistrationBehaviour: PartnerRegistrationBehaviour;
  defaultIdentityVisibility: IdentityVisibility;
  invitationExpiryDays: number;
  requireActivationEmail: boolean;
}

export interface RecruitmentSettings {
  defaultCandidateStatus: SubmissionStatus;
  interviewStageLabels: string[];
  requiredDocuments: PartnerDocumentType[];
  defaultExpectedProfiles: number;
}

export interface PayoutDisplaySettings {
  defaultCurrency: string;
  showPercentage: boolean;
  decimalPrecision: number;
  dateFormat: "MMM d, yyyy" | "dd/MM/yyyy" | "yyyy-MM-dd";
  /** Reserved for future tax / commission UI — not editable in this schema. */
  taxEnabled: boolean;
  commissionRulesEnabled: boolean;
}

export interface NotificationPlatformSettings {
  defaultEmailEnabled: boolean;
  defaultChannel: NotificationChannel;
  categoryDefaults: Record<NotificationCategory, NotificationChannel>;
}

export interface PlatformSettings {
  id: string;
  company: CompanySettings;
  users: UsersDefaultsSettings;
  recruitment: RecruitmentSettings;
  payouts: PayoutDisplaySettings;
  notifications: NotificationPlatformSettings;
  updatedAt: string | null;
  updatedByUserId: string | null;
}

export interface UserCountsSummary {
  active: number;
  inactive: number;
  total: number;
}

export interface IntegrationStatusItem {
  id: string;
  name: string;
  status: "connected" | "configured" | "not_configured" | "future";
  description: string;
}

export interface SystemDiagnostics {
  platformName: string;
  platformVersion: string;
  environment: string;
  nodeEnv: string;
  databaseStatus: "configured" | "missing_env";
  emailProvider: string;
  uploadProvider: string;
  activityService: "available" | "unavailable";
  notificationService: "available" | "unavailable";
  settingsPersistence: "airtable" | "defaults_only";
  buildTimestamp: string;
  typescriptMode: "strict";
}

export interface SecurityOverview {
  sessionProvider: string;
  passwordPolicy: string;
  auditLogStatus: string;
  activityRetention: string;
  notes: string[];
}

export const SETTINGS_SECTION_META: Record<
  SettingsSectionId,
  { title: string; description: string; href: string }
> = {
  company: {
    title: "Company",
    description: "Brand, contact, timezone, and currency.",
    href: "/settings/company",
  },
  users: {
    title: "Users & Roles",
    description: "Registration defaults and invitation behaviour.",
    href: "/settings/users",
  },
  recruitment: {
    title: "Recruitment",
    description: "Document requirements and allocation defaults.",
    href: "/settings/recruitment",
  },
  payouts: {
    title: "Payouts",
    description: "Display currency, precision, and date format.",
    href: "/settings/payouts",
  },
  notifications: {
    title: "Notifications",
    description: "Platform-wide notification defaults.",
    href: "/settings/notifications",
  },
  security: {
    title: "Security",
    description: "Session and audit overview (read-only).",
    href: "/settings/security",
  },
  integrations: {
    title: "Integrations",
    description: "Clerk, Airtable, email, and future connectors.",
    href: "/settings/integrations",
  },
  system: {
    title: "System",
    description: "Diagnostics for production debugging.",
    href: "/settings/system",
  },
};
