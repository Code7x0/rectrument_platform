import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCandidateLookupFormula,
  normalizePhone,
  phoneLookupVariants,
} from "@/features/candidates/services/candidates.mapper";

test("normalizePhone strips punctuation and country prefixes to 10 digits", () => {
  assert.equal(normalizePhone("(820) 854-7331"), "8208547331");
  assert.equal(normalizePhone("+91 82085 47331"), "8208547331");
  assert.equal(normalizePhone("0918208547331"), "8208547331");
  assert.equal(normalizePhone("8208547331"), "8208547331");
});

test("phoneLookupVariants include formatted and digit forms", () => {
  const variants = phoneLookupVariants("(820) 854-7331");
  assert.ok(variants.includes("8208547331"));
  assert.ok(variants.includes("(820) 854-7331"));
  assert.ok(variants.includes("820-854-7331"));
});

test("buildCandidateLookupFormula matches phone variants", () => {
  const formula = buildCandidateLookupFormula({ phone: "(820) 854-7331" });
  assert.match(formula, /8208547331/);
  assert.match(formula, /OR\(/);
});
