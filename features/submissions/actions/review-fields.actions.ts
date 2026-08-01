"use server";

import { actionErrorMessage } from "@/lib/actions/errors";
import { revalidatePath } from "next/cache";

import {
  getAppSession,
  requirePermission,
  requireRole,
  roleHasPermission,
} from "@/lib/auth";
import {
  assertAccountManagerOwnsSubmission,
  ScopeDeniedError,
} from "@/lib/auth/scope";
import {
  requestSecondLevelReview,
  updateSubmissionReviewFields,
  type UpdateSubmissionReviewFieldsInput,
} from "@/features/submissions/services";
import type { Submission } from "@/features/submissions/types";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; message: string };

function revalidateReviewPaths() {
  revalidatePath("/account-manager/candidates");
  revalidatePath("/account-manager");
  revalidatePath("/admin/candidates");
  revalidatePath("/admin");
  revalidatePath("/partner/candidates");
  revalidatePath("/partner");
  revalidatePath("/super-admin");
}

/**
 * Staff edit Interview Stage / Screening Matrix Notes / Internal Feedback.
 */
export async function updateSubmissionReviewFieldsAction(
  submissionId: string,
  input: UpdateSubmissionReviewFieldsInput,
): Promise<ActionResult<Submission>> {
  try {
    const session = await requirePermission("review_candidates");
    await requireRole(["account_manager", "admin", "super_admin"]);
    await assertAccountManagerOwnsSubmission(session, submissionId);

    const submission = await updateSubmissionReviewFields(submissionId, input);
    revalidateReviewPaths();
    return { success: true, data: submission };
  } catch (error) {
    if (error instanceof ScopeDeniedError) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to update review fields"),
    };
  }
}

/**
 * Partner (owner) or staff can request 2nd-level review after rejection.
 */
export async function requestSecondLevelReviewAction(
  submissionId: string,
): Promise<ActionResult<Submission>> {
  try {
    const session = await getAppSession();
    if (!session) {
      return { success: false, message: "Not authenticated" };
    }

    const isStaff =
      session.role === "admin" ||
      session.role === "super_admin" ||
      session.role === "account_manager";

    if (isStaff) {
      if (!roleHasPermission(session.role, "review_candidates")) {
        return { success: false, message: "Not allowed" };
      }
      await assertAccountManagerOwnsSubmission(session, submissionId);
    } else {
      if (
        session.role !== "partner" ||
        !session.partnerId ||
        !roleHasPermission(session.role, "submit_candidates")
      ) {
        return { success: false, message: "Not allowed" };
      }
    }

    const submission = await requestSecondLevelReview(submissionId, {
      partnerId: session.partnerId,
      isStaff,
    });
    revalidateReviewPaths();
    return { success: true, data: submission };
  } catch (error) {
    if (error instanceof ScopeDeniedError) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: actionErrorMessage(
        error,
        "Unable to request second level review",
      ),
    };
  }
}
