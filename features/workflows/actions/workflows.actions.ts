"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { revalidatePath } from "next/cache";

import { requirePermission, requireRole } from "@/lib/auth";
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
  revalidatePath("/admin/candidates");
  revalidatePath("/partner/candidates");
}

/**
 * AM-only status transition via Workflow Service.
 */
export async function transitionSubmissionAction(
  submissionId: string,
  toStatus: SubmissionStatus,
  note?: string,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("review_candidates");
    await requireRole(["account_manager"]);

    const submission = await transitionSubmissionStatus({
      submissionId,
      toStatus,
      actorUserId: session.userId,
      note,
    });

    revalidateReviewPaths();

    return { success: true, data: submission };
  } catch (error) {
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
