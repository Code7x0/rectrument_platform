"use server";

import { revalidatePath } from "next/cache";

import { actionErrorMessage } from "@/lib/actions/errors";
import {
  requirePermission,
  requireRole,
  resolveAccountManagerScopeId,
  resolvePartnerScopeId,
} from "@/lib/auth";
import {
  assertAccountManagerOwnsJob,
  ScopeDeniedError,
} from "@/lib/auth/scope";
import { findJobClaimById } from "@/features/job-claims/repositories/job-claims.repository";
import {
  approveJobClaim,
  createPartnerJobClaim,
  getPartnerAvailableJob,
  listJobClaimsForAccountManager,
  listJobClaimsForAdmin,
  listPartnerAvailableJobs,
  rejectJobClaim,
} from "@/features/job-claims/services/job-claims.service";
import type {
  JobClaim,
  JobClaimReviewItem,
  PartnerAvailableJob,
} from "@/features/job-claims/types";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; message: string };

function revalidateClaimPaths() {
  revalidatePath("/partner/available-jobs");
  revalidatePath("/partner/jobs");
  revalidatePath("/partner");
  revalidatePath("/partner/submit");
  revalidatePath("/partner/clients");
  revalidatePath("/account-manager/job-claims");
  revalidatePath("/account-manager/allocations");
  revalidatePath("/account-manager");
  revalidatePath("/admin/job-claims");
  revalidatePath("/admin/allocations");
  revalidatePath("/admin");
}

export async function listPartnerAvailableJobsAction(): Promise<
  ActionResult<PartnerAvailableJob[]>
> {
  try {
    const session = await requireRole(["partner"]);
    await requirePermission("view_own_allocations");
    const partnerId = resolvePartnerScopeId(session);
    if (!partnerId) {
      return { success: false, message: "Partner profile not linked" };
    }
    const jobs = await listPartnerAvailableJobs(partnerId);
    return { success: true, data: jobs };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to load available jobs"),
    };
  }
}

export async function getPartnerAvailableJobAction(
  jobId: string,
): Promise<ActionResult<PartnerAvailableJob | null>> {
  try {
    const session = await requireRole(["partner"]);
    const partnerId = resolvePartnerScopeId(session);
    if (!partnerId) {
      return { success: false, message: "Partner profile not linked" };
    }
    const job = await getPartnerAvailableJob(partnerId, jobId);
    return { success: true, data: job };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to load job"),
    };
  }
}

export async function claimJobAction(
  jobId: string,
): Promise<ActionResult<JobClaim>> {
  try {
    const session = await requireRole(["partner"]);
    await requirePermission("view_own_allocations");
    const partnerId = resolvePartnerScopeId(session);
    if (!partnerId) {
      return { success: false, message: "Partner profile not linked" };
    }
    if (!jobId?.trim()) {
      return { success: false, message: "Job is required" };
    }

    const claim = await createPartnerJobClaim({
      partnerId,
      jobId: jobId.trim(),
    });
    revalidateClaimPaths();
    return { success: true, data: claim };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to claim job"),
    };
  }
}

export async function listJobClaimsForReviewAction(): Promise<
  ActionResult<JobClaimReviewItem[]>
> {
  try {
    const session = await requirePermission("manage_allocations");
    await requireRole(["super_admin", "admin", "account_manager"]);

    if (session.role === "account_manager") {
      const amId = resolveAccountManagerScopeId(session);
      if (!amId) {
        return { success: false, message: "Account Manager scope missing" };
      }
      const items = await listJobClaimsForAccountManager(amId);
      return { success: true, data: items };
    }

    const items = await listJobClaimsForAdmin();
    return { success: true, data: items };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to load job claims"),
    };
  }
}

export async function approveJobClaimAction(
  claimId: string,
): Promise<ActionResult<{ claim: JobClaim; allocationId: string }>> {
  try {
    const session = await requirePermission("manage_allocations");
    await requireRole(["super_admin", "admin", "account_manager"]);

    const claim = await findJobClaimById(claimId);
    if (!claim) {
      return { success: false, message: "Claim not found" };
    }

    if (session.role === "account_manager") {
      const amId = resolveAccountManagerScopeId(session);
      if (claim.accountManagerId !== amId) {
        await assertAccountManagerOwnsJob(session, claim.jobId);
      }
    }

    const result = await approveJobClaim({
      claimId,
      reviewerUserId: session.userId,
      accountManagerId:
        session.role === "account_manager"
          ? resolveAccountManagerScopeId(session)
          : claim.accountManagerId,
    });
    revalidateClaimPaths();
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ScopeDeniedError) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to approve claim"),
    };
  }
}

export async function rejectJobClaimAction(
  claimId: string,
  reason?: string,
): Promise<ActionResult<JobClaim>> {
  try {
    const session = await requirePermission("manage_allocations");
    await requireRole(["super_admin", "admin", "account_manager"]);

    const claim = await findJobClaimById(claimId);
    if (!claim) {
      return { success: false, message: "Claim not found" };
    }

    if (session.role === "account_manager") {
      const amId = resolveAccountManagerScopeId(session);
      if (claim.accountManagerId !== amId) {
        await assertAccountManagerOwnsJob(session, claim.jobId);
      }
    }

    const result = await rejectJobClaim({
      claimId,
      reviewerUserId: session.userId,
      reason: reason ?? null,
    });
    revalidateClaimPaths();
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ScopeDeniedError) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: actionErrorMessage(error, "Unable to reject claim"),
    };
  }
}
