"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { revalidatePath } from "next/cache";

import { requirePermission, requireRole } from "@/lib/auth";
import {
  assertAccountManagerOwnsSubmission,
  ScopeDeniedError,
} from "@/lib/auth/scope";
import {
  InvalidTransitionError,
  transitionSubmissionStatus,
} from "@/features/workflows/services";
import type { SubmissionStatus } from "@/features/shared/entities";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; message: string };

function revalidateReviewPaths() {
  revalidatePath("/account-manager/candidates");
  revalidatePath("/account-manager");
  revalidatePath("/account-manager/payouts");
  revalidatePath("/admin/candidates");
  revalidatePath("/admin");
  revalidatePath("/admin/payouts");
  revalidatePath("/partner/candidates");
  revalidatePath("/partner");
  revalidatePath("/partner/payments");
  revalidatePath("/super-admin");
}

/**
 * Status transition via Workflow Service.
 * Admin / Super Admin: any submission. Account Manager: owned jobs only.
 */
export async function transitionSubmissionAction(
  submissionId: string,
  toStatus: SubmissionStatus,
  note?: string,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("review_candidates");
    await requireRole(["account_manager", "admin", "super_admin"]);
    await assertAccountManagerOwnsSubmission(session, submissionId);

    const submission = await transitionSubmissionStatus({
      submissionId,
      toStatus,
      actorUserId: session.userId,
      note,
    });

    revalidateReviewPaths();

    return { success: true, data: submission };
  } catch (error) {
    if (error instanceof ScopeDeniedError) {
      return { success: false, message: error.message };
    }
    if (error instanceof InvalidTransitionError) {
      return { success: false, message: actionErrorMessage(error, "Unable to complete action") };
    }
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to update submission status"),
    };
  }
}
