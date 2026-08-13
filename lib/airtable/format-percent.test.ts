import assert from "node:assert/strict";
import test from "node:test";

import { formatAirtablePercent } from "./format-percent";

test("formats Airtable fraction percents", () => {
  assert.equal(formatAirtablePercent(0.02), "2%");
  assert.equal(formatAirtablePercent(0.025), "2.5%");
  assert.equal(formatAirtablePercent(0.1), "10%");
});

test("preserves already-labeled percents", () => {
  assert.equal(formatAirtablePercent("2%"), "2%");
  assert.equal(formatAirtablePercent("2.5 %"), "2.5%");
});

test("returns null for empty values", () => {
  assert.equal(formatAirtablePercent(null), null);
  assert.equal(formatAirtablePercent(""), null);
  assert.equal(formatAirtablePercent(undefined), null);
});
