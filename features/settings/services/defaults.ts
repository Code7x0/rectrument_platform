import type {
  CompanySettings,
  NotificationPlatformSettings,
  PlatformSettings,
  PayoutDisplaySettings,
  RecruitmentSettings,
  UsersDefaultsSettings,
} from "@/features/settings/types";
import { DEFAULT_CATEGORY_CHANNELS } from "@/features/notifications/types";
import { APP_NAME } from "@/lib/constants";

export const PLATFORM_SETTINGS_KEY = "platform";

export function defaultCompanySettings(): CompanySettings {
  return {
    companyName: APP_NAME,
    logoUrl: null,
    primaryEmail: "admin@example.com",
    supportEmail: "support@example.com",
    timeZone: "Asia/Kolkata",
    currency: "INR",
    country: "India",
    brandPrimaryColor: null,
    brandSecondaryColor: null,
    companyAddress: null,
  };
}

export function defaultUsersSettings(): UsersDefaultsSettings {
  return {
    defaultPartnerRegistrationBehaviour: "manual_approval",
    defaultIdentityVisibility: "private",
    invitationExpiryDays: 7,
    requireActivationEmail: true,
  };
}

export function defaultRecruitmentSettings(): RecruitmentSettings {
  return {
    defaultCandidateStatus: "submitted",
    interviewStageLabels: [
      "Phone Screen",
      "Technical",
      "Hiring Manager",
      "Final",
    ],
    requiredDocuments: ["pan", "aadhaar", "agreement"],
    defaultExpectedProfiles: 3,
  };
}

export function defaultPayoutSettings(): PayoutDisplaySettings {
  return {
    defaultCurrency: "INR",
    showPercentage: true,
    decimalPrecision: 2,
    dateFormat: "MMM d, yyyy",
    taxEnabled: false,
    commissionRulesEnabled: false,
  };
}

export function defaultNotificationPlatformSettings(): NotificationPlatformSettings {
  return {
    defaultEmailEnabled: true,
    defaultChannel: "both",
    categoryDefaults: { ...DEFAULT_CATEGORY_CHANNELS },
  };
}

export function defaultPlatformSettings(): PlatformSettings {
  return {
    id: "virtual",
    company: defaultCompanySettings(),
    users: defaultUsersSettings(),
    recruitment: defaultRecruitmentSettings(),
    payouts: defaultPayoutSettings(),
    notifications: defaultNotificationPlatformSettings(),
    updatedAt: null,
    updatedByUserId: null,
  };
}

export function mergePlatformSettings(
  partial: Partial<PlatformSettings> | null | undefined,
): PlatformSettings {
  const base = defaultPlatformSettings();
  if (!partial) {
    return base;
  }
  return {
    id: partial.id ?? base.id,
    company: { ...base.company, ...(partial.company ?? {}) },
    users: { ...base.users, ...(partial.users ?? {}) },
    recruitment: {
      ...base.recruitment,
      ...(partial.recruitment ?? {}),
      interviewStageLabels:
        partial.recruitment?.interviewStageLabels ??
        base.recruitment.interviewStageLabels,
      requiredDocuments:
        partial.recruitment?.requiredDocuments ??
        base.recruitment.requiredDocuments,
    },
    payouts: { ...base.payouts, ...(partial.payouts ?? {}) },
    notifications: {
      ...base.notifications,
      ...(partial.notifications ?? {}),
      categoryDefaults: {
        ...base.notifications.categoryDefaults,
        ...(partial.notifications?.categoryDefaults ?? {}),
      },
    },
    updatedAt: partial.updatedAt ?? null,
    updatedByUserId: partial.updatedByUserId ?? null,
  };
}
