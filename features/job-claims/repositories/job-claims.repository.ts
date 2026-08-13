import {
  findRecord,
  getRecords,
  updateRecord,
  type AirtableFields,
} from "@/lib/airtable/client";
import { asString } from "@/lib/airtable/compat";
import { JOBS_TABLE_FIELDS } from "@/lib/airtable/fields";
import { getAirtableTableName } from "@/lib/airtable/tables";
import {
  newClaimId,
  readJobClaimsStore,
  withJobClaimsStore,
} from "@/features/job-claims/lib/claim-store";
import {
  parseClaimMarkers,
  upsertClaimMarker,
} from "@/features/job-claims/lib/claim-markers";
import type {
  JobClaim,
  JobClaimStatus,
} from "@/features/job-claims/types";

/**
 * Local/tests can force the JSON file store via JOB_CLAIMS_STORE_PATH.
 * Production (especially Vercel) uses durable Jobs.Comments markers.
 */
function useFileClaimStore(): boolean {
  return Boolean(process.env.JOB_CLAIMS_STORE_PATH?.trim());
}

async function listClaimsFromAirtable(): Promise<JobClaim[]> {
  const table = getAirtableTableName("jobsTable");
  const records = await getRecords(table, {
    filterByFormula: `FIND("${"[RP_CLAIM]"}", {${JOBS_TABLE_FIELDS.notes}})`,
    fields: [JOBS_TABLE_FIELDS.notes],
  });

  const claims: JobClaim[] = [];
  for (const record of records) {
    const notes = asString(
      (record.fields as AirtableFields)[JOBS_TABLE_FIELDS.notes],
    );
    claims.push(...parseClaimMarkers(notes, record.id));
  }
  return claims.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

async function readJobComments(jobId: string): Promise<string> {
  const table = getAirtableTableName("jobsTable");
  const record = await findRecord(table, jobId);
  return asString(record.fields[JOBS_TABLE_FIELDS.notes]) ?? "";
}

async function writeJobClaimMarker(claim: JobClaim): Promise<void> {
  const table = getAirtableTableName("jobsTable");
  const existing = await readJobComments(claim.jobId);
  const next = upsertClaimMarker(existing, claim);
  await updateRecord(table, claim.jobId, {
    [JOBS_TABLE_FIELDS.notes]: next,
  });
}

export async function listAllJobClaims(): Promise<JobClaim[]> {
  if (useFileClaimStore()) {
    const store = await readJobClaimsStore();
    return store.claims;
  }
  return listClaimsFromAirtable();
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
  if (useFileClaimStore()) {
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

  const existing = await findActiveClaimForPartnerJob(
    input.partnerId,
    input.jobId,
  );
  if (existing?.status === "pending") {
    throw new Error("You already have a pending claim for this job");
  }
  if (existing?.status === "approved") {
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
  await writeJobClaimMarker(claim);
  return claim;
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
  if (useFileClaimStore()) {
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

  const current = await findJobClaimById(claimId);
  if (!current) {
    throw new Error("Claim not found");
  }
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
  await writeJobClaimMarker(next);
  return next;
}
