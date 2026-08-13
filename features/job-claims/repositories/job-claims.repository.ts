import {
  newClaimId,
  readJobClaimsStore,
  withJobClaimsStore,
} from "@/features/job-claims/lib/claim-store";
import type {
  JobClaim,
  JobClaimStatus,
} from "@/features/job-claims/types";

export async function listAllJobClaims(): Promise<JobClaim[]> {
  const store = await readJobClaimsStore();
  return store.claims;
}

export async function listJobClaimsForPartner(
  partnerId: string,
): Promise<JobClaim[]> {
  const claims = await listAllJobClaims();
  return claims.filter((claim) => claim.partnerId === partnerId);
}

export async function listPendingJobClaims(): Promise<JobClaim[]> {
  const claims = await listAllJobClaims();
  return claims.filter((claim) => claim.status === "pending");
}

export async function findJobClaimById(
  claimId: string,
): Promise<JobClaim | null> {
  const claims = await listAllJobClaims();
  return claims.find((claim) => claim.id === claimId) ?? null;
}

export async function findActiveClaimForPartnerJob(
  partnerId: string,
  jobId: string,
): Promise<JobClaim | null> {
  const claims = await listJobClaimsForPartner(partnerId);
  const pending = claims.find(
    (claim) => claim.jobId === jobId && claim.status === "pending",
  );
  if (pending) {
    return pending;
  }
  const approved = claims.find(
    (claim) => claim.jobId === jobId && claim.status === "approved",
  );
  return approved ?? null;
}

export async function insertJobClaim(input: {
  partnerId: string;
  jobId: string;
  accountManagerId: string | null;
}): Promise<JobClaim> {
  return withJobClaimsStore((store) => {
    const duplicate = store.claims.find(
      (claim) =>
        claim.partnerId === input.partnerId &&
        claim.jobId === input.jobId &&
        (claim.status === "pending" || claim.status === "approved"),
    );
    if (duplicate) {
      if (duplicate.status === "pending") {
        throw new Error("You already have a pending claim for this job");
      }
      throw new Error("This job is already assigned to you");
    }

    const claim: JobClaim = {
      id: newClaimId(),
      partnerId: input.partnerId,
      jobId: input.jobId,
      accountManagerId: input.accountManagerId,
      status: "pending",
      requestedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedByUserId: null,
      rejectionReason: null,
      allocationId: null,
    };
    store.claims.unshift(claim);
    return claim;
  });
}

export async function updateJobClaimStatus(
  claimId: string,
  patch: {
    status: JobClaimStatus;
    reviewedByUserId: string;
    rejectionReason?: string | null;
    allocationId?: string | null;
  },
): Promise<JobClaim> {
  return withJobClaimsStore((store) => {
    const index = store.claims.findIndex((claim) => claim.id === claimId);
    if (index < 0) {
      throw new Error("Claim not found");
    }
    const current = store.claims[index]!;
    if (current.status !== "pending") {
      throw new Error("Only pending claims can be reviewed");
    }
    const next: JobClaim = {
      ...current,
      status: patch.status,
      reviewedAt: new Date().toISOString(),
      reviewedByUserId: patch.reviewedByUserId,
      rejectionReason:
        patch.status === "rejected"
          ? (patch.rejectionReason?.trim() || null)
          : null,
      allocationId:
        patch.status === "approved"
          ? (patch.allocationId ?? current.allocationId)
          : null,
    };
    store.claims[index] = next;
    return next;
  });
}
