import assert from "node:assert/strict";
import { test } from "node:test";

import { buildPartnerCodeBase } from "@/lib/business-ids";
import { recomputePartnerCodeOnContactNameChange } from "@/features/shared/services/business-ids.service";

test("buildPartnerCodeBase uses second letter for single-word names (Naziab → NA_464)", () => {
  assert.equal(buildPartnerCodeBase("Naziab", "9838992464"), "NA_464");
});

test("recomputePartnerCodeOnContactNameChange updates initials when contact name changes", () => {
  const next = recomputePartnerCodeOnContactNameChange({
    existingCode: "BA_464",
    contactName: "Naziab",
    phone: "9838992464",
  });
  assert.equal(next, "NA_464");
});

test("recomputePartnerCodeOnContactNameChange returns null when code already matches", () => {
  const next = recomputePartnerCodeOnContactNameChange({
    existingCode: "NA_464",
    contactName: "Naziab",
    phone: "9838992464",
  });
  assert.equal(next, null);
});
