"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";

import { requirePermission, requireRole } from "@/lib/auth";
import {
  acceptInvitation,
  approvePartnerApplication,
  attachPartnerRegistrationDocument,
  changeUserRole,
  deactivateUser,
  finalizePartnerRegistration,
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
import type { PartnerDocumentType } from "@/features/partner-documents/types";
import type { User } from "@/types";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; message: string; errors?: string[] };

function revalidateUserPaths() {
  revalidatePath("/admin/approvals");
  revalidatePath("/admin/partners");
  revalidatePath("/super-admin");
  revalidatePath("/super-admin/users");
  revalidatePath("/super-admin/users");
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

  const { normalizeUploadContentType } = await import(
    "@/lib/files/document-types"
  );

  return {
    filename: file.name || key,
    contentType: normalizeUploadContentType(file.name || key, file.type),
    data: Buffer.from(await file.arrayBuffer()),
    size: file.size,
  };
}

/**
 * Public Talent Partner registration (no auth) — profile only.
 * Documents are uploaded one-at-a-time afterward.
 */
export async function registerTalentPartnerAction(
  formData: FormData,
): Promise<ActionResult<{ userId: string; partnerId: string }>> {
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
      agreementAccepted:
        formData.get("agreementAccepted") === "true" ||
        formData.get("agreementAccepted") === "on",
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

    const result = await submitPartnerRegistration(parsed.data);
    return {
      success: true,
      data: { userId: result.user.id, partnerId: result.partnerId },
    };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to submit registration"),
    };
  }
}

const REGISTRATION_DOC_TYPES = [
  "resume",
  "pan",
  "aadhaar",
  "agreement",
] as const;

/**
 * Upload a single registration document (keeps each request under Vercel body limit).
 */
export async function uploadPartnerRegistrationDocumentAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const partnerId = String(formData.get("partnerId") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const documentType = String(formData.get("documentType") ?? "").trim();
    if (!partnerId || !email) {
      return { success: false, message: "Registration session is missing" };
    }
    if (
      !(REGISTRATION_DOC_TYPES as readonly string[]).includes(documentType)
    ) {
      return { success: false, message: "Invalid document type" };
    }

    const file = await fileFromForm(formData, "file", true);
    if (!file) {
      return { success: false, message: "File is required" };
    }

    await attachPartnerRegistrationDocument({
      partnerId,
      email,
      documentType: documentType as PartnerDocumentType | "resume",
      file,
    });

    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to upload document"),
    };
  }
}

export async function finalizePartnerRegistrationAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const partnerId = String(formData.get("partnerId") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const experience = String(formData.get("experience") ?? "");
    const skills = String(formData.get("skills") ?? "");
    const identityVisibility = String(
      formData.get("identityVisibility") ?? "private",
    );
    if (!partnerId || !email) {
      return { success: false, message: "Registration session is missing" };
    }

    await finalizePartnerRegistration({
      partnerId,
      email,
      experience,
      skills,
      identityVisibility:
        identityVisibility === "public" ? "public" : "private",
    });

    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to finalize registration"),
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
