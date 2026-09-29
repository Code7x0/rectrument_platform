import assert from "node:assert/strict";
import test from "node:test";

import {
  clientModeOfWorkToAirtable,
  normalizeClientModeOfWorkFromAirtable,
} from "./mode-of-work";

test("normalizeClientModeOfWorkFromAirtable maps WFO with trailing space", () => {
  assert.equal(normalizeClientModeOfWorkFromAirtable("WFO "), "WFO ");
  assert.equal(normalizeClientModeOfWorkFromAirtable("WFO"), "WFO ");
});

test("clientModeOfWorkToAirtable writes exact Airtable choice names", () => {
  assert.equal(clientModeOfWorkToAirtable("WFO"), "WFO ");
  assert.equal(clientModeOfWorkToAirtable("WFO "), "WFO ");
  assert.equal(clientModeOfWorkToAirtable(""), null);
  assert.equal(clientModeOfWorkToAirtable("not-a-choice"), null);
});
