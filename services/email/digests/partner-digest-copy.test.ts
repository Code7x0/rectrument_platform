import assert from "node:assert/strict";
import test from "node:test";

import type { Partner } from "@/features/partners/types";

import {
  buildActivePartnerIdSet,
  isPartnerEligibleForDigest,
  PARTNER_DIGEST_NEW_ROLES_COLUMN,
  PARTNER_DIGEST_SNAPSHOT_COLUMNS,
} from "./partner-digest-copy";

function partner(
  partial: Pick<Partner, "id" | "status"> & Partial<Partner>,
): Partner {
  return {
    partnerCode: null,
    companyName: "Co",
    contactName: null,
    email: null,
    phone: null,
    specialization: null,
    revenueShare: null,
    rating: null,
    verificationStatus: "verified",
    identityVisibility: "public",
    city: null,
    state: null,
    skills: null,
    experience: null,
    bankDetails: null,
    notes: null,
    profileSubmittedAt: null,
    ...partial,
  };
}

test("partner digest copy matches client spec", () => {
  assert.equal(
    PARTNER_DIGEST_NEW_ROLES_COLUMN,
    "New Roles Activated – Available to be claimed",
  );
  assert.doesNotMatch(PARTNER_DIGEST_NEW_ROLES_COLUMN, /last 24 hours/i);
  assert.deepEqual(PARTNER_DIGEST_SNAPSHOT_COLUMNS, [
    "Jobs Assigned",
    "Super High Priority Jobs",
    "Candidates Pending Review",
    "Candidates Internal Screening in Progress",
    "Candidates Being Submitted to Client",
    "Candidates being Interviewed",
  ]);
});

test("buildActivePartnerIdSet only includes active partners", () => {
  const ids = buildActivePartnerIdSet([
    partner({ id: "rec_active", status: "active" }),
    partner({ id: "rec_inactive", status: "inactive" }),
  ]);

  assert.equal(ids.size, 1);
  assert.ok(ids.has("rec_active"));
  assert.ok(!ids.has("rec_inactive"));
  assert.equal(
    isPartnerEligibleForDigest("rec_active", ids),
    true,
  );
  assert.equal(
    isPartnerEligibleForDigest("rec_inactive", ids),
    false,
  );
});
