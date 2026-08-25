"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { revalidatePath } from "next/cache";

import { requirePermission, requireRole } from "@/lib/auth";
import {
  archiveClient,
  createClient,
  deleteClient,
  updateClient,
} from "@/features/clients/services";
import {
  clientFormSchema,
  type ClientFormValues,
} from "@/features/clients/schemas/client.schema";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; message: string; errors?: string[] };

function formToInput(values: ClientFormValues) {
  const accountManagerIds = Array.from(
    new Set(
      (values.accountManagerIds?.length
        ? values.accountManagerIds
        : values.accountManagerId
          ? [values.accountManagerId]
          : []
      ).filter(Boolean),
    ),
  );
  return {
    name: values.name,
    industry: values.industry || undefined,
    website: values.website || undefined,
    primaryContact: values.primaryContact || undefined,
    accountManagerIds,
    accountManagerId: accountManagerIds[0] ?? "",
    status: values.status === "archived" ? ("active" as const) : values.status,
    notes: values.notes ?? "",
    primaryAddress: values.primaryAddress ?? "",
    addresses: values.addresses ?? "",
    modeOfWork: values.modeOfWork ?? "",
    employeeSize: values.employeeSize ?? "",
    workDaysInWeek:
      values.workDaysInWeek === "" || values.workDaysInWeek === undefined
        ? null
        : Number(values.workDaysInWeek),
  };
}

function revalidateClientPaths(clientId?: string) {
  revalidatePath("/admin/clients");
  revalidatePath("/account-manager/clients");
  if (clientId) {
    revalidatePath(`/admin/clients/${clientId}`);
    revalidatePath(`/account-manager/clients/${clientId}`);
  }
}

export async function createClientAction(
  raw: ClientFormValues,
): Promise<ActionResult> {
  try {
    await requirePermission("manage_clients");
    await requireRole(["admin", "super_admin"]);
    const parsed = clientFormSchema.safeParse(raw);

    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((i) => i.message),
      };
    }

    const client = await createClient(formToInput(parsed.data));
    revalidateClientPaths(client.id);
    return { success: true, data: client };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to create client"),
    };
  }
}

export async function updateClientAction(
  clientId: string,
  raw: ClientFormValues,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("manage_clients");
    if (session.role === "account_manager") {
      const { assertAccountManagerOwnsClient, ScopeDeniedError } = await import(
        "@/lib/auth/scope"
      );
      try {
        await assertAccountManagerOwnsClient(session, clientId);
      } catch (error) {
        if (error instanceof ScopeDeniedError) {
          return { success: false, message: error.message };
        }
        throw error;
      }
    }

    const parsed = clientFormSchema.safeParse(raw);

    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((i) => i.message),
      };
    }

    // AMs cannot reassign Account Owner away from themselves.
    const input = formToInput(parsed.data);
    if (session.role === "account_manager") {
      const selfId = session.accountManagerId ?? session.userId;
      if (selfId && !input.accountManagerIds?.includes(selfId)) {
        input.accountManagerIds = [...(input.accountManagerIds ?? []), selfId];
      }
      input.accountManagerId = selfId ?? input.accountManagerId;
    }

    const client = await updateClient(clientId, input);
    revalidateClientPaths(clientId);
    return { success: true, data: client };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to update client"),
    };
  }
}

export async function archiveClientAction(
  clientId: string,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("archive_clients");
    if (session.role === "account_manager") {
      const { assertAccountManagerOwnsClient, ScopeDeniedError } = await import(
        "@/lib/auth/scope"
      );
      try {
        await assertAccountManagerOwnsClient(session, clientId);
      } catch (error) {
        if (error instanceof ScopeDeniedError) {
          return { success: false, message: error.message };
        }
        throw error;
      }
    }
    const client = await archiveClient(clientId);
    revalidateClientPaths(clientId);
    return { success: true, data: client };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to archive client"),
    };
  }
}

/**
 * Hard-delete a client from Airtable. Admin / Super Admin only.
 */
export async function deleteClientAction(
  clientId: string,
): Promise<ActionResult> {
  try {
    await requirePermission("manage_clients");
    await requireRole(["admin", "super_admin"]);
    await deleteClient(clientId);
    revalidateClientPaths(clientId);
    return { success: true, data: { id: clientId } };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to delete client"),
    };
  }
}

export async function uploadClientBriefDeckAction(
  clientId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("manage_clients");
    if (session.role === "account_manager") {
      const { assertAccountManagerOwnsClient, ScopeDeniedError } = await import(
        "@/lib/auth/scope"
      );
      try {
        await assertAccountManagerOwnsClient(session, clientId);
      } catch (error) {
        if (error instanceof ScopeDeniedError) {
          return { success: false, message: error.message };
        }
        throw error;
      }
    }

    const file = formData.get("ppt");
    if (!file || !(file instanceof File) || file.size === 0) {
      return { success: false, message: "Select a recruiter / client PPT" };
    }

    const {
      normalizeUploadContentType,
      validatePresentationUploadMeta,
    } = await import("@/lib/files/document-types");
    const metaError = validatePresentationUploadMeta({
      filename: file.name || "client-brief.ppt",
      contentType: file.type,
      size: file.size,
    });
    if (metaError) {
      return { success: false, message: metaError };
    }

    const { getUploadService } = await import("@/services/uploads");
    const { attachClientBriefDeck } = await import(
      "@/features/clients/services"
    );
    const upload = await getUploadService().upload({
      filename: file.name || "client-brief.ppt",
      contentType: normalizeUploadContentType(
        file.name || "client-brief.ppt",
        file.type,
      ),
      data: Buffer.from(await file.arrayBuffer()),
      size: file.size,
    });
    await attachClientBriefDeck(clientId, upload);
    revalidateClientPaths(clientId);
    return { success: true, data: { id: clientId } };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to upload client PPT"),
    };
  }
}
