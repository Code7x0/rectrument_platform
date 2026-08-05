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
  return {
    name: values.name,
    industry: values.industry || undefined,
    website: values.website || undefined,
    primaryContact: values.primaryContact || undefined,
    // Empty string clears Account Owner — do not coerce to undefined.
    accountManagerId: values.accountManagerId ?? "",
    status: values.status === "archived" ? ("active" as const) : values.status,
    notes: values.notes ?? "",
    primaryAddress: values.primaryAddress ?? "",
    modeOfWork: values.modeOfWork ?? "",
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
      input.accountManagerId =
        session.accountManagerId ?? session.userId;
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
