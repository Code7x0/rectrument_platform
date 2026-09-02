import assert from "node:assert/strict";
import test from "node:test";

import {
  buildScreeningMatrixNotes,
  parseScreeningMatrixNotes,
} from "@/features/submissions/lib/build-screening-matrix-notes";

test("offer in hand fields round-trip through screening matrix notes", () => {
  const text = buildScreeningMatrixNotes({
    currentCompany: "Example Corp",
    experience: "6 years",
    skillScreens: [{ skill: "React", years: "4 years", alternate: "" }],
    offerInHand: {
      ctc: "18 LPA",
      location: "Bengaluru",
      doj: "30 days",
      company: "Example Corp",
      reason: "Prefers this role's growth path",
    },
    remarks: "Strong communicator",
  });

  const parsed = parseScreeningMatrixNotes(text);
  assert.equal(parsed.currentCompany, "Example Corp");
  assert.equal(parsed.experience, "6 years");
  assert.equal(parsed.skillScreens.length, 1);
  assert.equal(parsed.skillScreens[0]?.skill, "React");
  assert.equal(parsed.offerInHand.ctc, "18 LPA");
  assert.equal(parsed.offerInHand.location, "Bengaluru");
  assert.equal(parsed.offerInHand.doj, "30 days");
  assert.equal(parsed.offerInHand.company, "Example Corp");
  assert.equal(parsed.offerInHand.reason, "Prefers this role's growth path");
  assert.equal(parsed.remarks, "Strong communicator");
});
