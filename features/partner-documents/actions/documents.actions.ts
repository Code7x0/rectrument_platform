"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { revalidatePath } from "next/cache";

import { requirePermission, requireRole } from "@/lib/auth";
import {
  archivePartnerDocument,
  getDocumentById,
  rejectPartnerDocument,
  stageDocumentFile,
  uploadPartnerDocument,
  verifyPartnerDocument,
} from "@/features/partner-documents/services/documents.service";
import {
  documentTypeSchema,
  rejectDocumentSchema,
  validateDocumentFileMeta,
} from "@/features/partner-documents/schemas/document.schema";
import type { PartnerDocument } from "@/features/partner-documents/types";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; message: string; errors?: string[] };

function revalidateDocumentPaths(partnerId?: string) {
  revalidatePath("/admin/documents");
  revalidatePath("/account-manager/documents");
  revalidatePath("/partner/documents");
  if (partnerId) {
    revalidatePath(`/admin/partners/${partnerId}`);
  }
}

async function parseDocumentFile(formData: FormData) {
  const file = formData.get("file");
  if (!file || !(file instanceof File) || file.size === 0) {
    throw new Error("A document file is required");
  }

  const metaError = validateDocumentFileMeta({
    filename: file.name || "document",
    contentType: file.type || "application/octet-stream",
    size: file.size,
  });
  if (metaError) {
    throw new Error(metaError);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return stageDocumentFile({
    filename: file.name || "document",
    contentType: file.type || "application/octet-stream",
    data: buffer,
    size: file.size,
  });
}

/**
 * Partner upload / replace for own document slot.
 */
export async function uploadPartnerDocumentAction(
  formData: FormData,
): Promise<ActionResult<PartnerDocument>> {
  try {
    const session = await requirePermission("manage_own_documents");

    if (session.role !== "partner" || !session.partnerId) {
      return {
        success: false,
        message: "Only partners can upload their documents",
      };
    }

    const parsedType = documentTypeSchema.safeParse(
      String(formData.get("documentType") ?? ""),
    );
    if (!parsedType.success) {
      return { success: false, message: "Invalid document type" };
    }

    const upload = await parseDocumentFile(formData);
    const document = await uploadPartnerDocument({
      partnerId: session.partnerId,
      documentType: parsedType.data,
      upload,
    });

    revalidateDocumentPaths(session.partnerId);
    return { success: true, data: document };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to upload document"),
    };
  }
}

/**
 * Admin upload / replace on behalf of a partner (workspace).
 */
export async function uploadPartnerDocumentAsAdminAction(
  formData: FormData,
): Promise<ActionResult<PartnerDocument>> {
  try {
    await requirePermission("manage_partners");
    await requireRole(["admin", "super_admin"]);

    const partnerId = String(formData.get("partnerId") ?? "");
    if (!partnerId) {
      return { success: false, message: "Partner is required" };
    }

    const parsedType = documentTypeSchema.safeParse(
      String(formData.get("documentType") ?? ""),
    );
    if (!parsedType.success) {
      return { success: false, message: "Invalid document type" };
    }

    const upload = await parseDocumentFile(formData);
    const document = await uploadPartnerDocument({
      partnerId,
      documentType: parsedType.data,
      upload,
    });

    revalidateDocumentPaths(partnerId);
    return { success: true, data: document };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to upload document"),
    };
  }
}

export async function verifyPartnerDocumentAction(
  documentId: string,
): Promise<ActionResult<PartnerDocument>> {
  try {
    const session = await requirePermission("verify_documents");
    await requireRole(["admin", "super_admin"]);

    const document = await verifyPartnerDocument({
      documentId,
      actorUserId: session.userId,
    });

    revalidateDocumentPaths(document.partnerId);
    return { success: true, data: document };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to verify document"),
    };
  }
}

export async function rejectPartnerDocumentAction(
  documentId: string,
  rejectionReason: string,
): Promise<ActionResult<PartnerDocument>> {
  try {
    const session = await requirePermission("verify_documents");
    await requireRole(["admin", "super_admin"]);

    const parsed = rejectDocumentSchema.safeParse({
      documentId,
      rejectionReason,
    });
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => issue.message),
      };
    }

    const document = await rejectPartnerDocument({
      documentId: parsed.data.documentId,
      actorUserId: session.userId,
      rejectionReason: parsed.data.rejectionReason,
    });

    revalidateDocumentPaths(document.partnerId);
    return { success: true, data: document };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to reject document"),
    };
  }
}

export async function archivePartnerDocumentAction(
  documentId: string,
): Promise<ActionResult<PartnerDocument>> {
  try {
    await requirePermission("archive_documents");
    await requireRole(["admin", "super_admin"]);

    const existing = await getDocumentById(documentId);
    if (!existing) {
      return { success: false, message: "Document not found" };
    }

    const document = await archivePartnerDocument(documentId);
    revalidateDocumentPaths(existing.partnerId);
    return { success: true, data: document };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to archive document"),
    };
  }
}
