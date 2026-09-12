import assert from "node:assert/strict";
import test from "node:test";

import { resolveSignInEligibility } from "@/lib/auth/sign-in-eligibility";
import type { User } from "@/types";

function partnerUser(
  overrides: Partial<User> = {},
): User {
  return {
    id: "recPartner1",
    clerkUserId: null,
    email: "partner@example.com",
    fullName: "Partner User",
    role: "partner",
    status: "active",
    registrationStatus: "active",
    identityVisibility: "private",
    phone: null,
    city: null,
    state: null,
    skills: null,
    experience: null,
    bankDetails: null,
    partnerId: "recPartner1",
    accountManagerId: null,
    createdAt: null,
    lastLogin: null,
    approvalDate: null,
    approvedById: null,
    rejectedReason: null,
    invitationToken: null,
    invitationExpiry: null,
    ...overrides,
  };
}

test("resolveSignInEligibility allows active approved partners", () => {
  assert.deepEqual(resolveSignInEligibility(partnerUser()), { ok: true });
  assert.deepEqual(
    resolveSignInEligibility(
      partnerUser({ registrationStatus: "approved" }),
    ),
    { ok: true },
  );
});

function ineligibleCode(
  result: ReturnType<typeof resolveSignInEligibility>,
): string {
  assert.equal(result.ok, false);
  return result.code;
}

test("resolveSignInEligibility blocks pending and missing identities", () => {
  assert.equal(ineligibleCode(resolveSignInEligibility(null)), "not_found");
  assert.equal(
    ineligibleCode(
      resolveSignInEligibility(
        partnerUser({ status: "inactive", registrationStatus: "pending" }),
      ),
    ),
    "pending",
  );
  assert.equal(
    ineligibleCode(
      resolveSignInEligibility(
        partnerUser({ registrationStatus: "invitation_pending" }),
      ),
    ),
    "pending",
  );
  assert.equal(
    ineligibleCode(
      resolveSignInEligibility(
        partnerUser({ registrationStatus: "rejected", status: "inactive" }),
      ),
    ),
    "rejected",
  );
  assert.deepEqual(
    resolveSignInEligibility(
      partnerUser({ status: "inactive", registrationStatus: "active" }),
    ),
    { ok: true },
  );
  assert.equal(
    ineligibleCode(
      resolveSignInEligibility(
        partnerUser({ status: "inactive", registrationStatus: "inactive" }),
      ),
    ),
    "inactive",
  );
});
