"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { revalidatePath } from "next/cache";

import { requirePermission, requireRole } from "@/lib/auth";
import {
  archivePartner,
  createPartner,
  updatePartner,
} from "@/features/partners/services";
import {
  partnerFormSchema,
  type PartnerFormValues,
} from "@/features/partners/schemas/partner.schema";
import {
  partnerSelfProfileSchema,
  type PartnerSelfProfileValues,
} from "@/features/partners/schemas/partner-self-profile.schema";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; message: string; errors?: string[] };

function formToInput(values: PartnerFormValues) {
  const rating =
    typeof values.rating === "number" && Number.isFinite(values.rating)
      ? values.rating
      : undefined;

  return {
    companyName: values.companyName,
    contactName: values.contactName || undefined,
    email: values.email || undefined,
    phone: values.phone || undefined,
    specialization: values.specialization || undefined,
    revenueShare: values.revenueShare || undefined,
    rating,
    status:
      values.status === "archived" ? ("pending" as const) : values.status,
    verificationStatus: values.verificationStatus,
    notes: values.notes || undefined,
  };
}

function revalidatePartnerPaths(partnerId?: string) {
  revalidatePath("/admin/partners");
  if (partnerId) {
    revalidatePath(`/admin/partners/${partnerId}`);
  }
}

export async function createPartnerAction(
  raw: PartnerFormValues,
): Promise<ActionResult> {
  try {
    await requirePermission("manage_partners");
    await requireRole(["admin", "super_admin"]);
    const parsed = partnerFormSchema.safeParse(raw);

    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((i) => i.message),
      };
    }

    const partner = await createPartner(formToInput(parsed.data));
    revalidatePartnerPaths(partner.id);
    return { success: true, data: partner };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to create partner"),
    };
  }
}

export async function updatePartnerAction(
  partnerId: string,
  raw: PartnerFormValues,
): Promise<ActionResult> {
  try {
    await requirePermission("manage_partners");
    await requireRole(["admin", "super_admin"]);
    const parsed = partnerFormSchema.safeParse(raw);

    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((i) => i.message),
      };
    }

    const partner = await updatePartner(partnerId, formToInput(parsed.data));
    revalidatePartnerPaths(partnerId);
    return { success: true, data: partner };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to update partner"),
    };
  }
}

export async function archivePartnerAction(
  partnerId: string,
): Promise<ActionResult> {
  try {
    await requirePermission("archive_partners");
    await requireRole(["admin", "super_admin"]);
    const partner = await archivePartner(partnerId);
    revalidatePartnerPaths(partnerId);
    return { success: true, data: partner };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to archive partner"),
    };
  }
}

/** Talent Partner updates their own contact profile (not status/verification). */
export async function updateOwnPartnerProfileAction(
  raw: PartnerSelfProfileValues,
): Promise<ActionResult> {
  try {
    const session = await requireRole(["partner"]);
    if (!session.partnerId) {
      return { success: false, message: "Partner identity not linked" };
    }

    const parsed = partnerSelfProfileSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((i) => i.message),
      };
    }

    const partner = await updatePartner(session.partnerId, {
      companyName: parsed.data.companyName,
      contactName: parsed.data.contactName || undefined,
      email: parsed.data.email || undefined,
      phone: parsed.data.phone || undefined,
      specialization: parsed.data.specialization || undefined,
      notes: parsed.data.notes || undefined,
    });

    revalidatePath("/partner/profile");
    revalidatePath("/partner");
    return { success: true, data: partner };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to update profile"),
    };
  }
}
