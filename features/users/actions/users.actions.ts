"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";

import { requirePermission, requireRole } from "@/lib/auth";
import {
  acceptInvitation,
  approvePartnerApplication,
  changeUserRole,
  deactivateUser,
  inviteStaffUser,
  rejectPartnerApplication,
  resetUserAccess,
  submitPartnerRegistration,
  updatePartnerIdentityVisibility,
} from "@/features/users/services";
import {
  changeRoleSchema,
  inviteStaffSchema,
  partnerRegistrationSchema,
  rejectPartnerSchema,
  updateIdentityVisibilitySchema,
} from "@/features/users/schemas/users.schema";
import { validateDocumentFileMeta } from "@/features/partner-documents/schemas/document.schema";
import type { User } from "@/types";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; message: string; errors?: string[] };

function revalidateUserPaths() {
  revalidatePath("/admin/approvals");
  revalidatePath("/admin/partners");
  revalidatePath("/super-admin");
  revalidatePath("/super-admin/users");
  revalidatePath("/super-admin/invitations");
}

async function fileFromForm(
  formData: FormData,
  key: string,
  required: boolean,
): Promise<{
  filename: string;
  contentType: string;
  data: Buffer;
  size: number;
} | null> {
  const file = formData.get(key);
  if (!file || !(file instanceof File) || file.size === 0) {
    if (required) {
      throw new Error(`${key} file is required`);
    }
    return null;
  }

  const metaError = validateDocumentFileMeta({
    filename: file.name || key,
    contentType: file.type || "application/octet-stream",
    size: file.size,
  });
  if (metaError) {
    throw new Error(`${key}: ${metaError}`);
  }

  return {
    filename: file.name || key,
    contentType: file.type || "application/octet-stream",
    data: Buffer.from(await file.arrayBuffer()),
    size: file.size,
  };
}

/**
 * Public Talent Partner registration (no auth).
 */
export async function registerTalentPartnerAction(
  formData: FormData,
): Promise<ActionResult<{ userId: string }>> {
  try {
    const raw = {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      city: String(formData.get("city") ?? ""),
      state: String(formData.get("state") ?? ""),
      skills: String(formData.get("skills") ?? ""),
      experience: String(formData.get("experience") ?? ""),
      bankDetails: String(formData.get("bankDetails") ?? ""),
      identityVisibility: String(formData.get("identityVisibility") ?? "private"),
      agreementAccepted: formData.get("agreementAccepted") === "true" || formData.get("agreementAccepted") === "on",
    };

    const parsed = partnerRegistrationSchema.safeParse({
      ...raw,
      agreementAccepted: raw.agreementAccepted ? true : false,
    });
    if (!parsed.success) {
      return {
        success: false,
        message: "Please fix the highlighted fields",
        errors: parsed.error.issues.map((i) => i.message),
      };
    }

    const pan = await fileFromForm(formData, "pan", true);
    const aadhaar = await fileFromForm(formData, "aadhaar", true);
    const agreement = await fileFromForm(formData, "agreement", true);
    const resume = await fileFromForm(formData, "resume", false);

    if (!pan || !aadhaar || !agreement) {
      return { success: false, message: "PAN, Aadhaar, and Agreement are required" };
    }

    const result = await submitPartnerRegistration(parsed.data, {
      pan,
      aadhaar,
      agreement,
      resume: resume ?? undefined,
    });

    return { success: true, data: { userId: result.user.id } };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to submit registration"),
    };
  }
}

export async function approvePartnerAction(
  userId: string,
): Promise<ActionResult<User>> {
  try {
    const session = await requirePermission("approve_partners");
    const user = await approvePartnerApplication(userId, session.userId);
    revalidateUserPaths();
    return { success: true, data: user };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to approve"),
    };
  }
}

export async function rejectPartnerAction(
  userId: string,
  reason: string,
): Promise<ActionResult<User>> {
  try {
    const session = await requirePermission("approve_partners");
    const parsed = rejectPartnerSchema.safeParse({ userId, reason });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Invalid rejection",
      };
    }
    const user = await rejectPartnerApplication(
      userId,
      session.userId,
      parsed.data.reason,
    );
    revalidateUserPaths();
    return { success: true, data: user };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to reject"),
    };
  }
}

export async function inviteStaffAction(
  input: unknown,
): Promise<ActionResult<User>> {
  try {
    const session = await requirePermission("invite_staff");
    await requireRole("super_admin");
    const parsed = inviteStaffSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: "Invalid invitation details",
        errors: parsed.error.issues.map((i) => i.message),
      };
    }
    const user = await inviteStaffUser(parsed.data, session.userId);
    revalidateUserPaths();
    return { success: true, data: user };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to send invitation"),
    };
  }
}

export async function acceptInvitationAction(
  token: string,
): Promise<ActionResult<User>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        message: "Sign in with Clerk using your invited email first",
      };
    }
    const user = await acceptInvitation(token, userId);
    revalidateUserPaths();
    return { success: true, data: user };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to accept invitation"),
    };
  }
}

export async function changeRoleAction(
  input: unknown,
): Promise<ActionResult<User>> {
  try {
    const session = await requirePermission("manage_roles");
    await requireRole("super_admin");
    const parsed = changeRoleSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Invalid role change" };
    }
    const user = await changeUserRole(
      parsed.data.userId,
      parsed.data.toRole,
      session.userId,
    );
    revalidateUserPaths();
    return { success: true, data: user };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to change role"),
    };
  }
}

export async function deactivateUserAction(
  userId: string,
): Promise<ActionResult<User>> {
  try {
    const session = await requirePermission("manage_roles");
    await requireRole("super_admin");
    const user = await deactivateUser(userId, session.userId);
    revalidateUserPaths();
    return { success: true, data: user };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to deactivate"),
    };
  }
}

export async function resetUserAccessAction(
  userId: string,
): Promise<ActionResult<User>> {
  try {
    const session = await requirePermission("manage_roles");
    await requireRole("super_admin");
    const user = await resetUserAccess(userId, session.userId);
    revalidateUserPaths();
    return { success: true, data: user };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to reset access"),
    };
  }
}

export async function updateIdentityVisibilityAction(
  input: unknown,
): Promise<ActionResult<{ ok: true }>> {
  try {
    const session = await requirePermission("manage_identity_visibility");
    const parsed = updateIdentityVisibilitySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Invalid visibility update" };
    }
    await updatePartnerIdentityVisibility(
      parsed.data.partnerId,
      parsed.data.identityVisibility,
      session.userId,
    );
    revalidateUserPaths();
    revalidatePath(`/admin/partners/${parsed.data.partnerId}`);
    return { success: true, data: { ok: true } };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to update identity visibility"),
    };
  }
}
