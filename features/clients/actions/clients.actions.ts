"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { revalidatePath } from "next/cache";

import { requirePermission, requireRole } from "@/lib/auth";
import {
  archiveClient,
  createClient,
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
    accountManagerId: values.accountManagerId || undefined,
    status: values.status === "archived" ? ("active" as const) : values.status,
    notes: values.notes || undefined,
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
    await requirePermission("manage_clients");
    const parsed = clientFormSchema.safeParse(raw);

    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((i) => i.message),
      };
    }

    const client = await updateClient(clientId, formToInput(parsed.data));
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
    await requirePermission("archive_clients");
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
