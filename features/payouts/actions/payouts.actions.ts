"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { revalidatePath } from "next/cache";

import { requirePermission, requireRole } from "@/lib/auth";
import {
  InvalidPayoutTransitionError,
  updatePayoutNotes,
  updatePayoutStatus,
} from "@/features/payouts/services";
import {
  updatePayoutNotesSchema,
  updatePayoutStatusSchema,
} from "@/features/payouts/schemas/payout.schema";
import type { Payout, PayoutStatus } from "@/features/payouts/types";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; message: string; errors?: string[] };

function revalidatePayoutPaths() {
  revalidatePath("/admin/payouts");
  revalidatePath("/account-manager/payouts");
  revalidatePath("/partner/payments");
  revalidatePath("/partner/candidates");
}

export async function updatePayoutStatusAction(
  payoutId: string,
  payoutStatus: PayoutStatus,
  options?: {
    amount?: number;
    currency?: string;
    eligibleDate?: string;
    paidDate?: string;
    notes?: string;
  },
): Promise<ActionResult<Payout>> {
  try {
    const session = await requirePermission("view_payouts");

    const isAdmin = session.role === "admin";
    const isAm = session.role === "account_manager";

    if (!isAdmin && !isAm) {
      return { success: false, message: "Forbidden" };
    }

    if (!isAdmin) {
      await requirePermission("update_payouts");
    } else {
      await requirePermission("manage_payouts");
    }

    const parsed = updatePayoutStatusSchema.safeParse({
      payoutId,
      payoutStatus,
      ...options,
    });

    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => issue.message),
      };
    }

    const payout = await updatePayoutStatus({
      payoutId: parsed.data.payoutId,
      toStatus: parsed.data.payoutStatus,
      actorUserId: session.userId,
      role: isAdmin ? "admin" : "account_manager",
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      eligibleDate: parsed.data.eligibleDate,
      paidDate: parsed.data.paidDate,
      notes: parsed.data.notes,
    });

    revalidatePayoutPaths();
    return { success: true, data: payout };
  } catch (error) {
    if (error instanceof InvalidPayoutTransitionError) {
      return { success: false, message: actionErrorMessage(error, "Unable to complete action") };
    }
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to update payout"),
    };
  }
}

export async function updatePayoutNotesAction(
  payoutId: string,
  notes: string,
): Promise<ActionResult<Payout>> {
  try {
    const session = await requirePermission("view_payouts");
    if (session.role === "partner") {
      return { success: false, message: "Forbidden" };
    }

    if (session.role === "admin") {
      await requirePermission("manage_payouts");
    } else {
      await requirePermission("update_payouts");
    }

    const parsed = updatePayoutNotesSchema.safeParse({ payoutId, notes });
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => issue.message),
      };
    }

    const payout = await updatePayoutNotes(parsed.data.payoutId, parsed.data.notes);
    revalidatePayoutPaths();
    return { success: true, data: payout };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to update notes"),
    };
  }
}

export async function markPayoutPaidAction(
  payoutId: string,
  options?: { paidDate?: string; notes?: string },
): Promise<ActionResult<Payout>> {
  try {
    await requirePermission("manage_payouts");
    await requireRole(["admin", "super_admin"]);
    return await updatePayoutStatusAction(payoutId, "paid", options);
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to mark payout paid"),
    };
  }
}

export async function markPayoutCompletedAction(
  payoutId: string,
  options?: { notes?: string },
): Promise<ActionResult<Payout>> {
  try {
    await requirePermission("manage_payouts");
    await requireRole(["admin", "super_admin"]);
    return await updatePayoutStatusAction(payoutId, "completed", options);
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to mark payout completed"),
    };
  }
}
