import {
  createRecord,
  getRecords,
  updateRecord,
  type AirtableFields,
} from "@/lib/airtable/client";
import { asString } from "@/lib/airtable/compat";
import {
  AIRTABLE_JOB_CLAIM_STATUS,
  DOMAIN_JOB_CLAIM_STATUS_TO_AIRTABLE,
  JOB_CLAIMS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import { getOptionalAirtableTableName } from "@/lib/airtable/tables";
import {
  newClaimId,
  readJobClaimsStore,
  withJobClaimsStore,
} from "@/features/job-claims/lib/claim-store";
import { getJobClaimReclaimHours } from "@/features/job-claims/lib/reclaim";
import type {
  JobClaim,
  JobClaimStatus,
} from "@/features/job-claims/types";

/**
 * Local/tests can force the JSON file store via JOB_CLAIMS_STORE_PATH.
 * Production uses the dedicated Airtable "Job Claims" table.
 */
function isFileClaimStoreEnabled(): boolean {
  return Boolean(process.env.JOB_CLAIMS_STORE_PATH?.trim());
}

function getTableName(): string {
  return getOptionalAirtableTableName("jobClaimsTable") ?? "Job Claims";
}

function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

function mapStatus(value: unknown): JobClaimStatus {
  const raw = asString(value) ?? "";
  const mapped =
    AIRTABLE_JOB_CLAIM_STATUS[
      raw as keyof typeof AIRTABLE_JOB_CLAIM_STATUS
    ] ?? null;
  if (mapped === "pending" || mapped === "approved" || mapped === "rejected") {
    return mapped;
  }
  return "pending";
}

function mapClaimRecord(
  recordId: string,
  fields: AirtableFields,
): JobClaim | null {
  const id = asString(fields[JOB_CLAIMS_TABLE_FIELDS.claimId]);
  const partnerId = asString(fields[JOB_CLAIMS_TABLE_FIELDS.partner]);
  const jobId = asString(fields[JOB_CLAIMS_TABLE_FIELDS.job]);
  if (!id || !partnerId || !jobId) {
    return null;
  }
  return {
    id,
    recordId,
    partnerId,
    jobId,
    accountManagerId:
      asString(fields[JOB_CLAIMS_TABLE_FIELDS.accountManager]) || null,
    status: mapStatus(fields[JOB_CLAIMS_TABLE_FIELDS.status]),
    requestedAt:
      asString(fields[JOB_CLAIMS_TABLE_FIELDS.requestedAt]) ??
      new Date(0).toISOString(),
    reviewedAt: asString(fields[JOB_CLAIMS_TABLE_FIELDS.reviewedAt]),
    reviewedByUserId: asString(fields[JOB_CLAIMS_TABLE_FIELDS.reviewedBy]),
    rejectionReason: asString(fields[JOB_CLAIMS_TABLE_FIELDS.rejectionReason]),
    rejectedAt: asString(fields[JOB_CLAIMS_TABLE_FIELDS.rejectedAt]),
    reclaimAvailableAt: asString(
      fields[JOB_CLAIMS_TABLE_FIELDS.reclaimAvailableAt],
    ),
    allocationId: asString(fields[JOB_CLAIMS_TABLE_FIELDS.allocationId]),
  };
}

function toCreateFields(claim: JobClaim): AirtableFields {
  const fields: AirtableFields = {
    [JOB_CLAIMS_TABLE_FIELDS.claimId]: claim.id,
    [JOB_CLAIMS_TABLE_FIELDS.job]: claim.jobId,
    [JOB_CLAIMS_TABLE_FIELDS.partner]: claim.partnerId,
    [JOB_CLAIMS_TABLE_FIELDS.status]:
      DOMAIN_JOB_CLAIM_STATUS_TO_AIRTABLE[claim.status],
    [JOB_CLAIMS_TABLE_FIELDS.requestedAt]: claim.requestedAt,
  };
  if (claim.accountManagerId) {
    fields[JOB_CLAIMS_TABLE_FIELDS.accountManager] = claim.accountManagerId;
  }
  if (claim.reviewedAt) {
    fields[JOB_CLAIMS_TABLE_FIELDS.reviewedAt] = claim.reviewedAt;
  }
  if (claim.reviewedByUserId) {
    fields[JOB_CLAIMS_TABLE_FIELDS.reviewedBy] = claim.reviewedByUserId;
  }
  if (claim.rejectionReason) {
    fields[JOB_CLAIMS_TABLE_FIELDS.rejectionReason] = claim.rejectionReason;
  }
  if (claim.rejectedAt) {
    fields[JOB_CLAIMS_TABLE_FIELDS.rejectedAt] = claim.rejectedAt;
  }
  if (claim.reclaimAvailableAt) {
    fields[JOB_CLAIMS_TABLE_FIELDS.reclaimAvailableAt] =
      claim.reclaimAvailableAt;
  }
  if (claim.allocationId) {
    fields[JOB_CLAIMS_TABLE_FIELDS.allocationId] = claim.allocationId;
  }
  return fields;
}

function toUpdateFields(claim: JobClaim): AirtableFields {
  const fields: AirtableFields = {
    [JOB_CLAIMS_TABLE_FIELDS.status]:
      DOMAIN_JOB_CLAIM_STATUS_TO_AIRTABLE[claim.status],
  };
  if (claim.reviewedAt) {
    fields[JOB_CLAIMS_TABLE_FIELDS.reviewedAt] = claim.reviewedAt;
  }
  if (claim.reviewedByUserId) {
    fields[JOB_CLAIMS_TABLE_FIELDS.reviewedBy] = claim.reviewedByUserId;
  }
  if (claim.rejectionReason) {
    fields[JOB_CLAIMS_TABLE_FIELDS.rejectionReason] = claim.rejectionReason;
  }
  if (claim.rejectedAt) {
    fields[JOB_CLAIMS_TABLE_FIELDS.rejectedAt] = claim.rejectedAt;
  }
  if (claim.reclaimAvailableAt) {
    fields[JOB_CLAIMS_TABLE_FIELDS.reclaimAvailableAt] =
      claim.reclaimAvailableAt;
  }
  if (claim.allocationId) {
    fields[JOB_CLAIMS_TABLE_FIELDS.allocationId] = claim.allocationId;
  }
  return fields;
}

function ensureClaimShape(claim: JobClaim): JobClaim {
  return {
    ...claim,
    rejectedAt: claim.rejectedAt ?? null,
    reclaimAvailableAt: claim.reclaimAvailableAt ?? null,
    recordId: claim.recordId ?? null,
  };
}

export async function listAllJobClaims(): Promise<JobClaim[]> {
  if (isFileClaimStoreEnabled()) {
    const store = await readJobClaimsStore();
    return store.claims.map(ensureClaimShape);
  }

  const records = await getRecords(getTableName(), {
    sort: [
      { field: JOB_CLAIMS_TABLE_FIELDS.requestedAt, direction: "desc" },
    ],
  });

  const claims: JobClaim[] = [];
  for (const record of records) {
    const mapped = mapClaimRecord(
      record.id,
      record.fields as AirtableFields,
    );
    if (mapped) {
      claims.push(mapped);
    }
  }
  return claims;
}

export async function listJobClaimsForPartner(
  partnerId: string,
): Promise<JobClaim[]> {
  if (isFileClaimStoreEnabled()) {
    const claims = await listAllJobClaims();
    return claims.filter((claim) => claim.partnerId === partnerId);
  }

  const records = await getRecords(getTableName(), {
    filterByFormula: `{${JOB_CLAIMS_TABLE_FIELDS.partner}} = '${escapeFormulaValue(partnerId)}'`,
    sort: [
      { field: JOB_CLAIMS_TABLE_FIELDS.requestedAt, direction: "desc" },
    ],
  });
  const claims: JobClaim[] = [];
  for (const record of records) {
    const mapped = mapClaimRecord(
      record.id,
      record.fields as AirtableFields,
    );
    if (mapped) {
      claims.push(mapped);
    }
  }
  return claims;
}

export async function listPendingJobClaims(): Promise<JobClaim[]> {
  const claims = await listAllJobClaims();
  return claims.filter((claim) => claim.status === "pending");
}

export async function findJobClaimById(
  claimId: string,
): Promise<JobClaim | null> {
  if (isFileClaimStoreEnabled()) {
    const claims = await listAllJobClaims();
    return claims.find((claim) => claim.id === claimId) ?? null;
  }

  const records = await getRecords(getTableName(), {
    filterByFormula: `{${JOB_CLAIMS_TABLE_FIELDS.claimId}} = '${escapeFormulaValue(claimId)}'`,
    maxRecords: 1,
  });
  const record = records[0];
  if (!record) {
    return null;
  }
  return mapClaimRecord(record.id, record.fields as AirtableFields);
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

/** Latest rejected claim for partner+job (for reclaim wait enforcement). */
export async function findLatestRejectedClaimForPartnerJob(
  partnerId: string,
  jobId: string,
): Promise<JobClaim | null> {
  const claims = await listJobClaimsForPartner(partnerId);
  return (
    claims
      .filter(
        (claim) => claim.jobId === jobId && claim.status === "rejected",
      )
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0] ?? null
  );
}

export async function insertJobClaim(input: {
  partnerId: string;
  jobId: string;
  accountManagerId: string | null;
}): Promise<JobClaim> {
  if (isFileClaimStoreEnabled()) {
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
        rejectedAt: null,
        reclaimAvailableAt: null,
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
    rejectedAt: null,
    reclaimAvailableAt: null,
    allocationId: null,
  };

  const created = await createRecord(getTableName(), toCreateFields(claim));
  return {
    ...claim,
    recordId: created.id,
  };
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
  if (isFileClaimStoreEnabled()) {
    return withJobClaimsStore((store) => {
      const index = store.claims.findIndex((claim) => claim.id === claimId);
      if (index < 0) {
        throw new Error("Claim not found");
      }
      const current = ensureClaimShape(store.claims[index]!);
      if (current.status !== "pending") {
        throw new Error("Only pending claims can be reviewed");
      }
      const now = new Date();
      const next: JobClaim = {
        ...current,
        status: patch.status,
        reviewedAt: now.toISOString(),
        reviewedByUserId: patch.reviewedByUserId,
        rejectionReason:
          patch.status === "rejected"
            ? (patch.rejectionReason?.trim() || null)
            : null,
        rejectedAt: patch.status === "rejected" ? now.toISOString() : null,
        reclaimAvailableAt:
          patch.status === "rejected"
            ? new Date(
                now.getTime() + getJobClaimReclaimHours() * 60 * 60 * 1000,
              ).toISOString()
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
  if (!current.recordId) {
    throw new Error("Claim record id missing");
  }

  const now = new Date();
  const next: JobClaim = {
    ...current,
    status: patch.status,
    reviewedAt: now.toISOString(),
    reviewedByUserId: patch.reviewedByUserId,
    rejectionReason:
      patch.status === "rejected"
        ? (patch.rejectionReason?.trim() || null)
        : null,
    rejectedAt: patch.status === "rejected" ? now.toISOString() : null,
    reclaimAvailableAt:
      patch.status === "rejected"
        ? new Date(
            now.getTime() + getJobClaimReclaimHours() * 60 * 60 * 1000,
          ).toISOString()
        : null,
    allocationId:
      patch.status === "approved"
        ? (patch.allocationId ?? current.allocationId)
        : null,
  };

  await updateRecord(getTableName(), current.recordId, toUpdateFields(next));
  return next;
}
