import assert from "node:assert/strict";
import test from "node:test";

import { toJobClaimCreateFields } from "@/features/job-claims/repositories/job-claims.repository";
import { JOB_CLAIMS_TABLE_FIELDS } from "@/lib/airtable/fields";
import type { JobClaim } from "@/features/job-claims/types";

function sampleClaim(overrides: Partial<JobClaim> = {}): JobClaim {
  return {
    id: "claim_test_001",
    recordId: null,
    partnerId: "recPartner1",
    jobId: "recJob1",
    accountManagerId: "recAm1",
    status: "pending",
    requestedAt: "2026-08-26T10:00:00.000Z",
    reviewedAt: null,
    reviewedByUserId: null,
    rejectionReason: null,
    rejectedAt: null,
    reclaimAvailableAt: null,
    allocationId: null,
    ...overrides,
  };
}

test("toJobClaimCreateFields writes text FKs, not linked-record arrays", () => {
  const fields = toJobClaimCreateFields(sampleClaim());

  assert.equal(fields[JOB_CLAIMS_TABLE_FIELDS.job], "recJob1");
  assert.equal(fields[JOB_CLAIMS_TABLE_FIELDS.partner], "recPartner1");
  assert.equal(fields[JOB_CLAIMS_TABLE_FIELDS.accountManager], "recAm1");
  assert.equal(Array.isArray(fields[JOB_CLAIMS_TABLE_FIELDS.job]), false);
  assert.equal(Array.isArray(fields[JOB_CLAIMS_TABLE_FIELDS.partner]), false);
  assert.equal(
    Array.isArray(fields[JOB_CLAIMS_TABLE_FIELDS.accountManager]),
    false,
  );
});

test("toJobClaimCreateFields omits optional account manager when unset", () => {
  const fields = toJobClaimCreateFields(
    sampleClaim({ accountManagerId: null }),
  );

  assert.equal(fields[JOB_CLAIMS_TABLE_FIELDS.accountManager], undefined);
});
