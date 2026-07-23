"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth";
import {
  canAccessSettings,
  updateCompanySettings,
  updateNotificationPlatformSettings,
  updatePayoutSettings,
  updateRecruitmentSettings,
  updateUsersDefaultsSettings,
} from "@/features/settings/services";
import {
  companySettingsSchema,
  notificationPlatformSettingsSchema,
  payoutSettingsSchema,
  recruitmentSettingsSchema,
  usersDefaultsSchema,
} from "@/features/settings/schemas/settings.schema";
import type { PlatformSettings } from "@/features/settings/types";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; message: string };

function revalidateSettings() {
  revalidatePath("/settings");
  revalidatePath("/settings/company");
  revalidatePath("/settings/users");
  revalidatePath("/settings/recruitment");
  revalidatePath("/settings/payouts");
  revalidatePath("/settings/notifications");
  revalidatePath("/settings/security");
  revalidatePath("/settings/integrations");
  revalidatePath("/settings/system");
}

async function requireSettingsSession() {
  const session = await requireAuth();
  if (!canAccessSettings(session.role)) {
    throw new Error("Forbidden");
  }
  return session;
}

export async function updateCompanySettingsAction(
  input: unknown,
): Promise<ActionResult<PlatformSettings>> {
  try {
    const session = await requireSettingsSession();
    const parsed = companySettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Invalid company settings" };
    }
    const data = await updateCompanySettings(session, {
      companyName: parsed.data.companyName,
      logoUrl: parsed.data.logoUrl?.trim() ? parsed.data.logoUrl.trim() : null,
      primaryEmail: parsed.data.primaryEmail,
      supportEmail: parsed.data.supportEmail,
      timeZone: parsed.data.timeZone,
      currency: parsed.data.currency,
      country: parsed.data.country,
      brandPrimaryColor: parsed.data.brandPrimaryColor?.trim()
        ? parsed.data.brandPrimaryColor.trim()
        : null,
      brandSecondaryColor: parsed.data.brandSecondaryColor?.trim()
        ? parsed.data.brandSecondaryColor.trim()
        : null,
      companyAddress: parsed.data.companyAddress?.trim()
        ? parsed.data.companyAddress.trim()
        : null,
    });
    revalidateSettings();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to save company settings"),
    };
  }
}

export async function updateUsersDefaultsAction(
  input: unknown,
): Promise<ActionResult<PlatformSettings>> {
  try {
    const session = await requireSettingsSession();
    const parsed = usersDefaultsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Invalid user defaults" };
    }
    const data = await updateUsersDefaultsSettings(session, parsed.data);
    revalidateSettings();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to save user defaults"),
    };
  }
}

export async function updateRecruitmentSettingsAction(
  input: unknown,
): Promise<ActionResult<PlatformSettings>> {
  try {
    const session = await requireSettingsSession();
    const parsed = recruitmentSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Invalid recruitment settings" };
    }
    const data = await updateRecruitmentSettings(session, parsed.data);
    revalidateSettings();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to save recruitment settings"),
    };
  }
}

export async function updatePayoutSettingsAction(
  input: unknown,
): Promise<ActionResult<PlatformSettings>> {
  try {
    const session = await requireSettingsSession();
    const parsed = payoutSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Invalid payout settings" };
    }
    const data = await updatePayoutSettings(session, parsed.data);
    revalidateSettings();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to save payout settings"),
    };
  }
}

export async function updateNotificationPlatformSettingsAction(
  input: unknown,
): Promise<ActionResult<PlatformSettings>> {
  try {
    const session = await requireSettingsSession();
    const parsed = notificationPlatformSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Invalid notification settings" };
    }
    const data = await updateNotificationPlatformSettings(
      session,
      parsed.data,
    );
    revalidateSettings();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to save notification settings"),
    };
  }
}
