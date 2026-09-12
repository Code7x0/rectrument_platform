import assert from "node:assert/strict";
import test from "node:test";

import {
  canPartnerAuthenticate,
  classifyPartnerAirtableStatus,
} from "@/lib/auth/partner-login";
import type { User } from "@/types";

function partnerUser(overrides: Partial<User> = {}): User {
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

test("classifyPartnerAirtableStatus treats common ops labels as login-eligible", () => {
  for (const label of [
    "Active",
    "Preferred",
    "Approved",
    "Verified",
    "Onboarded",
    "Live",
  ]) {
    const mapped = classifyPartnerAirtableStatus(label);
    assert.equal(mapped.status, "active");
    assert.equal(mapped.registrationStatus, "active");
  }
});

test("classifyPartnerAirtableStatus blocks probation and rejected labels", () => {
  assert.equal(classifyPartnerAirtableStatus("Probation").registrationStatus, "pending");
  assert.equal(classifyPartnerAirtableStatus("Rejected").registrationStatus, "rejected");
  assert.equal(classifyPartnerAirtableStatus("Inactive").registrationStatus, "inactive");
});

test("canPartnerAuthenticate ignores verification and allows flexible active partners", () => {
  assert.equal(canPartnerAuthenticate(partnerUser()), true);
  assert.equal(
    canPartnerAuthenticate(
      partnerUser({ status: "active", registrationStatus: "approved" }),
    ),
    true,
  );
  assert.equal(
    canPartnerAuthenticate(
      partnerUser({ status: "inactive", registrationStatus: "pending" }),
    ),
    false,
  );
});
