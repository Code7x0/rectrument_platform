import { z } from "zod";

import { ALL_NOTIFICATION_CATEGORIES } from "@/features/notifications/types";

const notificationChannelSchema = z.enum(["in_app", "email", "both", "none"]);

const categoryDefaultsSchema = z.object(
  Object.fromEntries(
    ALL_NOTIFICATION_CATEGORIES.map((category) => [
      category,
      notificationChannelSchema,
    ]),
  ) as Record<
    (typeof ALL_NOTIFICATION_CATEGORIES)[number],
    typeof notificationChannelSchema
  >,
);

export const companySettingsSchema = z.object({
  companyName: z.string().trim().min(2, "Company name is required").max(120),
  logoUrl: z.string().trim().optional(),
  primaryEmail: z.string().trim().email("Primary email is required"),
  supportEmail: z.string().trim().email("Support email is required"),
  timeZone: z.string().trim().min(2),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, "Use a 3-letter currency code"),
  country: z.string().trim().min(2),
  brandPrimaryColor: z.string().trim().optional(),
  brandSecondaryColor: z.string().trim().optional(),
  companyAddress: z.string().trim().optional(),
}).superRefine((value, ctx) => {
  if (value.logoUrl && value.logoUrl.length > 0) {
    const parsed = z.string().url().safeParse(value.logoUrl);
    if (!parsed.success) {
      ctx.addIssue({
        code: "custom",
        path: ["logoUrl"],
        message: "Enter a valid logo URL",
      });
    }
  }
});

export const usersDefaultsSchema = z.object({
  defaultPartnerRegistrationBehaviour: z.enum([
    "manual_approval",
    "auto_approve",
  ]),
  defaultIdentityVisibility: z.enum(["public", "private"]),
  invitationExpiryDays: z.number().int().min(1).max(90),
  requireActivationEmail: z.boolean(),
});

export const recruitmentSettingsSchema = z.object({
  defaultCandidateStatus: z.enum([
    "submitted",
    "internal_review",
    "client_review",
    "interview",
    "offer",
    "joined",
    "rejected",
  ]),
  interviewStageLabels: z
    .array(z.string().trim().min(1))
    .min(1)
    .max(12),
  requiredDocuments: z
    .array(z.enum(["pan", "aadhaar", "agreement"]))
    .min(1),
  defaultExpectedProfiles: z.number().int().min(1).max(100),
});

export const payoutSettingsSchema = z.object({
  defaultCurrency: z.string().trim().length(3),
  showPercentage: z.boolean(),
  decimalPrecision: z.number().int().min(0).max(4),
  dateFormat: z.enum(["MMM d, yyyy", "dd/MM/yyyy", "yyyy-MM-dd"]),
  taxEnabled: z.boolean(),
  commissionRulesEnabled: z.boolean(),
});

export const notificationPlatformSettingsSchema = z.object({
  defaultEmailEnabled: z.boolean(),
  defaultChannel: notificationChannelSchema,
  categoryDefaults: categoryDefaultsSchema,
});

export type CompanySettingsValues = z.infer<typeof companySettingsSchema>;
export type UsersDefaultsValues = z.infer<typeof usersDefaultsSchema>;
export type RecruitmentSettingsValues = z.infer<
  typeof recruitmentSettingsSchema
>;
export type PayoutSettingsValues = z.infer<typeof payoutSettingsSchema>;
export type NotificationPlatformSettingsValues = z.infer<
  typeof notificationPlatformSettingsSchema
>;
