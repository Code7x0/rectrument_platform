import assert from "node:assert/strict";
import test from "node:test";

import {
  buildClaimMarker,
  parseClaimMarkers,
  upsertClaimMarker,
} from "@/features/job-claims/lib/claim-markers";
import type { JobClaim } from "@/features/job-claims/types";

const claim: JobClaim = {
  id: "clm_abc123def456",
  partnerId: "recPartner1",
  jobId: "recJob1",
  accountManagerId: "recAm1",
  status: "pending",
  requestedAt: "2026-08-13T10:00:00.000Z",
  reviewedAt: null,
  reviewedByUserId: null,
  rejectionReason: null,
  allocationId: null,
};

test("claim marker round-trips pending claim", () => {
  const line = buildClaimMarker(claim);
  const parsed = parseClaimMarkers(line, "recJob1");
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]?.id, claim.id);
  assert.equal(parsed[0]?.partnerId, claim.partnerId);
  assert.equal(parsed[0]?.status, "pending");
  assert.equal(parsed[0]?.accountManagerId, "recAm1");
});

test("upsertClaimMarker replaces same claim id", () => {
  const first = upsertClaimMarker("notes", claim);
  const approved = {
    ...claim,
    status: "approved" as const,
    reviewedAt: "2026-08-13T11:00:00.000Z",
    reviewedByUserId: "recUser",
    allocationId: "recAlloc",
  };
  const next = upsertClaimMarker(first, approved);
  const parsed = parseClaimMarkers(next, "recJob1");
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]?.status, "approved");
  assert.equal(parsed[0]?.allocationId, "recAlloc");
  assert.match(next, /notes/);
});
