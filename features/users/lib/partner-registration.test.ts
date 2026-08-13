import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  INDIAN_MOBILE_RE,
  isValidIndianMobile,
  normalizeIndianMobileInput,
} from "@/lib/india/mobile";
import { INDIAN_STATES_AND_UTS, isIndianStateOrUT } from "@/lib/india/states";
import { isRecruitmentExperience } from "@/features/users/lib/recruitment-experience";
import {
  buildPartnerRegistrationNotes,
  mergeIdentityVisibilityIntoNotes,
  parsePartnerRegistrationNotes,
} from "@/features/partners/lib/registration-notes";
import { partnerRegistrationSchema } from "@/features/users/schemas/users.schema";
import { toOperationalPartnerView } from "@/features/partners/services/partner-privacy";
import type { Partner } from "@/features/partners/types";

describe("Indian mobile", () => {
  it("accepts valid 10-digit mobiles", () => {
    assert.equal(isValidIndianMobile("9876543210"), true);
    assert.equal(INDIAN_MOBILE_RE.test("6123456789"), true);
  });

  it("rejects invalid mobiles", () => {
    for (const value of [
      "+919876543210",
      "919876543210",
      "98765 43210",
      "98765-43210",
      "987654321",
      "98765432101",
      "abc9876543210",
      "5876543210",
    ]) {
      assert.equal(isValidIndianMobile(value), false, value);
    }
  });

  it("normalizes input to digits only", () => {
    assert.equal(normalizeIndianMobileInput("+91 98765-43210"), "9198765432");
    assert.equal(normalizeIndianMobileInput("9876543210"), "9876543210");
  });
});

describe("Indian states", () => {
  it("includes all states and UTs", () => {
    assert.ok(INDIAN_STATES_AND_UTS.length >= 36);
    assert.equal(isIndianStateOrUT("Karnataka"), true);
    assert.equal(isIndianStateOrUT("Delhi"), true);
    assert.equal(isIndianStateOrUT("Fake State"), false);
  });
});

describe("Recruitment experience", () => {
  it("accepts exactly the four categories", () => {
    assert.equal(isRecruitmentExperience("Fresher"), true);
    assert.equal(isRecruitmentExperience("1–5 years"), true);
    assert.equal(isRecruitmentExperience("5–10 years"), true);
    assert.equal(isRecruitmentExperience("10+ years"), true);
    assert.equal(isRecruitmentExperience("3 years"), false);
  });
});

describe("Registration notes", () => {
  it("round-trips state/experience/bank/privacy/terms", () => {
    const notes = buildPartnerRegistrationNotes({
      experience: "1–5 years",
      state: "Karnataka",
      skills: "Tech",
      bankDetails: "HDFC ****1234",
      identityVisibility: "private",
      termsAccepted: true,
      termsAcceptedAt: "2026-01-01T00:00:00.000Z",
    });
    const meta = parsePartnerRegistrationNotes(notes);
    assert.equal(meta.state, "Karnataka");
    assert.equal(meta.experience, "1–5 years");
    assert.equal(meta.bankDetails, "HDFC ****1234");
    assert.equal(meta.identityVisibility, "private");
    assert.equal(meta.termsAccepted, true);
  });

  it("merges identity visibility into notes", () => {
    const next = mergeIdentityVisibilityIntoNotes(
      "Identity visibility preference: private",
      "public",
    );
    assert.match(next, /Identity visibility preference: public/);
  });
});

describe("partnerRegistrationSchema", () => {
  const base = {
    firstName: "Asha",
    lastName: "Rao",
    email: "asha@example.com",
    phone: "9876543210",
    city: "Bengaluru",
    state: "Karnataka",
    skills: "Tech recruiting",
    experience: "Fresher",
    bankDetails: "",
    identityVisibility: "private" as const,
    agreementAccepted: true,
    agreementViewed: true,
  };

  it("accepts a complete valid payload", () => {
    const parsed = partnerRegistrationSchema.safeParse(base);
    assert.equal(parsed.success, true);
  });

  it("rejects missing terms acceptance or view", () => {
    assert.equal(
      partnerRegistrationSchema.safeParse({
        ...base,
        agreementAccepted: false,
      }).success,
      false,
    );
    assert.equal(
      partnerRegistrationSchema.safeParse({
        ...base,
        agreementViewed: false,
      }).success,
      false,
    );
  });

  it("rejects invalid phone and free-text state/experience", () => {
    assert.equal(
      partnerRegistrationSchema.safeParse({ ...base, phone: "+919876543210" })
        .success,
      false,
    );
    assert.equal(
      partnerRegistrationSchema.safeParse({ ...base, state: "Bangalore Urban" })
        .success,
      false,
    );
    assert.equal(
      partnerRegistrationSchema.safeParse({ ...base, experience: "2 years" })
        .success,
      false,
    );
  });
});

describe("partner privacy", () => {
  const partner = {
    id: "rec1",
    partnerCode: "AR10",
    companyName: "Asha Rao",
    contactName: "Asha Rao",
    email: "asha@example.com",
    phone: "9876543210",
    specialization: "Tech",
    revenueShare: null,
    rating: null,
    status: "active",
    verificationStatus: "verified",
    identityVisibility: "private",
    city: "Bengaluru",
    state: "Karnataka",
    skills: null,
    experience: "Fresher",
    bankDetails: null,
    notes: null,
  } as Partner;

  it("hides private name in operational view", () => {
    const view = toOperationalPartnerView(partner);
    assert.equal(view.displayName, null);
    assert.equal(view.partnerCode, "AR10");
  });

  it("exposes public name in operational view", () => {
    const view = toOperationalPartnerView({
      ...partner,
      identityVisibility: "public",
    });
    assert.equal(view.displayName, "Asha Rao");
  });
});
